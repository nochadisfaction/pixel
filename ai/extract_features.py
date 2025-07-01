import argparse
import os
import re
import time

import joblib
import nltk
import pandas as pd
from nltk.corpus import stopwords
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

# Download NLTK resources if not already available
try:
    nltk.download("punkt")
    nltk.download("stopwords")
except Exception as e:
    print(f"Warning: NLTK download issue - {e}")

# Initialise once at import time
try:
    STOP_WORDS = set(stopwords.words("english"))
except Exception as e:
    print(f"Warning: stopwords unavailable – {e}")
    STOP_WORDS = set()

# Define paths
INPUT_DIR = "ai/datasets/combined"
OUTPUT_DIR = "ai/datasets/features"
MODELS_DIR = "ai/datasets/models"

# Create directories if they don't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Configuration - default values
DEFAULT_MAX_FEATURES = 10000  # Maximum number of features for TF-IDF
DEFAULT_N_COMPONENTS = 256  # Dimensionality of SVD reduction
DEFAULT_RANDOM_STATE = 42  # For reproducibility


# Parse command line arguments
def parse_args():
    parser = argparse.ArgumentParser(description="Extract TF-IDF features from text datasets.")
    parser.add_argument(
        "--max-features",
        type=int,
        default=DEFAULT_MAX_FEATURES,
        help=f"Maximum number of features for TF-IDF (default: {DEFAULT_MAX_FEATURES})",
    )
    parser.add_argument(
        "--n-components",
        type=int,
        default=DEFAULT_N_COMPONENTS,
        help=f"Dimensionality of SVD reduction (default: {DEFAULT_N_COMPONENTS})",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=DEFAULT_RANDOM_STATE,
        help=f"Random state for reproducibility (default: {DEFAULT_RANDOM_STATE})",
    )
    return parser.parse_args()


def preprocess_text(text):
    """Perform text preprocessing with simplified tokenization"""
    if pd.isna(text) or not isinstance(text, str):
        return ""

    # Convert to lowercase
    text = text.lower()

    # Remove URLs
    text = re.sub(r"http\S+", "", text)

    # Remove special characters and numbers
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\d+", "", text)

    # Simple split tokenization instead of NLTK tokenize
    tokens = text.split()

    # Remove stopwords (if available)
    if STOP_WORDS:
        tokens = [w for w in tokens if w not in STOP_WORDS and len(w) > 2]
    else:
        # Fallback: keep words >2 chars
        tokens = [w for w in tokens if len(w) > 2]

    # Rejoin tokens
    return " ".join(tokens)


def batch_process(texts, batch_size=10000):
    """Process texts in batches to avoid memory issues"""
    results = []
    total = len(texts)
    start_time = time.time()

    for i in range(0, total, batch_size):
        end = min(i + batch_size, total)
        batch = texts[i:end]
        results.extend([preprocess_text(text) for text in batch])
        elapsed = time.time() - start_time
        batch_num = i // batch_size + 1
        total_batches = (total - 1) // batch_size + 1
        print(
            f"Processed batch {batch_num}/{total_batches} ({elapsed:.2f}s elapsed, {batch_num/total_batches*100:.1f}% complete)"
        )

    return results


def _extracted_from_extract_features_76(vectorizer, df, category, n_components, random_state):
    """Process smaller datasets all at once"""
    # For smaller datasets, process all at once
    print("Transforming data with TF-IDF...")
    X_tfidf = vectorizer.transform(df["processed_text"])

    # Save the vectorizer
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, f"{category}_tfidf_vectorizer.pkl"))

    # Apply SVD for dimensionality reduction
    print(f"Reducing dimensionality to {n_components} components...")
    svd = TruncatedSVD(n_components=n_components, random_state=random_state)
    X_svd = svd.fit_transform(X_tfidf)

    # Save the SVD model
    joblib.dump(svd, os.path.join(MODELS_DIR, f"{category}_svd_model.pkl"))

    # Create a DataFrame with the reduced features
    feature_cols = [f"feature_{i}" for i in range(n_components)]
    result = pd.DataFrame(X_svd, columns=feature_cols)

    # Add metadata columns if they exist
    id_cols = [col for col in df.columns if "id" in col.lower()]
    meta_cols = id_cols + ["year", "month", "category", "source_file"]
    if meta_cols := [col for col in meta_cols if col in df.columns]:
        result = pd.concat([df[meta_cols].reset_index(drop=True), result], axis=1)

    # Save features DataFrame
    output_path = os.path.join(OUTPUT_DIR, f"{category}_features_tfidf_{n_components}.csv")
    result.to_csv(output_path, index=False)
    print(f"Saved features to {output_path}")

    return result


def _extracted_from_extract_features_73(df, vectorizer, category, n_components, random_state):
    """Process large datasets in chunks to avoid memory issues"""
    chunk_size = 100000  # Process 100k rows at a time
    svd = None
    feature_cols = [f"feature_{i}" for i in range(n_components)]

    # Ensure meta_cols is always defined, even if df is empty
    meta_cols = []

    for i in range(0, len(df), chunk_size):
        end = min(i + chunk_size, len(df))
        print(f"Processing chunk {i//chunk_size + 1}/{(len(df)-1)//chunk_size + 1}")
        chunk = df.iloc[i:end]
        X_chunk = vectorizer.transform(chunk["processed_text"])

        if svd is None:
            # Initialize SVD with first chunk
            print("Initializing SVD model...")
            svd = TruncatedSVD(n_components=n_components, random_state=random_state)
            svd.fit(X_chunk)
            joblib.dump(svd, os.path.join(MODELS_DIR, f"{category}_svd_model.pkl"))

        # Transform chunk with SVD
        X_svd_chunk = svd.transform(X_chunk)

        # Create dataframe for this chunk
        features_chunk_df = pd.DataFrame(X_svd_chunk, columns=feature_cols)

        # Add metadata columns
        candidate_cols = ["year", "month", "category", "source_file"]
        meta_cols = [c for c in candidate_cols if c in chunk.columns]
        if meta_cols:
            features_chunk_df = pd.concat(
                [chunk[meta_cols].reset_index(drop=True), features_chunk_df], axis=1
            )

        # Save this chunk
        output_chunk_path = os.path.join(
            OUTPUT_DIR, f"{category}_features_chunk_{i//chunk_size}.csv"
        )
        features_chunk_df.to_csv(output_chunk_path, index=False)
        print(f"Saved chunk {i//chunk_size + 1} to {output_chunk_path}")

    # Save the vectorizer
    joblib.dump(vectorizer, os.path.join(MODELS_DIR, f"{category}_tfidf_vectorizer.pkl"))
    print(f"Dataset too large to return in memory. Features saved in chunks to {OUTPUT_DIR}")

    # Create a small sample to return
    sample_idx = min(1000, len(df))
    sample_df = df.sample(sample_idx, random_state=random_state)
    X_sample = vectorizer.transform(sample_df["processed_text"])

    # SVD should already be initialized at this point
    if svd is None:
        raise RuntimeError("SVD model not initialized - this should never happen")

    X_svd_sample = svd.transform(X_sample)

    # Create dataframe for sample
    result = pd.DataFrame(X_svd_sample, columns=feature_cols)
    if meta_cols:
        result = pd.concat([sample_df[meta_cols].reset_index(drop=True), result], axis=1)

    return result


def extract_features(input_file, category, max_features, n_components, random_state):
    """Extract TF-IDF features and reduce dimensionality with SVD"""
    print(f"Processing {category} dataset...")

    # Load the dataset
    try:
        if input_file.endswith(".parquet"):
            try:
                df = pd.read_parquet(input_file)
            except Exception as e:
                print(f"Error reading parquet file: {e}")
                # Try CSV version instead
                csv_file = input_file.replace(".parquet", ".csv")
                if os.path.exists(csv_file):
                    print(f"Trying CSV file instead: {csv_file}")
                    try:
                        df = pd.read_csv(csv_file)
                    except Exception as csv_e:
                        print(f"Error reading CSV file: {csv_e}")
                        return None
                else:
                    print(f"No CSV alternative found for {input_file}")
                    return None
        else:
            try:
                df = pd.read_csv(input_file)
            except Exception as e:
                print(f"Error reading CSV file: {e}")
                return None
    except Exception as e:
        print(f"Failed to load dataset {input_file}: {e}")
        return None

    # Find text columns
    text_cols = [
        col
        for col in df.columns
        if any(x in col.lower() for x in ["text", "title", "body", "content", "post", "selftext"])
    ]

    if not text_cols:
        print(f"No text columns found in {input_file}")
        return None

    # Choose the primary text column (prefer 'selftext', 'body', or the first one found)
    primary_text_col = next(
        (col for col in text_cols if col.lower() in ["selftext", "body"]), text_cols[0]
    )
    print(f"Using '{primary_text_col}' as the primary text column")

    # Clean and preprocess text
    print("Preprocessing text...")

    # Use batch processing for large datasets
    print(f"Processing {len(df)} documents in batches...")
    processed_texts = batch_process(df[primary_text_col].values)
    df["processed_text"] = processed_texts

    # Drop rows with empty processed text
    df = df[df["processed_text"].str.len() > 0]
    print(f"After preprocessing: {len(df)} documents")

    # For very large datasets, consider taking a sample for model building
    sample_size = min(500000, len(df))
    if len(df) > sample_size:
        print(f"Using {sample_size} random samples for TF-IDF model building")
        sample_df = df.sample(sample_size, random_state=random_state)
        tfidf_texts = sample_df["processed_text"]
    else:
        tfidf_texts = df["processed_text"]

    # Create TF-IDF vectorizer
    print("Calculating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        min_df=5,  # Minimum document frequency
        max_df=0.85,  # Maximum document frequency
        ngram_range=(1, 2),  # Include unigrams and bigrams
    )

    # Fit vectorizer on sample, transform all data
    vectorizer.fit(tfidf_texts)

    return (
        _extracted_from_extract_features_73(df, vectorizer, category, n_components, random_state)
        if len(df) > 1000000
        else _extracted_from_extract_features_76(
            vectorizer, df, category, n_components, random_state
        )
    )


def main():
    """Process all combined datasets to extract features"""
    # Parse command line arguments
    args = parse_args()
    max_features = args.max_features
    n_components = args.n_components
    random_state = args.random_state

    start_time = time.time()
    print(f"Starting feature extraction at {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(
        f"Using max_features={max_features}, n_components={n_components}, random_state={random_state}"
    )

    # Get all combined dataset files - check both parquet and CSV formats
    parquet_files = [f for f in os.listdir(INPUT_DIR) if f.endswith("_combined.parquet")]
    csv_files = [
        f
        for f in os.listdir(INPUT_DIR)
        if f.endswith("_combined.csv") and f.replace(".csv", ".parquet") not in parquet_files
    ]

    combined_files = parquet_files + csv_files

    if not combined_files:
        print(f"No combined datasets found in {INPUT_DIR}")
        return

    print(f"Found {len(combined_files)} dataset files to process")

    all_features_dfs = []

    for file in combined_files:
        # Extract category name from filename
        category = file.split("_")[0]
        input_path = os.path.join(INPUT_DIR, file)

        # Extract features
        features_df = extract_features(
            input_path, category, max_features, n_components, random_state
        )

        if features_df is not None:
            all_features_dfs.append(features_df)

    # Combine all features into a unified dataset
    if all_features_dfs:
        print("Creating unified features dataset...")
        unified_features = pd.concat(all_features_dfs, ignore_index=True)
        unified_path = os.path.join(
            OUTPUT_DIR, f"all_mental_health_features_tfidf_{n_components}.csv"
        )
        unified_features.to_csv(unified_path, index=False)
        print(f"Saved unified features to {unified_path}")

    print("Feature extraction complete!")
    elapsed = time.time() - start_time
    print(f"Total processing time: {elapsed:.2f} seconds ({elapsed/60:.2f} minutes)")


if __name__ == "__main__":
    main()
