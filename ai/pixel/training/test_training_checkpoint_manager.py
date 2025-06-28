"""
Unit tests for Training Checkpoint Manager

Tests checkpoint creation, validation, loading, cleanup, and all checkpoint management functionality.
"""

import json
import shutil
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest
import torch
import torch.nn as nn
import torch.optim as optim
from training_checkpoint_manager import (
    CheckpointConfig,
    CheckpointManager,
    CheckpointMetadata,
    CheckpointValidator,
    TrainingState,
    create_training_state_from_model,
    restore_training_state_to_model,
)


class SimpleModel(nn.Module):
    """Simple test model"""

    def __init__(self):
        super().__init__()
        self.linear = nn.Linear(10, 1)

    def forward(self, x):
        return self.linear(x)


class TestCheckpointConfig:
    """Test CheckpointConfig class"""

    def test_default_config(self):
        """Test default configuration values"""
        config = CheckpointConfig()

        assert config.save_every_steps == 1000
        assert config.save_every_epochs == 1
        assert config.save_every_minutes == 30
        assert config.keep_last_n_checkpoints == 5
        assert config.keep_best_n_checkpoints == 3
        assert config.checkpoint_dir == "checkpoints"
        assert config.atomic_saves is True
        assert config.validate_on_save is True
        assert config.best_metric_name == "validation_loss"
        assert config.best_metric_mode == "min"

    def test_custom_config(self):
        """Test custom configuration values"""
        config = CheckpointConfig(
            save_every_steps=500,
            checkpoint_dir="custom_checkpoints",
            best_metric_mode="max",
            atomic_saves=False,
        )

        assert config.save_every_steps == 500
        assert config.checkpoint_dir == "custom_checkpoints"
        assert config.best_metric_mode == "max"
        assert config.atomic_saves is False


class TestCheckpointMetadata:
    """Test CheckpointMetadata class"""

    def test_metadata_creation(self):
        """Test metadata creation with required fields"""
        metadata = CheckpointMetadata(
            checkpoint_id="test_checkpoint_001",
            timestamp=datetime.now(),
            step=1000,
            epoch=5,
            loss=0.5,
        )

        assert metadata.checkpoint_id == "test_checkpoint_001"
        assert metadata.step == 1000
        assert metadata.epoch == 5
        assert metadata.loss == 0.5
        assert metadata.validation_loss is None
        assert metadata.is_best is False
        assert metadata.is_corrupted is False
        assert isinstance(metadata.custom_metrics, dict)

    def test_metadata_with_multi_objective_metrics(self):
        """Test metadata with multi-objective training metrics"""
        metadata = CheckpointMetadata(
            checkpoint_id="test_checkpoint_002",
            timestamp=datetime.now(),
            step=2000,
            epoch=10,
            loss=0.3,
            language_loss=0.25,
            eq_loss=0.05,
            persona_loss=0.03,
            clinical_loss=0.02,
            empathy_loss=0.04,
            eq_score=0.85,
            clinical_accuracy=0.92,
        )

        assert metadata.language_loss == 0.25
        assert metadata.eq_loss == 0.05
        assert metadata.persona_loss == 0.03
        assert metadata.clinical_loss == 0.02
        assert metadata.empathy_loss == 0.04
        assert metadata.eq_score == 0.85
        assert metadata.clinical_accuracy == 0.92


class TestTrainingState:
    """Test TrainingState class"""

    def test_training_state_creation(self):
        """Test basic training state creation"""
        model_state = {
            "linear.weight": torch.randn(1, 10),
            "linear.bias": torch.randn(1),
        }
        optimizer_state = {"state": {}, "param_groups": []}

        training_state = TrainingState(
            step=100,
            epoch=3,
            model_state_dict=model_state,
            optimizer_state_dict=optimizer_state,
        )

        assert training_state.step == 100
        assert training_state.epoch == 3
        assert training_state.model_state_dict == model_state
        assert training_state.optimizer_state_dict == optimizer_state
        assert isinstance(training_state.loss_history, list)
        assert isinstance(training_state.validation_history, list)
        assert isinstance(training_state.custom_state, dict)

    def test_training_state_with_optional_fields(self):
        """Test training state with optional fields"""
        training_state = TrainingState(
            step=200,
            epoch=5,
            model_state_dict={},
            optimizer_state_dict={},
            loss_weights={"language": 0.5, "eq": 0.3, "clinical": 0.2},
            gradient_norms={"total": 1.2, "clinical": 0.8},
            custom_state={"phase": "validation", "iteration": 42},
        )

        assert training_state.loss_weights == {
            "language": 0.5,
            "eq": 0.3,
            "clinical": 0.2,
        }
        assert training_state.gradient_norms == {"total": 1.2, "clinical": 0.8}
        assert training_state.custom_state == {"phase": "validation", "iteration": 42}


class TestCheckpointValidator:
    """Test CheckpointValidator class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.validator = CheckpointValidator()
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)

    def teardown_method(self):
        """Clean up test fixtures"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_validate_nonexistent_checkpoint(self):
        """Test validation of nonexistent checkpoint"""
        checkpoint_path = self.temp_path / "nonexistent.pt"
        results = self.validator.validate_checkpoint(checkpoint_path)

        assert results["is_valid"] is False
        assert "does not exist" in results["errors"][0]

    def test_validate_empty_checkpoint(self):
        """Test validation of empty checkpoint file"""
        checkpoint_path = self.temp_path / "empty.pt"
        checkpoint_path.touch()  # Create empty file

        results = self.validator.validate_checkpoint(checkpoint_path)

        assert results["is_valid"] is False
        assert "empty" in results["errors"][0]
        assert results["file_size_mb"] == 0.0

    def test_validate_valid_checkpoint(self):
        """Test validation of valid checkpoint"""
        checkpoint_path = self.temp_path / "valid.pt"

        # Create valid checkpoint data
        checkpoint_data = {
            "training_state": {
                "step": 1000,
                "epoch": 5,
                "model_state_dict": {"layer.weight": torch.randn(2, 2)},
                "optimizer_state_dict": {"state": {}},
            },
            "metadata": {
                "checkpoint_id": "test_001",
                "timestamp": datetime.now().isoformat(),
                "step": 1000,
                "epoch": 5,
            },
        }

        torch.save(checkpoint_data, checkpoint_path)

        results = self.validator.validate_checkpoint(checkpoint_path)

        assert results["is_valid"] is True
        assert results["contains_model"] is True
        assert results["contains_optimizer"] is True
        assert results["contains_metadata"] is True
        assert results["file_size_mb"] > 0

    def test_validate_checkpoint_missing_components(self):
        """Test validation of checkpoint missing required components"""
        checkpoint_path = self.temp_path / "incomplete.pt"

        # Create checkpoint missing model state
        checkpoint_data = {
            "training_state": {
                "step": 1000,
                "epoch": 5,
                "optimizer_state_dict": {"state": {}},
            }
        }

        torch.save(checkpoint_data, checkpoint_path)

        results = self.validator.validate_checkpoint(checkpoint_path)

        assert results["is_valid"] is False
        assert results["contains_model"] is False
        assert "Missing model state dict" in results["errors"]


class TestCheckpointManager:
    """Test CheckpointManager class"""

    def setup_method(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = CheckpointConfig(
            checkpoint_dir=self.temp_dir,
            save_every_steps=100,
            keep_last_n_checkpoints=3,
            async_saves=False,  # Use sync saves for testing
        )
        self.manager = CheckpointManager(self.config)

        # Create test model and optimizer
        self.model = SimpleModel()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.001)

    def teardown_method(self):
        """Clean up test fixtures"""
        self.manager.cleanup()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_manager_initialization(self):
        """Test checkpoint manager initialization"""
        assert self.manager.config == self.config
        assert self.manager.checkpoint_dir.exists()
        assert isinstance(self.manager.checkpoint_history, list)

    def test_should_save_checkpoint_step_interval(self):
        """Test checkpoint saving based on step interval"""
        # Disable epoch-based saving for this test
        self.manager.config.save_every_epochs = 0

        # Should save at step 100 (multiple of save_every_steps)
        assert self.manager.should_save_checkpoint(step=100, epoch=1) is True
        assert self.manager.should_save_checkpoint(step=200, epoch=1) is True

        # Should not save at other steps
        assert self.manager.should_save_checkpoint(step=50, epoch=1) is False
        assert self.manager.should_save_checkpoint(step=150, epoch=1) is False

    def test_should_save_checkpoint_epoch_interval(self):
        """Test checkpoint saving based on epoch interval"""
        # Should save when epoch changes (save_every_epochs=1 by default)
        # First call for epoch 1
        assert self.manager.should_save_checkpoint(step=50, epoch=1) is True
        # Second call for epoch 1 should not save (already processed this epoch)
        assert self.manager.should_save_checkpoint(step=60, epoch=1) is False
        # Call for epoch 2 should save
        assert self.manager.should_save_checkpoint(step=75, epoch=2) is True

    def test_save_and_load_checkpoint(self):
        """Test basic checkpoint save and load"""
        # Create training state
        training_state = create_training_state_from_model(
            self.model, self.optimizer, step=100, epoch=2
        )

        # Save checkpoint
        checkpoint_id = self.manager.save_checkpoint(
            training_state, metrics={"loss": 0.5, "validation_loss": 0.3}, is_best=True
        )

        assert checkpoint_id is not None
        assert len(self.manager.checkpoint_history) == 1

        # Load checkpoint
        loaded_state = self.manager.load_checkpoint(checkpoint_id)

        assert loaded_state is not None
        assert loaded_state.step == 100
        assert loaded_state.epoch == 2
        assert loaded_state.model_state_dict is not None
        assert loaded_state.optimizer_state_dict is not None


if __name__ == "__main__":
    pytest.main([__file__])
