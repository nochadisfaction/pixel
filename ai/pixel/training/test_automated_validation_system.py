#!/usr/bin/env python3
"""
Unit tests for Automated Validation System

Tests validation scheduling, metrics collection, early stopping,
report generation, and complete validation workflows.
"""

import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

import torch
import torch.nn as nn

from automated_validation_system import (
    ValidationConfig,
    ValidationMetrics,
    AutomatedValidator
)


class TestValidationConfig(unittest.TestCase):
    """Test validation configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ValidationConfig()
        
        self.assertEqual(config.validation_interval_steps, 500)
        self.assertEqual(config.validation_dataset_size, 1000)
        self.assertEqual(config.early_stopping_patience, 5)
        self.assertEqual(config.early_stopping_threshold, 0.001)
        self.assertEqual(config.validation_batch_size, 8)
        self.assertTrue(config.enable_early_stopping)
        self.assertEqual(config.primary_metric, 'total_loss')
        self.assertEqual(config.validation_report_path, "validation_reports")
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = ValidationConfig(
            validation_interval_steps=1000,
            validation_dataset_size=500,
            early_stopping_patience=10,
            enable_early_stopping=False,
            primary_metric='eq_scores'
        )
        
        self.assertEqual(config.validation_interval_steps, 1000)
        self.assertEqual(config.validation_dataset_size, 500)
        self.assertEqual(config.early_stopping_patience, 10)
        self.assertFalse(config.enable_early_stopping)
        self.assertEqual(config.primary_metric, 'eq_scores')


class TestValidationMetrics(unittest.TestCase):
    """Test validation metrics data structure"""
    
    def test_validation_metrics_creation(self):
        """Test creating validation metrics"""
        timestamp = datetime.now()
        metrics = ValidationMetrics(
            step=100,
            epoch=1,
            timestamp=timestamp,
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={'emotional_awareness': 0.8},
            clinical_accuracy={'dsm5_accuracy': 0.75},
            persona_metrics={'persona_accuracy': 0.85},
            empathy_scores={'empathy_score': 0.72},
            validation_time=5.5,
            sample_count=100
        )
        
        self.assertEqual(metrics.step, 100)
        self.assertEqual(metrics.epoch, 1)
        self.assertEqual(metrics.timestamp, timestamp)
        self.assertEqual(metrics.total_loss, 1.5)
        self.assertEqual(metrics.language_loss, 1.2)
        self.assertEqual(metrics.eq_scores['emotional_awareness'], 0.8)
        self.assertEqual(metrics.validation_time, 5.5)
        self.assertEqual(metrics.sample_count, 100)
    
    def test_metrics_to_dict(self):
        """Test converting metrics to dictionary"""
        timestamp = datetime.now()
        metrics = ValidationMetrics(
            step=100,
            epoch=1,
            timestamp=timestamp,
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={'emotional_awareness': 0.8},
            clinical_accuracy={'dsm5_accuracy': 0.75},
            persona_metrics={'persona_accuracy': 0.85},
            empathy_scores={'empathy_score': 0.72},
            validation_time=5.5,
            sample_count=100
        )
        
        metrics_dict = metrics.to_dict()
        
        self.assertEqual(metrics_dict['step'], 100)
        self.assertEqual(metrics_dict['epoch'], 1)
        self.assertEqual(metrics_dict['timestamp'], timestamp.isoformat())
        self.assertEqual(metrics_dict['total_loss'], 1.5)
        self.assertEqual(metrics_dict['language_loss'], 1.2)
        self.assertEqual(metrics_dict['eq_scores']['emotional_awareness'], 0.8)
        self.assertEqual(metrics_dict['validation_time'], 5.5)


class TestAutomatedValidator(unittest.TestCase):
    """Test automated validator functionality"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = ValidationConfig(
            validation_interval_steps=100,
            validation_report_path=self.temp_dir
        )
        self.validator = AutomatedValidator(self.config)
    
    def test_validator_initialization(self):
        """Test validator initialization"""
        self.assertEqual(self.validator.config, self.config)
        self.assertEqual(len(self.validator.validation_history), 0)
        self.assertEqual(self.validator.last_validation_step, 0)
        self.assertEqual(self.validator.best_metric, float('inf'))
        self.assertEqual(self.validator.patience_counter, 0)
        
        # Check that report directory was created
        self.assertTrue(Path(self.temp_dir).exists())
    
    def test_should_validate_logic(self):
        """Test validation scheduling logic"""
        # Should validate on first call
        self.assertTrue(self.validator.should_validate(100, 1))
        
        # Update last validation step
        self.validator.last_validation_step = 100
        
        # Should not validate yet
        self.assertFalse(self.validator.should_validate(150, 1))
        
        # Should validate after interval
        self.assertTrue(self.validator.should_validate(200, 1))
    
    @patch('torch.rand')
    def test_model_validation(self, mock_rand):
        """Test model validation process"""
        # Mock torch.rand to return predictable values
        mock_rand.return_value = torch.tensor([0.5])
        
        # Create mock model
        mock_model = Mock(spec=nn.Module)
        
        # Perform validation
        metrics = self.validator.validate_model(mock_model, 100, 1)
        
        # Check that model was set to eval and back to train
        mock_model.eval.assert_called_once()
        mock_model.train.assert_called_once()
        
        # Check metrics
        self.assertEqual(metrics.step, 100)
        self.assertEqual(metrics.epoch, 1)
        self.assertIsInstance(metrics.timestamp, datetime)
        self.assertGreater(metrics.total_loss, 0)
        self.assertGreater(metrics.validation_time, 0)
        self.assertEqual(metrics.sample_count, 100)
        
        # Check validation history was updated
        self.assertEqual(len(self.validator.validation_history), 1)
        self.assertEqual(self.validator.last_validation_step, 100)
    
    def test_early_stopping_improvement(self):
        """Test early stopping with improvement"""
        self.validator.best_metric = 2.0
        
        # Mock model
        mock_model = Mock(spec=nn.Module)
        
        with patch('torch.rand', return_value=torch.tensor([0.1])):  # Low loss
            metrics = self.validator.validate_model(mock_model, 100, 1)
        
        # Should have updated best metric and reset patience
        self.assertLess(self.validator.best_metric, 2.0)
        self.assertEqual(self.validator.patience_counter, 0)
        self.assertFalse(self.validator.should_stop_early())
    
    def test_early_stopping_no_improvement(self):
        """Test early stopping without improvement"""
        self.validator.best_metric = 1.0
        
        # Mock model
        mock_model = Mock(spec=nn.Module)
        
        # Perform multiple validations without improvement
        for i in range(6):
            with patch('torch.rand', return_value=torch.tensor([0.8])):  # High loss
                self.validator.validate_model(mock_model, 100 + i, 1)
        
        # Should trigger early stopping
        self.assertEqual(self.validator.patience_counter, 6)
        self.assertTrue(self.validator.should_stop_early())
    
    def test_early_stopping_disabled(self):
        """Test validation with early stopping disabled"""
        config = ValidationConfig(enable_early_stopping=False)
        validator = AutomatedValidator(config)
        
        # Even with many poor validations, should not stop early
        mock_model = Mock(spec=nn.Module)
        for i in range(10):
            with patch('torch.rand', return_value=torch.tensor([0.9])):
                validator.validate_model(mock_model, 100 + i, 1)
        
        self.assertFalse(validator.should_stop_early())
    
    def test_save_validation_report(self):
        """Test saving validation reports"""
        # Add some validation history
        mock_model = Mock(spec=nn.Module)
        
        with patch('torch.rand', return_value=torch.tensor([0.5])):
            self.validator.validate_model(mock_model, 100, 1)
            self.validator.validate_model(mock_model, 200, 2)
        
        # Save report
        report_path = self.validator.save_validation_report()
        
        # Check that file was created and contains correct data
        self.assertTrue(Path(report_path).exists())
        
        with open(report_path, 'r') as f:
            report_data = json.load(f)
        
        self.assertEqual(report_data['total_validations'], 2)
        self.assertEqual(len(report_data['validation_history']), 2)
        
        # Check first validation entry
        first_validation = report_data['validation_history'][0]
        self.assertEqual(first_validation['step'], 100)
        self.assertEqual(first_validation['epoch'], 1)
        self.assertIn('timestamp', first_validation)
        self.assertIn('total_loss', first_validation)
    
    def test_save_empty_validation_report(self):
        """Test saving report with no validation history"""
        report_path = self.validator.save_validation_report()
        self.assertEqual(report_path, "")
    
    def test_complete_validation_workflow(self):
        """Test complete validation workflow"""
        mock_model = Mock(spec=nn.Module)
        
        # Simulate training loop with validation
        training_steps = [50, 100, 150, 200, 250]
        
        for step in training_steps:
            if self.validator.should_validate(step, step // 100 + 1):
                with patch('torch.rand', return_value=torch.tensor([0.3])):
                    metrics = self.validator.validate_model(mock_model, step, step // 100 + 1)
                
                self.assertIsInstance(metrics, ValidationMetrics)
                self.assertEqual(metrics.step, step)
        
        # Should have validated at steps 100 and 200
        self.assertEqual(len(self.validator.validation_history), 2)
        self.assertEqual(self.validator.validation_history[0].step, 100)
        self.assertEqual(self.validator.validation_history[1].step, 200)
        
        # Save final report
        report_path = self.validator.save_validation_report()
        self.assertNotEqual(report_path, "")
        self.assertTrue(Path(report_path).exists())


if __name__ == "__main__":
    unittest.main()
