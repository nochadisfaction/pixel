#!/usr/bin/env python
"""
Script to extract features from the sampled datasets
Uses TF-IDF vectorization and SVD dimensionality reduction
"""

import os
import re

import joblib
import nltk
import pandas as pd
from nltk.corpus import stopwords
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

# Download NLTK resources if not already available
try:
    nltk.download("stopwords")
except Exception as e:
    print(f"Warning: NLTK download issue - {e}")

# Define paths
INPUT_DIR = "ai/datasets/samples"
OUTPUT_DIR = "ai/datasets/features"
MODELS_DIR = "ai/datasets/models"

# Create directories if they don't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Configuration
MAX_FEATURES = 10000  # Maximum number of features for TF-IDF
N_COMPONENTS = 256  # Dimensionality of SVD reduction
RANDOM_STATE = 42  # For reproducibility


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

    # Simple split tokenization
    tokens = text.split()

    # Remove stopwords (if available)
    try:
        stop_words = set(stopwords.words("english"))
        tokens = [word for word in tokens if word not in stop_words and len(word) > 2]
    except Exception as e:
        print(f"Warning: Stopword removal skipped - {e}")
        # Fallback: remove very short words
        tokens = [word for word in tokens if len(word) > 2]

    # Rejoin tokens
    return " ".join(tokens)


def extract_features(input_file, category):
    """Extract TF-IDF features and reduce dimensionality with SVD"""
    print(f"Processing {category} dataset...")

    # Load the dataset
    try:
        df = pd.read_csv(input_file)
    except Exception as e:
        print(f"Failed to load dataset {input_file}: {e}")
        return None

    # Find text columns
    text_cols = [
        col
        for col in df.columns
        if any(
            x in col.lower()
            for x in ["text", "title", "body", "content", "post", "selftext"]
        )
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
    df["processed_text"] = df[primary_text_col].apply(preprocess_text)

    # Drop rows with empty processed text
    df = df[df["processed_text"].str.len() > 0]
    print(f"After preprocessing: {len(df)} documents")

    # Create TF-IDF vectorizer
    print("Calculating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        max_features=MAX_FEATURES,
        min_df=3,  # Minimum document frequency
        max_df=0.85,  # Maximum document frequency
        ngram_range=(1, 2),  # Include unigrams and bigrams
    )

    # Fit and transform the text data
    X_tfidf = vectorizer.fit_transform(df["processed_text"])

    # Save the vectorizer
    joblib.dump(
        vectorizer, os.path.join(MODELS_DIR, f"{category}_tfidf_vectorizer.pkl")
    )

    # Apply SVD for dimensionality reduction
    print(f"Reducing dimensionality to {N_COMPONENTS} components...")
    svd = TruncatedSVD(n_components=N_COMPONENTS, random_state=RANDOM_STATE)
    X_svd = svd.fit_transform(X_tfidf)

    # Save the SVD model
    joblib.dump(svd, os.path.join(MODELS_DIR, f"{category}_svd_model.pkl"))

    # Create a DataFrame with the reduced features
    feature_cols = [f"feature_{i}" for i in range(N_COMPONENTS)]
    features_df = pd.DataFrame(X_svd, columns=feature_cols)

    # Add metadata columns if they exist
    id_cols = [col for col in df.columns if "id" in col.lower()]
    meta_cols = id_cols + ["year", "month", "category", "source_file", "data_category"]
    if meta_cols := [col for col in meta_cols if col in df.columns]:
        features_df = pd.concat(
            [df[meta_cols].reset_index(drop=True), features_df], axis=1
        )

    # Save features DataFrame
    output_path = os.path.join(
        OUTPUT_DIR, f"{category}_features_tfidf_{N_COMPONENTS}.csv"
    )
    features_df.to_csv(output_path, index=False)
    print(f"Saved features to {output_path}")

    return features_df


def main():
    """Process all sampled datasets to extract features"""
    # Get all sample files
    sample_files = [f for f in os.listdir(INPUT_DIR) if f.endswith("_sample.csv")]

    if not sample_files:
        print(f"No sample datasets found in {INPUT_DIR}")
        return

    print(f"Found {len(sample_files)} sample datasets to process")

    all_features_dfs = []

    for file in sample_files:
        # Extract category name from filename
        category = file.split("_")[0]
        input_path = os.path.join(INPUT_DIR, file)

        # Extract features
        features_df = extract_features(input_path, category)

        if features_df is not None:
            all_features_dfs.append(features_df)

    # Combine all features into a unified dataset
    if all_features_dfs:
        print("Creating unified features dataset...")
        unified_features = pd.concat(all_features_dfs, ignore_index=True)
        unified_path = os.path.join(
            OUTPUT_DIR, f"all_mental_health_features_tfidf_{N_COMPONENTS}.csv"
        )
        unified_features.to_csv(unified_path, index=False)
        print(f"Saved unified features to {unified_path}")

    print("Feature extraction complete!")


if __name__ == "__main__":
    main()
