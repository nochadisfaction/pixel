#!/usr/bin/env python3
"""
Unit tests for Training Anomaly Detection System

Tests anomaly detection, alert generation, statistical analysis,
and complete monitoring workflows for training irregularities.
"""

import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import numpy as np
from training_anomaly_detector import (
    AlertManager,
    AlertSeverity,
    AnomalyAlert,
    AnomalyDetectionConfig,
    AnomalyType,
    StatisticalAnomalyDetector,
    TrainingAnomalyDetector,
    TrainingMetrics,
)


class TestAnomalyDetectionConfig(unittest.TestCase):
    """Test anomaly detection configuration"""

    def test_default_config(self):
        """Test default configuration values"""
        config = AnomalyDetectionConfig()

        self.assertEqual(config.rolling_window_size, 100)
        self.assertEqual(config.anomaly_threshold_std, 2.0)
        self.assertEqual(config.loss_spike_threshold, 0.5)
        self.assertEqual(config.gradient_explosion_threshold, 100.0)
        self.assertEqual(config.gradient_vanishing_threshold, 1e-7)
        self.assertEqual(config.check_interval_steps, 10)
        self.assertEqual(config.memory_check_interval, 50)
        self.assertEqual(config.convergence_patience, 200)
        self.assertFalse(config.enable_email_alerts)
        self.assertTrue(config.enable_webhook_alerts)
        self.assertEqual(config.alert_cooldown_minutes, 15)
        self.assertEqual(config.alert_log_path, "anomaly_alerts")

    def test_custom_config(self):
        """Test custom configuration"""
        config = AnomalyDetectionConfig(
            rolling_window_size=200,
            anomaly_threshold_std=3.0,
            gradient_explosion_threshold=200.0,
            enable_email_alerts=True,
            alert_cooldown_minutes=30,
        )

        self.assertEqual(config.rolling_window_size, 200)
        self.assertEqual(config.anomaly_threshold_std, 3.0)
        self.assertEqual(config.gradient_explosion_threshold, 200.0)
        self.assertTrue(config.enable_email_alerts)
        self.assertEqual(config.alert_cooldown_minutes, 30)


class TestTrainingMetrics(unittest.TestCase):
    """Test training metrics data structure"""

    def test_training_metrics_creation(self):
        """Test creating training metrics"""
        timestamp = datetime.now()
        metrics = TrainingMetrics(
            step=100,
            epoch=1,
            timestamp=timestamp,
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.8},
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=10.0,
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        self.assertEqual(metrics.step, 100)
        self.assertEqual(metrics.epoch, 1)
        self.assertEqual(metrics.timestamp, timestamp)
        self.assertEqual(metrics.total_loss, 1.5)
        self.assertEqual(metrics.gradient_norm, 10.0)
        self.assertEqual(metrics.memory_usage_mb, 2048.0)


class TestAnomalyAlert(unittest.TestCase):
    """Test anomaly alert data structure"""

    def test_anomaly_alert_creation(self):
        """Test creating anomaly alert"""
        timestamp = datetime.now()
        alert = AnomalyAlert(
            alert_id="test_alert_123",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=timestamp,
            step=100,
            epoch=1,
            description="Test loss spike detected",
            metrics={"total_loss": 5.0, "z_score": 3.5},
            suggested_actions=["Check data", "Reduce learning rate"],
        )

        self.assertEqual(alert.alert_id, "test_alert_123")
        self.assertEqual(alert.anomaly_type, AnomalyType.LOSS_SPIKE)
        self.assertEqual(alert.severity, AlertSeverity.HIGH)
        self.assertEqual(alert.step, 100)
        self.assertEqual(alert.description, "Test loss spike detected")
        self.assertEqual(len(alert.suggested_actions), 2)

    def test_alert_to_dict(self):
        """Test converting alert to dictionary"""
        timestamp = datetime.now()
        alert = AnomalyAlert(
            alert_id="test_alert_123",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=timestamp,
            step=100,
            epoch=1,
            description="Test loss spike detected",
            metrics={"total_loss": 5.0},
            suggested_actions=["Check data"],
        )

        alert_dict = alert.to_dict()

        self.assertEqual(alert_dict["alert_id"], "test_alert_123")
        self.assertEqual(alert_dict["anomaly_type"], "loss_spike")
        self.assertEqual(alert_dict["severity"], "high")
        self.assertEqual(alert_dict["step"], 100)
        self.assertEqual(alert_dict["timestamp"], timestamp.isoformat())


class TestStatisticalAnomalyDetector(unittest.TestCase):
    """Test statistical anomaly detection"""

    def setUp(self):
        """Set up test fixtures"""
        self.detector = StatisticalAnomalyDetector(window_size=10, threshold_std=2.0)

    def test_detector_initialization(self):
        """Test detector initialization"""
        self.assertEqual(self.detector.window_size, 10)
        self.assertEqual(self.detector.threshold_std, 2.0)
        self.assertEqual(len(self.detector.metric_windows), 0)

    def test_add_metric(self):
        """Test adding metrics to rolling window"""
        # Add some values
        for i in range(5):
            self.detector.add_metric("test_metric", float(i))

        window = self.detector.metric_windows["test_metric"]
        self.assertEqual(len(window), 5)
        self.assertEqual(list(window), [0.0, 1.0, 2.0, 3.0, 4.0])

    def test_anomaly_detection_insufficient_data(self):
        """Test anomaly detection with insufficient data"""
        # Add few values
        for i in range(5):
            self.detector.add_metric("test_metric", float(i))

        is_anomaly, z_score = self.detector.detect_anomaly("test_metric", 10.0)
        self.assertFalse(is_anomaly)
        self.assertEqual(z_score, 0.0)

    def test_anomaly_detection_normal_value(self):
        """Test anomaly detection with normal value"""
        # Add values with mean=5, std~3
        values = [2, 3, 4, 5, 6, 7, 8, 5, 4, 6]
        for value in values:
            self.detector.add_metric("test_metric", float(value))

        # Test normal value
        is_anomaly, z_score = self.detector.detect_anomaly("test_metric", 5.5)
        self.assertFalse(is_anomaly)
        self.assertLess(z_score, 2.0)

    def test_anomaly_detection_anomalous_value(self):
        """Test anomaly detection with anomalous value"""
        # Add values with mean=5, small std but not zero
        values = [4.9, 5.0, 5.1, 4.8, 5.2, 4.7, 5.3, 4.6, 5.4, 5.0]
        for value in values:
            self.detector.add_metric("test_metric", float(value))

        # Test anomalous value
        is_anomaly, z_score = self.detector.detect_anomaly("test_metric", 15.0)
        self.assertTrue(is_anomaly)
        self.assertGreater(z_score, 2.0)


class TestAlertManager(unittest.TestCase):
    """Test alert management functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = AnomalyDetectionConfig(
            alert_log_path=self.temp_dir,
            alert_cooldown_minutes=1,  # Short cooldown for testing
        )
        self.alert_manager = AlertManager(self.config)

    def test_alert_manager_initialization(self):
        """Test alert manager initialization"""
        self.assertEqual(self.alert_manager.config, self.config)
        self.assertEqual(len(self.alert_manager.alert_history), 0)
        self.assertEqual(len(self.alert_manager.last_alert_times), 0)
        self.assertTrue(Path(self.temp_dir).exists())

    def test_add_alert_callback(self):
        """Test adding alert callbacks"""
        callback = Mock()
        self.alert_manager.add_alert_callback(callback)
        self.assertEqual(len(self.alert_manager.alert_callbacks), 1)

    def test_generate_alert_first_time(self):
        """Test generating alert for the first time"""
        alert = AnomalyAlert(
            alert_id="test_alert",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now(),
            step=100,
            epoch=1,
            description="Test alert",
            metrics={},
            suggested_actions=[],
        )

        result = self.alert_manager.generate_alert(alert)

        self.assertTrue(result)
        self.assertEqual(len(self.alert_manager.alert_history), 1)
        self.assertIn(AnomalyType.LOSS_SPIKE, self.alert_manager.last_alert_times)

    def test_generate_alert_with_cooldown(self):
        """Test alert generation with cooldown period"""
        alert1 = AnomalyAlert(
            alert_id="test_alert_1",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now(),
            step=100,
            epoch=1,
            description="Test alert 1",
            metrics={},
            suggested_actions=[],
        )

        alert2 = AnomalyAlert(
            alert_id="test_alert_2",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now(),
            step=101,
            epoch=1,
            description="Test alert 2",
            metrics={},
            suggested_actions=[],
        )

        # Generate first alert
        result1 = self.alert_manager.generate_alert(alert1)
        self.assertTrue(result1)

        # Generate second alert immediately (should be blocked by cooldown)
        result2 = self.alert_manager.generate_alert(alert2)
        self.assertFalse(result2)

        self.assertEqual(len(self.alert_manager.alert_history), 1)

    def test_alert_callback_execution(self):
        """Test alert callback execution"""
        callback = Mock()
        self.alert_manager.add_alert_callback(callback)

        alert = AnomalyAlert(
            alert_id="test_alert",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now(),
            step=100,
            epoch=1,
            description="Test alert",
            metrics={},
            suggested_actions=[],
        )

        self.alert_manager.generate_alert(alert)
        callback.assert_called_once_with(alert)

    def test_get_recent_alerts(self):
        """Test getting recent alerts"""
        # Add alerts with different timestamps
        old_alert = AnomalyAlert(
            alert_id="old_alert",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now() - timedelta(hours=25),
            step=100,
            epoch=1,
            description="Old alert",
            metrics={},
            suggested_actions=[],
        )

        recent_alert = AnomalyAlert(
            alert_id="recent_alert",
            anomaly_type=AnomalyType.GRADIENT_EXPLOSION,
            severity=AlertSeverity.CRITICAL,
            timestamp=datetime.now(),
            step=200,
            epoch=2,
            description="Recent alert",
            metrics={},
            suggested_actions=[],
        )

        self.alert_manager.alert_history = [old_alert, recent_alert]

        recent_alerts = self.alert_manager.get_recent_alerts(24)
        self.assertEqual(len(recent_alerts), 1)
        self.assertEqual(recent_alerts[0].alert_id, "recent_alert")


class TestTrainingAnomalyDetector(unittest.TestCase):
    """Test main training anomaly detector"""

    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = AnomalyDetectionConfig(alert_log_path=self.temp_dir, check_interval_steps=5)
        self.detector = TrainingAnomalyDetector(self.config)

    def test_detector_initialization(self):
        """Test detector initialization"""
        self.assertEqual(self.detector.config, self.config)
        self.assertEqual(len(self.detector.metrics_history), 0)
        self.assertEqual(self.detector.last_check_step, 0)
        self.assertFalse(self.detector.monitoring_active)

    def test_add_alert_callback(self):
        """Test adding alert callbacks"""
        callback = Mock()
        self.detector.add_alert_callback(callback)
        # Verify callback was added to alert manager
        self.assertEqual(len(self.detector.alert_manager.alert_callbacks), 1)

    def test_process_training_metrics_basic(self):
        """Test basic metrics processing"""
        metrics = TrainingMetrics(
            step=10,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.8},
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=10.0,
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        alerts = self.detector.process_training_metrics(metrics)

        self.assertEqual(len(self.detector.metrics_history), 1)
        self.assertIsInstance(alerts, list)

    def test_loss_spike_detection(self):
        """Test loss spike anomaly detection"""
        # Add normal metrics first
        for i in range(15):
            metrics = TrainingMetrics(
                step=i * 5,
                epoch=1,
                timestamp=datetime.now(),
                total_loss=1.0,  # Normal loss
                language_loss=0.8,
                eq_scores={"emotional_awareness": 0.8},
                clinical_accuracy={"dsm5_accuracy": 0.75},
                persona_metrics={"persona_accuracy": 0.85},
                empathy_scores={"empathy_score": 0.72},
                gradient_norm=10.0,
                memory_usage_mb=2048.0,
                learning_rate=1e-4,
            )
            self.detector.process_training_metrics(metrics)

        # Add spike
        spike_metrics = TrainingMetrics(
            step=80,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=10.0,  # Spike!
            language_loss=8.0,
            eq_scores={"emotional_awareness": 0.8},
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=10.0,
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        alerts = self.detector.process_training_metrics(spike_metrics)

        # Should detect loss spike
        spike_alerts = [a for a in alerts if a.anomaly_type == AnomalyType.LOSS_SPIKE]
        self.assertGreater(len(spike_alerts), 0)

    def test_gradient_explosion_detection(self):
        """Test gradient explosion detection"""
        metrics = TrainingMetrics(
            step=10,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.8},
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=500.0,  # Explosion!
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        alerts = self.detector.process_training_metrics(metrics)

        explosion_alerts = [a for a in alerts if a.anomaly_type == AnomalyType.GRADIENT_EXPLOSION]
        self.assertGreater(len(explosion_alerts), 0)
        self.assertEqual(explosion_alerts[0].severity, AlertSeverity.CRITICAL)

    def test_gradient_vanishing_detection(self):
        """Test gradient vanishing detection"""
        metrics = TrainingMetrics(
            step=10,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.8},
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=1e-8,  # Vanishing!
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        alerts = self.detector.process_training_metrics(metrics)

        vanishing_alerts = [a for a in alerts if a.anomaly_type == AnomalyType.GRADIENT_VANISHING]
        self.assertGreater(len(vanishing_alerts), 0)
        self.assertEqual(vanishing_alerts[0].severity, AlertSeverity.HIGH)

    def test_eq_regression_detection(self):
        """Test EQ score regression detection"""
        # First metric with good EQ scores
        metrics1 = TrainingMetrics(
            step=10,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.9},  # Good score
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=10.0,
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )
        self.detector.process_training_metrics(metrics1)

        # Second metric with dropped EQ scores
        metrics2 = TrainingMetrics(
            step=20,
            epoch=1,
            timestamp=datetime.now(),
            total_loss=1.5,
            language_loss=1.2,
            eq_scores={"emotional_awareness": 0.7},  # Significant drop
            clinical_accuracy={"dsm5_accuracy": 0.75},
            persona_metrics={"persona_accuracy": 0.85},
            empathy_scores={"empathy_score": 0.72},
            gradient_norm=10.0,
            memory_usage_mb=2048.0,
            learning_rate=1e-4,
        )

        alerts = self.detector.process_training_metrics(metrics2)

        eq_alerts = [a for a in alerts if a.anomaly_type == AnomalyType.EQ_REGRESSION]
        self.assertGreater(len(eq_alerts), 0)

    def test_get_anomaly_summary(self):
        """Test getting anomaly summary"""
        # Add some alerts to history
        alert1 = AnomalyAlert(
            alert_id="test1",
            anomaly_type=AnomalyType.LOSS_SPIKE,
            severity=AlertSeverity.HIGH,
            timestamp=datetime.now(),
            step=100,
            epoch=1,
            description="Test 1",
            metrics={},
            suggested_actions=[],
        )

        alert2 = AnomalyAlert(
            alert_id="test2",
            anomaly_type=AnomalyType.GRADIENT_EXPLOSION,
            severity=AlertSeverity.CRITICAL,
            timestamp=datetime.now(),
            step=200,
            epoch=2,
            description="Test 2",
            metrics={},
            suggested_actions=[],
        )

        self.detector.alert_manager.alert_history = [alert1, alert2]

        summary = self.detector.get_anomaly_summary()

        self.assertEqual(summary["total_alerts_24h"], 2)
        self.assertEqual(summary["alerts_by_type"]["loss_spike"], 1)
        self.assertEqual(summary["alerts_by_type"]["gradient_explosion"], 1)
        self.assertEqual(summary["alerts_by_severity"]["high"], 1)
        self.assertEqual(summary["alerts_by_severity"]["critical"], 1)


if __name__ == "__main__":
    unittest.main()
