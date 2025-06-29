import unittest
from unittest.mock import MagicMock, patch
from empathetic_dialogues import EmpatheticDialogues

class TestEmpatheticDialogues(unittest.TestCase):
    def setUp(self):
        self.builder = EmpatheticDialogues()

    def test_info_fields(self):
        info = self.builder._info()
        features = info.features
        self.assertIn("conv_id", features)
        self.assertIn("utterance", features)
        self.assertIn("utterance_idx", features)
        self.assertIn("context", features)
        self.assertIn("prompt", features)
        self.assertIn("speaker_idx", features)
        self.assertIn("selfeval", features)
        self.assertIn("tags", features)
        self.assertEqual(info.description, self.builder._info().description)
        self.assertEqual(info.citation, self.builder._info().citation)

    @patch("empathetic_dialogues.datasets")
    def test_split_generators_structure(self, mock_datasets):
        mock_dl_manager = MagicMock()
        mock_dl_manager.download.return_value = "archive_path"
        mock_dl_manager.iter_archive.return_value = [("empatheticdialogues/train.csv", None)]
        mock_datasets.Split.TRAIN = "train"
        mock_datasets.Split.VALIDATION = "validation"
        mock_datasets.Split.TEST = "test"
        mock_datasets.SplitGenerator = lambda name, gen_kwargs: {"name": name, "gen_kwargs": gen_kwargs}

        splits = self.builder._split_generators(mock_dl_manager)
        self.assertEqual(len(splits), 3)
        self.assertEqual(splits[0]["name"], "train")
        self.assertEqual(splits[1]["name"], "validation")
        self.assertEqual(splits[2]["name"], "test")
        self.assertEqual(splits[0]["gen_kwargs"]["split_file"], "empatheticdialogues/train.csv")
        self.assertEqual(splits[1]["gen_kwargs"]["split_file"], "empatheticdialogues/valid.csv")
        self.assertEqual(splits[2]["gen_kwargs"]["split_file"], "empatheticdialogues/test.csv")

    def test_generate_examples_yields(self):
        csv_content = (
            "conv_id,utterance_idx,context,prompt,speaker_idx,utterance,selfeval,tags\n"
            "c1,0,hello,why,1,hi,,tag1\n"
            "c2,1,bye,when,2,bye now,good,tag2\n"
        )
        csv_bytes = [line.encode("utf-8") for line in csv_content.splitlines()]
        class FakeFile:
            def __init__(self, lines):
                self._lines = lines
                self._idx = 0
            def __iter__(self):
                return self
            def __next__(self):
                if self._idx >= len(self._lines):
                    raise StopIteration
                line = self._lines[self._idx]
                self._idx += 1
                return line
        files = [("empatheticdialogues/train.csv", FakeFile(csv_bytes))]
        split_file = "empatheticdialogues/train.csv"
        examples = list(self.builder._generate_examples(files, split_file))
        self.assertEqual(len(examples), 2)
        ex0 = examples[0][1]
        self.assertEqual(ex0["conv_id"], "c1")
        self.assertEqual(ex0["utterance"], "hi")
        self.assertEqual(ex0["utterance_idx"], 0)
        self.assertEqual(ex0["context"], "hello")
        self.assertEqual(ex0["prompt"], "why")
        self.assertEqual(ex0["speaker_idx"], 1)
        self.assertEqual(ex0["selfeval"], "")
        self.assertEqual(ex0["tags"], "tag1")
        ex1 = examples[1][1]
        self.assertEqual(ex1["conv_id"], "c2")
        self.assertEqual(ex1["utterance"], "bye now")
        self.assertEqual(ex1["utterance_idx"], 1)
        self.assertEqual(ex1["context"], "bye")
        self.assertEqual(ex1["prompt"], "when")
        self.assertEqual(ex1["speaker_idx"], 2)
        self.assertEqual(ex1["selfeval"], "good")
        self.assertEqual(ex1["tags"], "tag2")

    def test_generate_examples_empty_file(self):
        csv_content = "conv_id,utterance_idx,context,prompt,speaker_idx,utterance,selfeval,tags\n"
        csv_bytes = [line.encode("utf-8") for line in csv_content.splitlines()]
        class FakeFile:
            def __init__(self, lines):
                self._lines = lines
                self._idx = 0
            def __iter__(self):
                return self
            def __next__(self):
                if self._idx >= len(self._lines):
                    raise StopIteration
                line = self._lines[self._idx]
                self._idx += 1
                return line
        files = [("empatheticdialogues/train.csv", FakeFile(csv_bytes))]
        split_file = "empatheticdialogues/train.csv"
        examples = list(self.builder._generate_examples(files, split_file))
        self.assertEqual(len(examples), 0)

    def test_generate_examples_wrong_split_file(self):
        csv_content = (
            "conv_id,utterance_idx,context,prompt,speaker_idx,utterance,selfeval,tags\n"
            "c1,0,hello,why,1,hi,,tag1\n"
        )
        csv_bytes = [line.encode("utf-8") for line in csv_content.splitlines()]
        class FakeFile:
            def __init__(self, lines):
                self._lines = lines
                self._idx = 0
            def __iter__(self):
                return self
            def __next__(self):
                if self._idx >= len(self._lines):
                    raise StopIteration
                line = self._lines[self._idx]
                self._idx += 1
                return line
        files = [("empatheticdialogues/train.csv", FakeFile(csv_bytes))]
        split_file = "empatheticdialogues/valid.csv"
        examples = list(self.builder._generate_examples(files, split_file))
        self.assertEqual(len(examples), 0)

    def test_generate_examples_missing_optional_fields(self):
        csv_content = (
            "conv_id,utterance_idx,context,prompt,speaker_idx,utterance,selfeval,tags\n"
            "c3,2,foo,bar,3,hello,,\n"
        )
        csv_bytes = [line.encode("utf-8") for line in csv_content.splitlines()]
        class FakeFile:
            def __init__(self, lines):
                self._lines = lines
                self._idx = 0
            def __iter__(self):
                return self
            def __next__(self):
                if self._idx >= len(self._lines):
                    raise StopIteration
                line = self._lines[self._idx]
                self._idx += 1
                return line
        files = [("empatheticdialogues/train.csv", FakeFile(csv_bytes))]
        split_file = "empatheticdialogues/train.csv"
        examples = list(self.builder._generate_examples(files, split_file))
        self.assertEqual(len(examples), 1)
        ex = examples[0][1]
        self.assertEqual(ex["selfeval"], "")
        self.assertEqual(ex["tags"], "")

if __name__ == "__main__":
    unittest.main()