import concurrent.futures
import os
import re

import pandas as pd
from tqdm import tqdm

# Define the path to the collection CSV
COLLECTION_PATH = "ai/datasets/collection.csv"
OUTPUT_DIR = "ai/datasets/combined"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clean_text(text):
    """Basic text cleaning function"""
    if pd.isna(text):
        return ""

    # Convert to string if not already
    text = str(text)

    # Remove URLs
    text = re.sub(r"http\S+", "", text)

    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?\'"-]', " ", text)

    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()

    return text


def categorize_file(filename):
    """Categorize file based on its name"""
    filename = filename.lower()

    categories = {
        "anxiety": ["anxi", "anx"],
        "depression": ["dep"],
        "loneliness": ["lone", "lon"],
        "mental_health": ["mh", "mentalhealth"],
        "suicidal": ["sw", "suicide"],
    }

    return next(
        (
            category
            for category, keywords in categories.items()
            if any(keyword in filename for keyword in keywords)
        ),
        "other",
    )


def extract_date_info(filepath):
    """Extract year and month information from filepath"""
    year_match = re.search(r"20(19|20|21|22)", filepath)
    year = year_match[0] if year_match else None

    months = {
        "jan": "01",
        "feb": "02",
        "mar": "03",
        "apr": "04",
        "may": "05",
        "jun": "06",
        "jul": "07",
        "aug": "08",
        "sep": "09",
        "oct": "10",
        "nov": "11",
        "dec": "12",
    }

    month = next(
        (month_num for month_name, month_num in months.items() if month_name in filepath.lower()),
        None,
    )
    return year, month


def process_file(filepath):
    """Process a single data file with basic cleaning and filtering"""
    try:
        # Skip non-CSV files
        if not filepath.lower().endswith(".csv"):
            return None, None

        # Extract metadata
        category = categorize_file(os.path.basename(filepath))
        year, month = extract_date_info(filepath)

        # Read the CSV file - use current pandas parameter names
        df = pd.read_csv(filepath, on_bad_lines="skip", low_memory=False)

        # Check if the dataframe is empty
        if df.empty:
            return None, None

        # Basic cleaning - handle common column names for text content
        text_cols = [
            col
            for col in df.columns
            if any(
                x in col.lower() for x in ["text", "title", "body", "content", "post", "selftext"]
            )
        ]

        # If no text columns found, skip
        if not text_cols:
            return None, None

        # Apply text cleaning to each text column
        for col in text_cols:
            df[col] = df[col].apply(clean_text)

        # Add metadata columns
        df["source_file"] = os.path.basename(filepath)
        df["category"] = category

        if year and month:
            df["year"] = year
            df["month"] = month

        # Filter out entirely empty posts
        for col in text_cols:
            df = df[df[col].str.len() > 0]

        if id_cols := [col for col in df.columns if "id" in col.lower()]:
            df = df.drop_duplicates(subset=id_cols[0])

        # Handle problematic columns for parquet format
        # Convert all object columns that might contain mixed types to strings
        for col in df.select_dtypes(include=["object"]).columns:
            df[col] = df[col].astype(str)

        return category, df

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return None, None


def main():
    # Create a dictionary to store dataframes by category
    category_dfs = {}

    # Read the collection CSV
    with open(COLLECTION_PATH, "r") as f:
        file_paths = [line.strip() for line in f if line.strip()]

    # Remove paths that don't exist
    valid_paths = [path for path in file_paths if os.path.exists(path)]

    print(f"Found {len(valid_paths)} valid files out of {len(file_paths)} total")

    # Process files in parallel
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = list(tqdm(executor.map(process_file, valid_paths), total=len(valid_paths)))

    # Collect results
    for category, df in results:
        if category and df is not None:
            if category not in category_dfs:
                category_dfs[category] = []
            category_dfs[category].append(df)

    # Merge dataframes by category and save
    for category, dfs in category_dfs.items():
        if dfs:
            try:
                # Combine all dataframes in this category
                combined_df = pd.concat(dfs, ignore_index=True)

                # Ensure all columns are compatible with parquet
                # Convert problematic columns to strings
                for col in combined_df.select_dtypes(include=["object"]).columns:
                    combined_df[col] = combined_df[col].astype(str)

                # First try to save as CSV (more compatible)
                output_csv_path = os.path.join(OUTPUT_DIR, f"{category}_combined.csv")
                combined_df.to_csv(output_csv_path, index=False)
                print(f"Saved {category} dataset with {len(combined_df)} records to CSV")

                try:
                    # Try to save to parquet format for efficiency
                    output_path = os.path.join(OUTPUT_DIR, f"{category}_combined.parquet")
                    combined_df.to_parquet(output_path, index=False)
                    print(f"Saved {category} dataset to parquet format")
                except Exception as e:
                    print(
                        f"Could not save {category} to parquet format: {e}. CSV format is available."
                    )

                # Also save a sample CSV for easy viewing
                sample_path = os.path.join(OUTPUT_DIR, f"{category}_sample.csv")
                combined_df.sample(min(1000, len(combined_df))).to_csv(sample_path, index=False)
            except Exception as e:
                print(f"Error processing category {category}: {e}")

    # Create a unified dataset with all categories
    try:
        all_dfs = []
        for category, dfs_list in category_dfs.items():
            if dfs_list:
                # Combine dataframes for this category
                category_df = pd.concat(dfs_list, ignore_index=True)
                # Add category label again to ensure it's present
                category_df["data_category"] = category
                all_dfs.append(category_df)

        if all_dfs:
            unified_df = pd.concat(all_dfs, ignore_index=True)

            # Ensure all columns are compatible with CSV
            for col in unified_df.select_dtypes(include=["object"]).columns:
                unified_df[col] = unified_df[col].astype(str)

            # Save as CSV (more compatible)
            unified_csv_path = os.path.join(OUTPUT_DIR, "all_reddit_mental_health.csv")
            unified_df.to_csv(unified_csv_path, index=False)
            print(f"Saved unified dataset with {len(unified_df)} records to CSV")

            try:
                # Try to save to parquet as well
                unified_path = os.path.join(OUTPUT_DIR, "all_reddit_mental_health.parquet")
                unified_df.to_parquet(unified_path, index=False)
                print("Saved unified dataset to parquet format")
            except Exception as e:
                print(
                    f"Could not save unified dataset to parquet format: {e}. CSV format is available."
                )

            # Save a sample of the unified dataset
            sample_path = os.path.join(OUTPUT_DIR, "all_reddit_mental_health_sample.csv")
            unified_df.sample(min(1000, len(unified_df))).to_csv(sample_path, index=False)
    except Exception as e:
        print(f"Error creating unified dataset: {e}")


if __name__ == "__main__":
    main()
