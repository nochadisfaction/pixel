#!/usr/bin/env python
"""
Script to create smaller random samples from the combined datasets,
suitable for feature extraction without memory issues.
"""

import os

import pandas as pd

# Define directories
INPUT_DIR = "ai/datasets/combined"
OUTPUT_DIR = "ai/datasets/samples"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Configuration
SAMPLE_SIZE = 50000  # Number of records to sample from each dataset
RANDOM_SEED = 42  # For reproducibility


def create_sample(input_file, category):
    """Create a manageable sample from a large dataset file"""
    print(f"Processing {category} dataset...")

    try:
        return _extracted_from_create_sample_6(input_file, category)
    except Exception as e:
        print(f"Error processing {input_file}: {e}")
        return None


# TODO Rename this here and in `create_sample`
def _extracted_from_create_sample_6(input_file, category):
    df = read_dataset(input_file)
    if df is None:
        return None

    # Sample the dataframe
    if len(df) <= SAMPLE_SIZE:
        print(f"Dataset has only {len(df)} rows, using all data")
        sample_df = df
    else:
        print(f"Taking random sample of {SAMPLE_SIZE} rows from {len(df)} total")
        sample_df = df.sample(SAMPLE_SIZE, random_state=RANDOM_SEED)

    # Save the sample
    output_path = os.path.join(OUTPUT_DIR, f"{category}_sample.csv")
    sample_df.to_csv(output_path, index=False)
    print(f"Saved sample of {len(sample_df)} rows to {output_path}")

    return sample_df


def read_dataset(input_file):
    """Read a dataset from either parquet or csv format, handling large files with chunking"""
    if input_file.endswith(".parquet"):
        try:
            return pd.read_parquet(input_file)
        except Exception as e:
            print(f"Error reading parquet file: {e}")
            csv_file = input_file.replace(".parquet", ".csv")
            if os.path.exists(csv_file):
                print(f"Using CSV file instead: {csv_file}")
                return read_csv_in_chunks(csv_file)
            else:
                print(f"No CSV alternative found for {input_file}")
                return None
    elif input_file.endswith(".csv"):
        return read_csv_in_chunks(input_file)
    else:
        print(f"Unsupported file format: {input_file}")
        return None


def read_csv_in_chunks(csv_file):
    """Read a large CSV file in chunks and return a sampled dataframe"""
    try:
        chunks = pd.read_csv(csv_file, chunksize=100000)
        sample_rows = []
        total_rows = 0

        for i, chunk in enumerate(chunks):
            chunk_size = len(chunk)
            total_rows += chunk_size
            chunk_sample_size = min(
                int(SAMPLE_SIZE * chunk_size / 1000000) + 1,  # Estimate 1M total rows
                chunk_size,  # Don't sample more than available
                SAMPLE_SIZE // 10,  # Don't let any chunk dominate
            )
            # Sample from chunk
            if len(chunk) > chunk_sample_size:
                chunk_sample = chunk.sample(chunk_sample_size, random_state=RANDOM_SEED + i)
            else:
                chunk_sample = chunk
            sample_rows.append(chunk_sample)
            print(f"Processed chunk {i+1}, sampled {len(chunk_sample)} rows")

        if sample_rows:
            df = pd.concat(sample_rows, ignore_index=True)
            print(f"Total rows processed: {total_rows}")
            return df
        else:
            print(f"No data found in {csv_file}")
            return None
    except Exception as e:
        print(f"Error processing CSV file {csv_file}: {e}")
        return None


def main():
    """Create samples from all datasets in the combined directory"""
    # Check for combined datasets - both parquet and CSV formats
    parquet_files = [f for f in os.listdir(INPUT_DIR) if f.endswith("_combined.parquet")]
    csv_files = [
        f
        for f in os.listdir(INPUT_DIR)
        if f.endswith("_combined.csv") and f.replace(".csv", ".parquet") not in parquet_files
    ]

    # Prefer parquet files when available
    combined_files = parquet_files + csv_files

    if not combined_files:
        print(f"No combined datasets found in {INPUT_DIR}")
        return

    print(f"Found {len(combined_files)} dataset files to process")

    category_counts = {}

    for file in combined_files:
        # Extract category name from filename
        category = file.split("_")[0]
        input_path = os.path.join(INPUT_DIR, file)

        # Create sample
        sample_df = create_sample(input_path, category)

        if sample_df is not None:
            category_counts[category] = len(sample_df)

    # Print summary
    print("\nSampling complete! Summary:")
    for category, count in category_counts.items():
        print(f"  {category}: {count} rows")

    print(f"\nAll samples saved to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
