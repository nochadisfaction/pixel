"""
Empathetic Dialogues dataset implementation for Hugging Face Datasets.
Refactored for clarity, type safety, robust error handling, and clean code best practices.
"""

import csv
import logging
from typing import Any, Dict, Iterator, Tuple

from datasets import (  # type: ignore
    DatasetInfo,
    Features,
    GeneratorBasedBuilder,
    SplitGenerator,
    Value,
    Version,
)

_CITATION = """
@inproceedings{rashkin2019towards,
  title = {Towards Empathetic Open-domain Conversation Models: a New Benchmark and Dataset},
  author = {Hannah Rashkin and Eric Michael Smith and Margaret Li and Y-Lan Boureau},
  booktitle = {ACL},
  year = {2019},
}
"""

_DESCRIPTION = """
The Empathetic Dialogues dataset contains conversations grounded in emotional situations.
Each conversation includes a situation description, emotion label, and multi-turn dialogue
between a speaker and listener, designed for training empathetic dialogue systems.
"""

_URL = "https://dl.fbaipublicfiles.com/parlai/empatheticdialogues/empatheticdialogues.tar.gz"


class EmpatheticDialogues(GeneratorBasedBuilder):
    """
    Empathetic Dialogues dataset for training empathetic conversation models.
    Clean code, type safety, robust error handling, and logging.
    """

    VERSION = Version("1.0.0")

    def info(self) -> DatasetInfo:
        """Return dataset information."""
        return DatasetInfo(
            description=_DESCRIPTION,
            features=Features(
                {
                    "conv_id": Value("string"),
                    "utterance_idx": Value("int32"),
                    "context": Value("string"),
                    "prompt": Value("string"),
                    "speaker_idx": Value("int32"),
                    "utterance": Value("string"),
                    "selfeval": Value("string"),
                    "tags": Value("string"),
                }
            ),
            supervised_keys=None,
            homepage="https://github.com/facebookresearch/EmpatheticDialogues",
            citation=_CITATION,
        )

    def _split_generators(self, dl_manager: Any) -> list[SplitGenerator]:
        """Return SplitGenerators for train, validation, and test splits."""
        archive_path = dl_manager.download_and_extract(_URL)
        data_dir = archive_path / "empatheticdialogues"
        return [
            SplitGenerator(
                name="train",
                gen_kwargs={"filepath": str(data_dir / "train.csv")},
            ),
            SplitGenerator(
                name="validation",
                gen_kwargs={"filepath": str(data_dir / "valid.csv")},
            ),
            SplitGenerator(
                name="test",
                gen_kwargs={"filepath": str(data_dir / "test.csv")},
            ),
        ]

    def _generate_examples(self, **kwargs: dict[str, Any]) -> Iterator[Tuple[int, Dict[str, Any]]]:
        """
        Yield dataset examples from a CSV file with robust error handling and logging.
        Args:
            kwargs: Should contain 'filepath' key with path to the CSV file.
        Yields:
            Tuple[int, Dict[str, Any]]: (index, example dict)
        """
        filepath = kwargs.get("filepath")
        if not isinstance(filepath, str) or not filepath:
            logging.error("No valid 'filepath' provided to _generate_examples.")
            return
        try:
            with open(filepath, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    try:
                        yield idx, {
                            "conv_id": row.get("conv_id", ""),
                            "utterance_idx": int(row.get("utterance_idx", 0)),
                            "context": row.get("context", ""),
                            "prompt": row.get("prompt", ""),
                            "speaker_idx": int(row.get("speaker_idx", 0)),
                            "utterance": row.get("utterance", ""),
                            "selfeval": row.get("selfeval", ""),
                            "tags": row.get("tags", ""),
                        }
                    except Exception as row_err:
                        logging.warning(f"Skipping row {idx} due to error: {row_err}")
        except Exception as file_err:
            logging.error(f"Failed to open or process file {filepath}: {file_err}")
