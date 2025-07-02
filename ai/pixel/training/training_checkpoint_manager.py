"""
Training Checkpoint and Resume Functionality

This module provides comprehensive checkpoint management for training pipelines,
including atomic saves, validation, resumption, and lifecycle management.
"""

import hashlib
import json
import logging
import os
import shutil
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

import torch
import torch.distributed as dist


@dataclass
class CheckpointConfig:
    """Configuration for checkpoint behavior"""

    # Save intervals
    save_every_steps: int = 1000
    save_every_epochs: int = 1
    save_every_minutes: int = 30

    # Retention policies
    keep_last_n_checkpoints: int = 5
    keep_best_n_checkpoints: int = 3
    keep_every_n_epochs: int = 10

    # Storage settings
    checkpoint_dir: str = "checkpoints"
    compress_checkpoints: bool = True
    atomic_saves: bool = True
    validate_on_save: bool = True

    # Best model tracking
    best_metric_name: str = "validation_loss"
    best_metric_mode: str = "min"  # "min" or "max"

    # Metadata
    save_training_config: bool = True
    save_model_code_hash: bool = True
    save_git_commit: bool = True

    # Performance
    async_saves: bool = True
    max_concurrent_saves: int = 2
    save_timeout: int = 600  # seconds


@dataclass
class CheckpointMetadata:
    """Metadata for a training checkpoint"""

    checkpoint_id: str
    timestamp: datetime
    step: int
    epoch: int

    # Training metrics
    loss: float
    validation_loss: Optional[float] = None
    learning_rate: float = 0.0

    # Multi-objective metrics
    language_loss: Optional[float] = None
    eq_loss: Optional[float] = None
    persona_loss: Optional[float] = None
    clinical_loss: Optional[float] = None
    empathy_loss: Optional[float] = None

    # Performance metrics
    training_time_hours: float = 0.0
    samples_processed: int = 0
    tokens_processed: int = 0

    # Validation metrics
    eq_score: Optional[float] = None
    clinical_accuracy: Optional[float] = None
    persona_accuracy: Optional[float] = None
    empathy_score: Optional[float] = None

    # System info
    model_hash: Optional[str] = None
    config_hash: Optional[str] = None
    git_commit: Optional[str] = None
    gpu_memory_used: Optional[float] = None

    # File info
    file_size_mb: float = 0.0
    is_best: bool = False
    is_corrupted: bool = False

    # Custom metadata
    custom_metrics: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TrainingState:
    """Complete training state for checkpointing"""

    # Core training state
    step: int
    epoch: int
    model_state_dict: Dict[str, torch.Tensor]
    optimizer_state_dict: Dict[str, Any]
    scheduler_state_dict: Optional[Dict[str, Any]] = None

    # Loss tracking
    loss_history: List[float] = field(default_factory=list)
    validation_history: List[float] = field(default_factory=list)

    # Multi-objective loss states
    loss_weights: Optional[Dict[str, float]] = None
    gradient_norms: Optional[Dict[str, float]] = None

    # Random states for reproducibility
    torch_rng_state: Optional[torch.Tensor] = None
    numpy_rng_state: Optional[Dict[str, Any]] = None
    python_rng_state: Optional[Any] = None
    cuda_rng_state: Optional[torch.Tensor] = None

    # Training configuration
    training_config: Optional[Dict[str, Any]] = None
    model_config: Optional[Dict[str, Any]] = None

    # Performance tracking
    training_start_time: Optional[datetime] = None
    last_checkpoint_time: Optional[datetime] = None

    # Custom state
    custom_state: Dict[str, Any] = field(default_factory=dict)


class CheckpointValidator:
    """Validates checkpoint integrity and completeness"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def _invalidate_with_error(self, results: Dict[str, Any], error_msg: str) -> Dict[str, Any]:
        results["is_valid"] = False
        results["errors"].append(error_msg)
        return results

    def validate_checkpoint(self, checkpoint_path: Path) -> Dict[str, Any]:
        """
        Validate a checkpoint file for integrity and completeness

        Returns:
            Dict with validation results and any errors found
        """
        results = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "file_size_mb": 0.0,
            "contains_model": False,
            "contains_optimizer": False,
            "contains_metadata": False,
            "hash_valid": False,
        }

        try:
            if not checkpoint_path.exists():
                return self._invalidate_with_error(results, "Checkpoint file does not exist")

            # Check file size
            file_size = checkpoint_path.stat().st_size
            results["file_size_mb"] = file_size / (1024 * 1024)

            if file_size == 0:
                return self._invalidate_with_error(results, "Checkpoint file is empty")

            # Load and validate checkpoint
            try:
                # Only use weights_only=False if torch >= 2.1
                torch_version = tuple(map(int, torch.__version__.split(".")[:2]))
                if torch_version >= (2, 1):
                    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
                else:
                    checkpoint = torch.load(checkpoint_path, map_location="cpu")
            except Exception as e:
                return self._invalidate_with_error(results, f"Failed to load checkpoint: {str(e)}")

            # Check required components
            if "training_state" in checkpoint:
                training_state = checkpoint["training_state"]

                if "model_state_dict" in training_state:
                    results["contains_model"] = True
                else:
                    results["errors"].append("Missing model state dict")

                if "optimizer_state_dict" in training_state:
                    results["contains_optimizer"] = True
                else:
                    results["warnings"].append("Missing optimizer state dict")

                # Validate model state dict
                if results["contains_model"]:
                    model_state = training_state["model_state_dict"]
                    if not isinstance(model_state, dict) or len(model_state) == 0:
                        results["errors"].append("Model state dict is invalid or empty")
            else:
                results["errors"].append("Missing training state")

            # Check metadata
            if "metadata" in checkpoint:
                results["contains_metadata"] = True
                metadata = checkpoint["metadata"]

                # Validate required metadata fields
                required_fields = ["checkpoint_id", "timestamp", "step", "epoch"]
                for field in required_fields:
                    if field not in metadata:
                        results["warnings"].append(f"Missing metadata field: {field}")
            else:
                results["warnings"].append("Missing metadata")

            # Validate file hash if present
            if "file_hash" in checkpoint:
                stored_hash = checkpoint["file_hash"]
                # Calculate current hash (excluding the hash field itself)
                temp_checkpoint = {k: v for k, v in checkpoint.items() if k != "file_hash"}
                current_hash = self._calculate_checkpoint_hash(temp_checkpoint)

                if stored_hash == current_hash:
                    results["hash_valid"] = True
                else:
                    results["errors"].append("Checkpoint hash mismatch - file may be corrupted")

            # Final validation
            if results["errors"]:
                results["is_valid"] = False

        except Exception as e:
            self._invalidate_with_error(results, f"Validation failed with error: {str(e)}")
            self.logger.error(f"Checkpoint validation error: {str(e)}")

        return results

    def _calculate_checkpoint_hash(self, checkpoint_data: Dict[str, Any]) -> str:
        """Calculate hash of checkpoint data"""
        try:
            # Convert to string representation for hashing
            checkpoint_str = json.dumps(checkpoint_data, sort_keys=True, default=str)
            return hashlib.sha256(checkpoint_str.encode()).hexdigest()
        except Exception as e:
            self.logger.warning(f"Failed to calculate checkpoint hash: {str(e)}")
            return ""


class CheckpointManager:
    """Main checkpoint management system"""

    def __init__(self, config: CheckpointConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.validator = CheckpointValidator()

        # Create checkpoint directory
        self.checkpoint_dir = Path(self.config.checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Threading for async saves
        self.save_lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=self.config.max_concurrent_saves)

        # Tracking
        self.best_metrics: Dict[str, float] = {}
        self.checkpoint_history: List[CheckpointMetadata] = []
        self.last_save_time = time.time()

        # Load existing checkpoint history
        self._load_checkpoint_history()

        self.logger.info(f"CheckpointManager initialized with directory: {self.checkpoint_dir}")

    def should_save_checkpoint(self, step: int, epoch: int) -> bool:
        """Determine if a checkpoint should be saved"""
        current_time = time.time()

        # Ensure step is greater than 0 before saving (prevents saving at step 0)
        if not step > 0:
            return False

        # Check step interval
        if self.config.save_every_steps > 0 and step % self.config.save_every_steps == 0:
            return True

        # Check epoch interval (only save at the end of epochs, not at step-based intervals within epochs)
        # We check if this is truly an epoch boundary by seeing if epoch changed
        if self.config.save_every_epochs > 0:
            # Initialize _last_epoch if not set
            if not hasattr(self, "_last_epoch"):
                self._last_epoch = 0

            # Check if epoch changed and if it's a multiple of save_every_epochs
            if epoch != self._last_epoch:
                result = epoch % self.config.save_every_epochs == 0
                self._last_epoch = epoch
                if result:
                    return True

        # Check time interval
        if self.config.save_every_minutes > 0:
            minutes_since_last = (current_time - self.last_save_time) / 60
            if minutes_since_last >= self.config.save_every_minutes:
                return True

        return False

    def save_checkpoint(
        self,
        training_state: TrainingState,
        metrics: Optional[Dict[str, float]] = None,
        is_best: bool = False,
        custom_metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Save a training checkpoint

        Returns:
            Checkpoint ID for the saved checkpoint
        """
        checkpoint_id = self._generate_checkpoint_id(training_state.step, training_state.epoch)

        # Create metadata
        metadata = self._create_metadata(
            checkpoint_id=checkpoint_id,
            training_state=training_state,
            metrics=metrics or {},
            is_best=is_best,
            custom_metadata=custom_metadata or {},
        )

        if self.config.async_saves:
            future = self.executor.submit(
                self._save_checkpoint_sync, checkpoint_id, training_state, metadata
            )
            # Don't wait for async save to complete
        else:
            self._save_checkpoint_sync(checkpoint_id, training_state, metadata)

        self.last_save_time = time.time()
        self.logger.info(f"Checkpoint save initiated: {checkpoint_id}")

        return checkpoint_id

    def _save_checkpoint_sync(
        self,
        checkpoint_id: str,
        training_state: TrainingState,
        metadata: CheckpointMetadata,
    ) -> None:
        """Synchronous checkpoint save with atomic operations"""
        try:
            with self.save_lock:
                checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.pt"
                temp_path = self.checkpoint_dir / f"{checkpoint_id}.pt.tmp"

                # Prepare checkpoint data
                checkpoint_data = {
                    "training_state": asdict(training_state),
                    "metadata": asdict(metadata),
                    "save_timestamp": datetime.now().isoformat(),
                    "config": asdict(self.config),
                }

                # Add file hash for integrity checking
                checkpoint_data["file_hash"] = self.validator._calculate_checkpoint_hash(
                    {k: v for k, v in checkpoint_data.items() if k != "file_hash"}
                )

                # Atomic save: write to temp file first
                if self.config.atomic_saves:
                    torch.save(checkpoint_data, temp_path)

                    # Validate temp file if enabled
                    if self.config.validate_on_save:
                        validation_results = self.validator.validate_checkpoint(temp_path)
                        if not validation_results["is_valid"]:
                            temp_path.unlink(missing_ok=True)
                            raise RuntimeError(
                                f"Checkpoint validation failed: {validation_results['errors']}"
                            )

                    # Atomic move
                    shutil.move(str(temp_path), str(checkpoint_path))
                else:
                    torch.save(checkpoint_data, checkpoint_path)

                # Update metadata with file size
                metadata.file_size_mb = checkpoint_path.stat().st_size / (1024 * 1024)

                # Add to history
                self.checkpoint_history.append(metadata)

                # Update best metrics if this is a best checkpoint
                if metadata.is_best and metadata.validation_loss is not None:
                    self.best_metrics[self.config.best_metric_name] = metadata.validation_loss

                # Clean up old checkpoints
                self._cleanup_old_checkpoints()

                # Save checkpoint history
                self._save_checkpoint_history()

                self.logger.info(
                    f"Checkpoint saved successfully: {checkpoint_id} ({metadata.file_size_mb:.1f} MB)"
                )

        except Exception as e:
            self.logger.error(f"Failed to save checkpoint {checkpoint_id}: {str(e)}")
            # Clean up temp file if it exists
            temp_path = self.checkpoint_dir / f"{checkpoint_id}.pt.tmp"
            temp_path.unlink(missing_ok=True)
            raise

    def load_checkpoint(self, checkpoint_id: Optional[str] = None) -> Optional[TrainingState]:
        """
        Load a checkpoint by ID or latest if no ID provided

        Returns:
            TrainingState if successful, None if failed
        """
        if checkpoint_id is None:
            checkpoint_id = self.get_latest_checkpoint_id()
        if checkpoint_id is None:
            self.logger.info("No checkpoints found to load")
            return None

        try:
            return self._load_checkpoint_data(checkpoint_id)
        except Exception as e:
            self.logger.error(f"Failed to load checkpoint {checkpoint_id}: {str(e)}")
            return None

    def _load_checkpoint_data(self, checkpoint_id: str) -> Optional[TrainingState]:
        """Load and validate checkpoint data"""
        checkpoint_path = self._get_checkpoint_path_for_loading(checkpoint_id)

        if not checkpoint_path.exists():
            self.logger.error(f"Checkpoint file not found: {checkpoint_path}")
            return None

        if not self._validate_and_log_checkpoint(checkpoint_path):
            return None

        checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
        training_state_dict = checkpoint["training_state"]
        training_state = TrainingState(**training_state_dict)

        self.logger.info(f"Checkpoint loaded successfully: {checkpoint_id}")
        self.logger.info(
            f"Resuming from step {training_state.step}, epoch {training_state.epoch}"
        )

        return training_state

    def _validate_and_log_checkpoint(self, checkpoint_path: Path) -> bool:
        """Validate checkpoint and log errors if invalid"""
        validation_results = self.validator.validate_checkpoint(checkpoint_path)
        if not validation_results["is_valid"]:
            self.logger.error(f"Checkpoint validation failed: {validation_results['errors']}")
            return False
        return True

    def _get_checkpoint_path_for_loading(self, checkpoint_id: str) -> Path:
        """Get the full path to a checkpoint file given its ID (extracted for clarity)"""
        return self._get_checkpoint_path(checkpoint_id)

    def _get_checkpoint_path(self, checkpoint_id: str) -> Path:
        """Get the full path to a checkpoint file given its ID"""
        return self.checkpoint_dir / f"{checkpoint_id}.pt"

    def get_latest_checkpoint_id(self) -> Optional[str]:
        """Get the ID of the most recent checkpoint"""
        if not self.checkpoint_history:
            # Try to discover checkpoints from filesystem
            checkpoint_files = list(self.checkpoint_dir.glob("*.pt"))
            if not checkpoint_files:
                return None

            # Get most recent by modification time
            latest_file = max(checkpoint_files, key=lambda p: p.stat().st_mtime)
            return latest_file.stem

        # Get latest from history
        latest_checkpoint = max(self.checkpoint_history, key=lambda c: c.timestamp)
        return latest_checkpoint.checkpoint_id

    def get_best_checkpoint_id(self, metric_name: Optional[str] = None) -> Optional[str]:
        """Get the ID of the best checkpoint based on specified metric"""
        metric_name = metric_name or self.config.best_metric_name
        mode = self.config.best_metric_mode

        best_checkpoints = [c for c in self.checkpoint_history if c.is_best]
        if not best_checkpoints:
            return None

        if mode == "min":
            best_checkpoint = min(
                best_checkpoints, key=lambda c: getattr(c, metric_name, float("inf"))
            )
        else:
            best_checkpoint = max(
                best_checkpoints, key=lambda c: getattr(c, metric_name, float("-inf"))
            )

        return best_checkpoint.checkpoint_id

    def list_checkpoints(self) -> List[CheckpointMetadata]:
        """List all available checkpoints"""
        return sorted(self.checkpoint_history, key=lambda c: c.timestamp, reverse=True)

    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a specific checkpoint"""
        try:
            checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.pt"
            if checkpoint_path.exists():
                checkpoint_path.unlink()

            # Remove from history
            self.checkpoint_history = [
                c for c in self.checkpoint_history if c.checkpoint_id != checkpoint_id
            ]
            self._save_checkpoint_history()

            self.logger.info(f"Checkpoint deleted: {checkpoint_id}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to delete checkpoint {checkpoint_id}: {str(e)}")
            return False

    def _generate_checkpoint_id(self, step: int, epoch: int) -> str:
        """Generate unique checkpoint ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"checkpoint_epoch_{epoch:04d}_step_{step:06d}_{timestamp}"

    def _create_metadata(
        self,
        checkpoint_id: str,
        training_state: TrainingState,
        metrics: Dict[str, float],
        is_best: bool,
        custom_metadata: Dict[str, Any],
    ) -> CheckpointMetadata:
        """Create checkpoint metadata"""
        return CheckpointMetadata(
            checkpoint_id=checkpoint_id,
            timestamp=datetime.now(),
            step=training_state.step,
            epoch=training_state.epoch,
            loss=metrics.get("loss", 0.0),
            validation_loss=metrics.get("validation_loss"),
            learning_rate=metrics.get("learning_rate", 0.0),
            language_loss=metrics.get("language_loss"),
            eq_loss=metrics.get("eq_loss"),
            persona_loss=metrics.get("persona_loss"),
            clinical_loss=metrics.get("clinical_loss"),
            empathy_loss=metrics.get("empathy_loss"),
            eq_score=metrics.get("eq_score"),
            clinical_accuracy=metrics.get("clinical_accuracy"),
            persona_accuracy=metrics.get("persona_accuracy"),
            empathy_score=metrics.get("empathy_score"),
            gpu_memory_used=self._get_gpu_memory_usage(),
            is_best=is_best,
            custom_metrics=custom_metadata,
        )

    def _get_gpu_memory_usage(self) -> Optional[float]:
        """Get current GPU memory usage in GB"""
        import contextlib
        with contextlib.suppress(Exception):
            if torch.cuda.is_available():
                return torch.cuda.memory_allocated() / (1024**3)
        return None

    def _cleanup_old_checkpoints(self) -> None:
        """Clean up old checkpoints based on retention policies"""
        try:
            # Sort checkpoints by timestamp
            sorted_checkpoints = sorted(
                self.checkpoint_history, key=lambda c: c.timestamp, reverse=True
            )

            # Identify checkpoints to keep
            keep_checkpoints = set()

            # Keep last N checkpoints
            if self.config.keep_last_n_checkpoints > 0:
                keep_checkpoints.update(
                    c.checkpoint_id
                    for c in sorted_checkpoints[: self.config.keep_last_n_checkpoints]
                )

            # Keep best N checkpoints
            if self.config.keep_best_n_checkpoints > 0:
                best_checkpoints = [c for c in sorted_checkpoints if c.is_best]
                keep_checkpoints.update(
                    c.checkpoint_id for c in best_checkpoints[: self.config.keep_best_n_checkpoints]
                )

            # Keep every N epochs
            if self.config.keep_every_n_epochs > 0:
                epoch_checkpoints = [
                    c for c in sorted_checkpoints if c.epoch % self.config.keep_every_n_epochs == 0
                ]
                keep_checkpoints.update(c.checkpoint_id for c in epoch_checkpoints)

            # Delete checkpoints not in keep list
            for checkpoint in sorted_checkpoints:
                if checkpoint.checkpoint_id not in keep_checkpoints:
                    self.delete_checkpoint(checkpoint.checkpoint_id)

        except Exception as e:
            self.logger.error(f"Checkpoint cleanup failed: {str(e)}")

    def _save_checkpoint_history(self) -> None:
        """Save checkpoint history to disk"""
        try:
            history_path = self.checkpoint_dir / "checkpoint_history.json"
            history_data = [asdict(c) for c in self.checkpoint_history]

            # Convert datetime objects to strings
            for checkpoint_data in history_data:
                if "timestamp" in checkpoint_data and isinstance(
                    checkpoint_data["timestamp"], datetime
                ):
                    checkpoint_data["timestamp"] = checkpoint_data["timestamp"].isoformat()

            with open(history_path, "w") as f:
                json.dump(history_data, f, indent=2, default=str)

        except Exception as e:
            self.logger.error(f"Failed to save checkpoint history: {str(e)}")

    def _load_checkpoint_history(self) -> None:
        """Load checkpoint history from disk"""
        try:
            history_path = self.checkpoint_dir / "checkpoint_history.json"
            if history_path.exists():
                with open(history_path, "r") as f:
                    history_data = json.load(f)

                # Convert back to CheckpointMetadata objects
                for checkpoint_data in history_data:
                    if "timestamp" in checkpoint_data and isinstance(
                        checkpoint_data["timestamp"], str
                    ):
                        checkpoint_data["timestamp"] = datetime.fromisoformat(
                            checkpoint_data["timestamp"]
                        )

                self.checkpoint_history = [CheckpointMetadata(**data) for data in history_data]

                self.logger.info(f"Loaded {len(self.checkpoint_history)} checkpoints from history")

        except Exception as e:
            self.logger.warning(f"Failed to load checkpoint history: {str(e)}")
            self.checkpoint_history = []

    def cleanup(self) -> None:
        """Clean up resources"""
        try:
            self.executor.shutdown(wait=True)
        except Exception as e:
            self.logger.error(f"Error during checkpoint manager cleanup: {str(e)}")


# Utility functions for integration with training pipelines
def create_training_state_from_model(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: Optional[Any] = None,
    step: int = 0,
    epoch: int = 0,
    **kwargs,
) -> TrainingState:
    """Create TrainingState from training components"""
    import random

    import numpy as np

    return TrainingState(
        step=step,
        epoch=epoch,
        model_state_dict=model.state_dict(),
        optimizer_state_dict=optimizer.state_dict(),
        scheduler_state_dict=scheduler.state_dict() if scheduler else None,
        torch_rng_state=torch.get_rng_state(),
        numpy_rng_state={
            "state": np.random.get_state(),
        },
        python_rng_state=random.getstate(),
        cuda_rng_state=(torch.cuda.get_rng_state() if torch.cuda.is_available() else None),
        **kwargs,
    )


def restore_training_state_to_model(
    training_state: TrainingState,
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    scheduler: Optional[Any] = None,
) -> None:
    """Restore TrainingState to training components"""
    import random

    import numpy as np

    # Restore model and optimizer
    model.load_state_dict(training_state.model_state_dict)
    optimizer.load_state_dict(training_state.optimizer_state_dict)

    if scheduler and training_state.scheduler_state_dict:
        scheduler.load_state_dict(training_state.scheduler_state_dict)

    # Restore random states for reproducibility
    if training_state.torch_rng_state is not None:
        torch.set_rng_state(training_state.torch_rng_state)

    if training_state.numpy_rng_state is not None:
        np.random.set_state(training_state.numpy_rng_state["state"])

    if training_state.python_rng_state is not None:
        random.setstate(training_state.python_rng_state)

    if training_state.cuda_rng_state is not None and torch.cuda.is_available():
        torch.cuda.set_rng_state(training_state.cuda_rng_state)
