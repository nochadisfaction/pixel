#!/usr/bin/env python3
"""
Unit Tests for Real-Time Training Dashboard

This module provides comprehensive tests for the real-time training metrics
dashboard system, covering metrics collection, anomaly detection, visualization,
and dashboard functionality.
"""

import asyncio
import json
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import pytest

from ai.pixel.training.real_time_dashboard import (
    AnomalyDetector,
    DashboardConfig,
    MetricsCollector,
    RealTimeDashboardManager,
    TrainingMetrics,
    VisualizationEngine,
    create_sample_metrics,
)


class TestTrainingMetrics:
    """Test TrainingMetrics dataclass"""

    def test_training_metrics_creation(self):
        """Test TrainingMetrics object creation"""
        timestamp = datetime.now()
        metrics = TrainingMetrics(
            timestamp=timestamp,
            step=100,
            epoch=1,
            total_loss=2.5,
            component_losses={"language_loss": 1.5, "eq_loss": 0.5},
            eq_scores={"emotional_awareness": 0.7},
            clinical_accuracy={"dsm5_accuracy": 0.8},
            persona_metrics={"switching_accuracy": 0.9},
            gradient_norms={"total_norm": 2.0},
            learning_rates={"base_lr": 1e-4},
            memory_usage={"gpu_0": 0.8},
            throughput_metrics={"samples_per_second": 100},
        )

        assert metrics.timestamp == timestamp
        assert metrics.step == 100
        assert metrics.epoch == 1
        assert metrics.total_loss == 2.5
        assert metrics.component_losses["language_loss"] == 1.5
        assert metrics.eq_scores["emotional_awareness"] == 0.7


class TestDashboardConfig:
    """Test DashboardConfig dataclass"""

    def test_default_config(self):
        """Test default configuration values"""
        config = DashboardConfig()

        assert config.update_interval == 1
        assert config.max_history_points == 1000
        assert config.dashboard_port == 8050
        assert config.enable_alerts is True
        assert "loss_spike" in config.alert_thresholds
        assert config.alert_thresholds["loss_spike"] == 2.0

    def test_custom_config(self):
        """Test custom configuration values"""
        custom_thresholds = {"loss_spike": 3.0}
        config = DashboardConfig(
            update_interval=2,
            max_history_points=500,
            alert_thresholds=custom_thresholds,
        )

        assert config.update_interval == 2
        assert config.max_history_points == 500
        assert config.alert_thresholds["loss_spike"] == 3.0


class TestMetricsCollector:
    """Test MetricsCollector functionality"""

    @pytest.fixture
    def config(self):
        return DashboardConfig(max_history_points=10)

    @pytest.fixture
    def collector(self, config):
        return MetricsCollector(config)

    @pytest.fixture
    def sample_metrics(self):
        return create_sample_metrics(100)

    def test_metrics_collector_initialization(self, config):
        """Test MetricsCollector initialization"""
        collector = MetricsCollector(config)
        assert collector.config == config
        assert len(collector.metrics_history) == 0

    def test_add_metrics(self, collector, sample_metrics):
        """Test adding metrics to collector"""
        collector.add_metrics(sample_metrics)
        assert len(collector.metrics_history) == 1
        assert collector.metrics_history[0] == sample_metrics

    def test_max_history_points(self, collector):
        """Test metrics history size limit"""
        # Add more metrics than max_history_points
        for i in range(15):
            metrics = create_sample_metrics(i)
            collector.add_metrics(metrics)

        # Should only keep the last 10 (max_history_points)
        assert len(collector.metrics_history) == 10
        assert collector.metrics_history[0].step == 5  # First kept metric
        assert collector.metrics_history[-1].step == 14  # Last metric

    def test_get_recent_metrics(self, collector):
        """Test getting recent metrics"""
        # Add 5 metrics
        for i in range(5):
            metrics = create_sample_metrics(i)
            collector.add_metrics(metrics)

        # Get last 3 metrics
        recent = collector.get_recent_metrics(3)
        assert len(recent) == 3
        assert recent[0].step == 2
        assert recent[-1].step == 4

    def test_get_metrics_dataframe_empty(self, collector):
        """Test getting DataFrame when no metrics"""
        df = collector.get_metrics_dataframe()
        assert df.empty

    def test_get_metrics_dataframe_with_data(self, collector):
        """Test converting metrics to DataFrame"""
        # Add some metrics
        for i in range(3):
            metrics = create_sample_metrics(i * 10)
            collector.add_metrics(metrics)

        df = collector.get_metrics_dataframe()
        assert len(df) == 3
        assert "step" in df.columns
        assert "total_loss" in df.columns
        assert df["step"].tolist() == [0, 10, 20]

    @patch("redis.Redis")
    def test_redis_integration(self, mock_redis, config):
        """Test Redis integration for metrics storage"""
        mock_redis_client = Mock()
        mock_redis.return_value = mock_redis_client
        mock_redis_client.ping.return_value = True

        collector = MetricsCollector(config)
        metrics = create_sample_metrics(100)
        collector.add_metrics(metrics)

        # Verify Redis operations were called
        mock_redis_client.hset.assert_called_once()
        mock_redis_client.expire.assert_called_once()


class TestAnomalyDetector:
    """Test AnomalyDetector functionality"""

    @pytest.fixture
    def config(self):
        return DashboardConfig()

    @pytest.fixture
    def detector(self, config):
        return AnomalyDetector(config)

    @pytest.fixture
    def baseline_metrics(self):
        return create_sample_metrics(100)

    def test_anomaly_detector_initialization(self, config):
        """Test AnomalyDetector initialization"""
        detector = AnomalyDetector(config)
        assert detector.config == config
        assert len(detector.baseline_metrics) == 0
        assert len(detector.alert_history) == 0

    def test_update_baseline(self, detector, baseline_metrics):
        """Test updating baseline metrics"""
        detector.update_baseline(baseline_metrics)

        assert "total_loss" in detector.baseline_metrics
        assert "eq_average" in detector.baseline_metrics
        assert "clinical_average" in detector.baseline_metrics
        assert "gradient_norm" in detector.baseline_metrics
        assert "memory_usage" in detector.baseline_metrics

    def test_no_anomalies_first_run(self, detector, baseline_metrics):
        """Test that first run establishes baseline without anomalies"""
        anomalies = detector.detect_anomalies(baseline_metrics)
        assert len(anomalies) == 0
        assert len(detector.baseline_metrics) > 0

    def test_loss_spike_detection(self, detector, baseline_metrics):
        """Test loss spike anomaly detection"""
        # Establish baseline
        detector.update_baseline(baseline_metrics)

        # Create metrics with high loss
        spike_metrics = create_sample_metrics(101)
        spike_metrics.total_loss = baseline_metrics.total_loss * 3.0  # 3x spike

        anomalies = detector.detect_anomalies(spike_metrics)

        assert len(anomalies) > 0
        loss_spike_anomaly = next(
            (a for a in anomalies if a["type"] == "loss_spike"), None
        )
        assert loss_spike_anomaly is not None
        assert loss_spike_anomaly["severity"] == "high"

    def test_gradient_explosion_detection(self, detector, baseline_metrics):
        """Test gradient explosion anomaly detection"""
        detector.update_baseline(baseline_metrics)

        # Create metrics with high gradient norm
        explosion_metrics = create_sample_metrics(101)
        explosion_metrics.gradient_norms = {"total_norm": 15.0}  # Above threshold

        anomalies = detector.detect_anomalies(explosion_metrics)

        gradient_anomaly = next(
            (a for a in anomalies if a["type"] == "gradient_explosion"), None
        )
        assert gradient_anomaly is not None
        assert gradient_anomaly["severity"] == "critical"

    def test_memory_usage_alert(self, detector, baseline_metrics):
        """Test high memory usage alert detection"""
        detector.update_baseline(baseline_metrics)

        # Create metrics with high memory usage
        memory_metrics = create_sample_metrics(101)
        memory_metrics.memory_usage = {"gpu_0": 0.98}  # Above 95% threshold

        anomalies = detector.detect_anomalies(memory_metrics)

        memory_anomaly = next(
            (a for a in anomalies if a["type"] == "high_memory"), None
        )
        assert memory_anomaly is not None
        assert memory_anomaly["severity"] == "medium"

    def test_eq_regression_detection(self, detector, baseline_metrics):
        """Test EQ regression anomaly detection"""
        detector.update_baseline(baseline_metrics)

        # Create metrics with low EQ scores
        regression_metrics = create_sample_metrics(101)
        # Reduce all EQ scores significantly
        for key in regression_metrics.eq_scores:
            regression_metrics.eq_scores[key] = 0.3  # Much lower than baseline

        anomalies = detector.detect_anomalies(regression_metrics)

        eq_anomaly = next((a for a in anomalies if a["type"] == "eq_regression"), None)
        assert eq_anomaly is not None
        assert eq_anomaly["severity"] == "medium"

    def test_clinical_accuracy_drop(self, detector, baseline_metrics):
        """Test clinical accuracy drop detection"""
        detector.update_baseline(baseline_metrics)

        # Create metrics with low clinical accuracy
        drop_metrics = create_sample_metrics(101)
        for key in drop_metrics.clinical_accuracy:
            drop_metrics.clinical_accuracy[key] = 0.3  # Much lower than baseline

        anomalies = detector.detect_anomalies(drop_metrics)

        clinical_anomaly = next(
            (a for a in anomalies if a["type"] == "clinical_regression"), None
        )
        assert clinical_anomaly is not None
        assert clinical_anomaly["severity"] == "high"

    def test_alert_history_storage(self, detector, baseline_metrics):
        """Test that anomalies are stored in alert history"""
        detector.update_baseline(baseline_metrics)

        # Create metrics that trigger multiple anomalies
        anomaly_metrics = create_sample_metrics(101)
        anomaly_metrics.total_loss = baseline_metrics.total_loss * 3.0
        anomaly_metrics.gradient_norms = {"total_norm": 15.0}

        initial_alert_count = len(detector.alert_history)
        anomalies = detector.detect_anomalies(anomaly_metrics)

        assert len(detector.alert_history) > initial_alert_count
        assert len(detector.alert_history) == initial_alert_count + len(anomalies)


class TestVisualizationEngine:
    """Test VisualizationEngine functionality"""

    @pytest.fixture
    def config(self):
        return DashboardConfig()

    @pytest.fixture
    def viz_engine(self, config):
        return VisualizationEngine(config)

    @pytest.fixture
    def sample_dataframe(self):
        """Create sample DataFrame for testing"""
        data = []
        for i in range(10):
            metrics = create_sample_metrics(i * 10)
            row = {
                "step": metrics.step,
                "total_loss": metrics.total_loss,
                "language_loss": metrics.component_losses.get("language_loss", 0),
                "eq_loss": metrics.component_losses.get("eq_loss", 0),
                "clinical_loss": metrics.component_losses.get("clinical_loss", 0),
                "eq_emotional_awareness": metrics.eq_scores.get(
                    "emotional_awareness", 0
                ),
                "eq_empathy_recognition": metrics.eq_scores.get(
                    "empathy_recognition", 0
                ),
                "clinical_dsm5_accuracy": metrics.clinical_accuracy.get(
                    "dsm5_accuracy", 0
                ),
                "clinical_pdm2_accuracy": metrics.clinical_accuracy.get(
                    "pdm2_accuracy", 0
                ),
                "mem_gpu_0": metrics.memory_usage.get("gpu_0", 0),
                "grad_total_norm": metrics.gradient_norms.get("total_norm", 0),
                "lr_base_lr": metrics.learning_rates.get("base_lr", 0),
                "throughput_samples_per_second": metrics.throughput_metrics.get(
                    "samples_per_second", 0
                ),
            }
            data.append(row)
        return pd.DataFrame(data)

    def test_visualization_engine_initialization(self, config):
        """Test VisualizationEngine initialization"""
        viz_engine = VisualizationEngine(config)
        assert viz_engine.config == config
        assert "primary" in viz_engine.colors
        assert "danger" in viz_engine.colors

    def test_create_loss_components_plot_empty(self, viz_engine):
        """Test loss components plot with empty DataFrame"""
        empty_df = pd.DataFrame()
        fig = viz_engine.create_loss_components_plot(empty_df)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) == 0  # No traces for empty data

    def test_create_loss_components_plot_with_data(self, viz_engine, sample_dataframe):
        """Test loss components plot with data"""
        fig = viz_engine.create_loss_components_plot(sample_dataframe)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) > 0  # Should have traces

        # Check that total loss trace exists
        trace_names = [trace.name for trace in fig.data]
        assert "Total Loss" in trace_names

    def test_create_eq_progression_plot_empty(self, viz_engine):
        """Test EQ progression plot with empty DataFrame"""
        empty_df = pd.DataFrame()
        fig = viz_engine.create_eq_progression_plot(empty_df)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) == 0

    def test_create_eq_progression_plot_with_data(self, viz_engine, sample_dataframe):
        """Test EQ progression plot with data"""
        fig = viz_engine.create_eq_progression_plot(sample_dataframe)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) > 0

        # Check for EQ domain traces
        trace_names = [trace.name for trace in fig.data]
        assert any("Emotional Awareness" in name for name in trace_names)

    def test_create_clinical_accuracy_plot_empty(self, viz_engine):
        """Test clinical accuracy plot with empty DataFrame"""
        empty_df = pd.DataFrame()
        fig = viz_engine.create_clinical_accuracy_plot(empty_df)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) == 0

    def test_create_clinical_accuracy_plot_with_data(
        self, viz_engine, sample_dataframe
    ):
        """Test clinical accuracy plot with data"""
        fig = viz_engine.create_clinical_accuracy_plot(sample_dataframe)

        assert isinstance(fig, go.Figure)
        assert len(fig.data) > 0

        # Check for clinical accuracy traces
        trace_names = [trace.name for trace in fig.data]
        assert any("Dsm5 Accuracy" in name for name in trace_names)

    def test_create_system_metrics_plot_empty(self, viz_engine):
        """Test system metrics plot with empty DataFrame"""
        empty_df = pd.DataFrame()
        fig = viz_engine.create_system_metrics_plot(empty_df)

        assert isinstance(fig, go.Figure)
        # Even empty, should have subplot structure

    def test_create_system_metrics_plot_with_data(self, viz_engine, sample_dataframe):
        """Test system metrics plot with data"""
        fig = viz_engine.create_system_metrics_plot(sample_dataframe)

        assert isinstance(fig, go.Figure)
        # Should have traces for memory, gradients, learning rates, throughput


class TestRealTimeDashboardManager:
    """Test RealTimeDashboardManager functionality"""

    @pytest.fixture
    def config(self):
        return DashboardConfig(max_history_points=5)

    @pytest.fixture
    def manager(self, config):
        return RealTimeDashboardManager(config)

    def test_manager_initialization(self, config):
        """Test RealTimeDashboardManager initialization"""
        manager = RealTimeDashboardManager(config)

        assert manager.config == config
        assert manager.logger is not None
        assert manager.metrics_collector is not None
        assert manager.running is False

    def test_add_metrics(self, manager):
        """Test adding metrics to manager"""
        metrics = create_sample_metrics(100)
        manager.add_metrics(metrics)

        # Check that metrics were added to collector
        assert len(manager.metrics_collector.metrics_history) == 1
        assert manager.metrics_collector.metrics_history[0] == metrics

    def test_start_stop(self, manager):
        """Test starting and stopping the manager"""
        assert manager.running is False

        manager.start()
        assert manager.running is True

        manager.stop()
        assert manager.running is False

    def test_save_metrics_history(self, manager):
        """Test saving metrics history to file"""
        # Add some metrics
        for i in range(3):
            metrics = create_sample_metrics(i * 10)
            manager.add_metrics(metrics)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            filepath = f.name

        try:
            manager.save_metrics_history(filepath)

            # Verify file was created and has content
            saved_df = pd.read_csv(filepath)
            assert len(saved_df) == 3
            assert "step" in saved_df.columns

        finally:
            Path(filepath).unlink(missing_ok=True)

    def test_load_metrics_history(self, manager):
        """Test loading metrics history from file"""
        # Create sample CSV data
        data = {
            "timestamp": [datetime.now().isoformat() for _ in range(2)],
            "step": [10, 20],
            "epoch": [1, 1],
            "total_loss": [2.5, 2.3],
            "language_loss": [1.5, 1.4],
            "eq_emotional_awareness": [0.7, 0.75],
            "clinical_dsm5_accuracy": [0.8, 0.82],
        }
        df = pd.DataFrame(data)

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            filepath = f.name
            df.to_csv(filepath, index=False)

        try:
            manager.load_metrics_history(filepath)

            # Verify metrics were loaded
            assert len(manager.metrics_collector.metrics_history) == 2

        finally:
            Path(filepath).unlink(missing_ok=True)


class TestCreateSampleMetrics:
    """Test create_sample_metrics utility function"""

    def test_create_sample_metrics(self):
        """Test creating sample metrics"""
        step = 100
        metrics = create_sample_metrics(step)

        assert isinstance(metrics, TrainingMetrics)
        assert metrics.step == step
        assert metrics.epoch == step // 1000
        assert isinstance(metrics.total_loss, float)
        assert len(metrics.component_losses) > 0
        assert len(metrics.eq_scores) == 5  # 5 EQ domains
        assert len(metrics.clinical_accuracy) > 0
        assert len(metrics.persona_metrics) > 0
        assert len(metrics.gradient_norms) > 0
        assert len(metrics.learning_rates) > 0
        assert len(metrics.memory_usage) > 0
        assert len(metrics.throughput_metrics) > 0

    def test_sample_metrics_variability(self):
        """Test that sample metrics have variability"""
        metrics1 = create_sample_metrics(100)
        metrics2 = create_sample_metrics(100)

        # Should have different values due to randomness
        assert metrics1.total_loss != metrics2.total_loss
        assert (
            metrics1.eq_scores["emotional_awareness"]
            != metrics2.eq_scores["emotional_awareness"]
        )


class TestIntegration:
    """Integration tests for dashboard components"""

    @pytest.fixture
    def config(self):
        return DashboardConfig(max_history_points=10)

    @pytest.fixture
    def full_manager(self, config):
        return RealTimeDashboardManager(config)

    def test_end_to_end_metrics_flow(self, full_manager):
        """Test complete metrics flow from addition to visualization"""
        # Add multiple metrics
        for i in range(5):
            metrics = create_sample_metrics(i * 10)
            full_manager.add_metrics(metrics)

        # Get DataFrame for visualization
        df = full_manager.metrics_collector.get_metrics_dataframe()
        assert len(df) == 5

        # Test visualization creation
        viz_engine = full_manager.viz_engine
        loss_fig = viz_engine.create_loss_components_plot(df)
        eq_fig = viz_engine.create_eq_progression_plot(df)
        clinical_fig = viz_engine.create_clinical_accuracy_plot(df)
        system_fig = viz_engine.create_system_metrics_plot(df)

        # All figures should be created successfully
        assert isinstance(loss_fig, go.Figure)
        assert isinstance(eq_fig, go.Figure)
        assert isinstance(clinical_fig, go.Figure)
        assert isinstance(system_fig, go.Figure)

    def test_anomaly_detection_integration(self, full_manager):
        """Test anomaly detection integration with metrics flow"""
        # Add baseline metrics
        baseline = create_sample_metrics(100)
        full_manager.add_metrics(baseline)

        # Add anomalous metrics
        anomalous = create_sample_metrics(101)
        anomalous.total_loss = baseline.total_loss * 3.0  # Trigger loss spike
        full_manager.add_metrics(anomalous)

        # Manually check anomaly detection (since add_metrics doesn't automatically detect)
        anomalies = full_manager.anomaly_detector.detect_anomalies(anomalous)
        assert len(anomalies) > 0

    def test_persistence_integration(self, full_manager):
        """Test metrics persistence and restoration"""
        # Add metrics
        original_metrics = []
        for i in range(3):
            metrics = create_sample_metrics(i * 10)
            full_manager.add_metrics(metrics)
            original_metrics.append(metrics)

        # Save to file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            filepath = f.name

        try:
            full_manager.save_metrics_history(filepath)

            # Create new manager and load
            new_manager = RealTimeDashboardManager(full_manager.config)
            new_manager.load_metrics_history(filepath)

            # Verify data was restored
            assert len(new_manager.metrics_collector.metrics_history) == 3

        finally:
            Path(filepath).unlink(missing_ok=True)


if __name__ == "__main__":
    pytest.main([__file__])
