#!/usr/bin/env python3
"""
test_bias_detection_service.py
Unit tests for bias_detection_service.py

This test suite provides comprehensive testing for the Pixelated Empathy
Bias Detection Flask Service, covering all major components and endpoints.
"""

import asyncio
import json
import os
import tempfile
import unittest
from datetime import datetime
from unittest.mock import MagicMock, Mock, patch

import numpy as np
import pandas as pd
import pytest
from flask import Flask

# Import the service and related classes
from bias_detection_service import (
    AuditLogger,
    BiasDetectionConfig,
    BiasDetectionService,
    SecurityManager,
    SessionData,
    app,
)


class TestBiasDetectionConfig(unittest.TestCase):
    """Test BiasDetectionConfig dataclass"""

    def test_default_config(self):
        """Test default configuration values"""
        config = BiasDetectionConfig()
        
        self.assertEqual(config.warning_threshold, 0.3)
        self.assertEqual(config.high_threshold, 0.6)
        self.assertEqual(config.critical_threshold, 0.8)
        self.assertTrue(config.enable_hipaa_compliance)
        self.assertTrue(config.enable_audit_logging)
        self.assertTrue(config.enable_encryption)
        self.assertEqual(config.max_session_size_mb, 50)
        self.assertEqual(config.rate_limit_per_minute, 60)
        
        # Test default layer weights
        expected_weights = {
            "preprocessing": 0.25,
            "model_level": 0.30,
            "interactive": 0.20,
            "evaluation": 0.25,
        }
        self.assertEqual(config.layer_weights, expected_weights)

    def test_custom_config(self):
        """Test custom configuration values"""
        custom_weights = {
            "preprocessing": 0.3,
            "model_level": 0.4,
            "interactive": 0.2,
            "evaluation": 0.1,
        }
        
        config = BiasDetectionConfig(
            warning_threshold=0.4,
            high_threshold=0.7,
            critical_threshold=0.9,
            layer_weights=custom_weights,
            enable_hipaa_compliance=False,
        )
        
        self.assertEqual(config.warning_threshold, 0.4)
        self.assertEqual(config.high_threshold, 0.7)
        self.assertEqual(config.critical_threshold, 0.9)
        self.assertEqual(config.layer_weights, custom_weights)
        self.assertFalse(config.enable_hipaa_compliance)


class TestSessionData(unittest.TestCase):
    """Test SessionData dataclass"""

    def test_session_data_creation(self):
        """Test creating SessionData with required fields"""
        session_data = SessionData(
            session_id="test_session_001",
            participant_demographics={"age": 25, "gender": "female"},
            training_scenario={"scenario_type": "anxiety_management"},
            content={"session_notes": "Test session"},
            ai_responses=[{"content": "How are you feeling?", "response_time": 1.2}],
            expected_outcomes=[{"outcome": "improved_mood"}],
            transcripts=[{"text": "I feel better today", "timestamp": "2024-01-01T10:00:00Z"}],
            metadata={"version": "1.0"},
        )
        
        self.assertEqual(session_data.session_id, "test_session_001")
        self.assertEqual(session_data.participant_demographics["age"], 25)
        self.assertIsNotNone(session_data.timestamp)
        self.assertIsInstance(session_data.timestamp, str)

    def test_session_data_auto_timestamp(self):
        """Test automatic timestamp generation"""
        session_data = SessionData(
            session_id="test_session_002",
            participant_demographics={},
            training_scenario={},
            content={},
            ai_responses=[],
            expected_outcomes=[],
            transcripts=[],
            metadata={},
        )
        
        self.assertIsNotNone(session_data.timestamp)
        # Verify timestamp is in ISO format
        if session_data.timestamp is not None:
            datetime.fromisoformat(session_data.timestamp)


class TestSecurityManager(unittest.TestCase):
    """Test SecurityManager functionality"""

    def setUp(self):
        """Set up test environment variables"""
        os.environ["ENCRYPTION_PASSWORD"] = "test-password"
        os.environ["ENCRYPTION_SALT"] = "test-salt"
        os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
        self.security_manager = SecurityManager()

    def test_encrypt_decrypt_data(self):
        """Test data encryption and decryption"""
        test_data = "sensitive patient information"
        
        encrypted = self.security_manager.encrypt_data(test_data)
        self.assertNotEqual(encrypted, test_data)
        self.assertIsInstance(encrypted, str)
        
        decrypted = self.security_manager.decrypt_data(encrypted)
        self.assertEqual(decrypted, test_data)

    def test_hash_session_id(self):
        """Test session ID hashing"""
        session_id = "test_session_123"
        hashed = self.security_manager.hash_session_id(session_id)
        
        self.assertNotEqual(hashed, session_id)
        self.assertIsInstance(hashed, str)
        self.assertEqual(len(hashed), 64)  # SHA256 hash length

    @patch('jwt.decode')
    def test_verify_jwt_token_valid(self, mock_jwt_decode):
        """Test JWT token verification with valid token"""
        mock_jwt_decode.return_value = {"user_id": "test_user", "exp": 9999999999}
        
        token = "valid.jwt.token"
        result = self.security_manager.verify_jwt_token(token)
        
        self.assertEqual(result["user_id"], "test_user")
        mock_jwt_decode.assert_called_once()

    @patch('jwt.decode')
    def test_verify_jwt_token_invalid(self, mock_jwt_decode):
        """Test JWT token verification with invalid token"""
        from werkzeug.exceptions import Unauthorized
        import jwt
        
        mock_jwt_decode.side_effect = jwt.InvalidTokenError("Invalid token")
        
        token = "invalid.jwt.token"
        with self.assertRaises(Unauthorized):
            self.security_manager.verify_jwt_token(token)


class TestAuditLogger(unittest.TestCase):
    """Test AuditLogger functionality"""

    def setUp(self):
        """Set up audit logger with mock security manager"""
        self.security_manager = MagicMock()
        self.security_manager.hash_session_id.return_value = "hashed_session_id"
        self.security_manager.encrypt_data.return_value = "encrypted_data"
        self.audit_logger = AuditLogger(self.security_manager)
        self.audit_logger.audit_file = tempfile.mktemp(suffix=".log")

    def tearDown(self):
        """Clean up audit log file"""
        if os.path.exists(self.audit_logger.audit_file):
            os.remove(self.audit_logger.audit_file)

    @pytest.mark.asyncio
    async def test_log_event_non_sensitive(self):
        """Test logging non-sensitive events"""
        await self.audit_logger.log_event(
            event_type="analysis_started",
            session_id="test_session",
            user_id="test_user",
            details={"analysis_type": "comprehensive"},
            sensitive_data=False,
        )
        
        # Verify log file was created and contains entry
        self.assertTrue(os.path.exists(self.audit_logger.audit_file))
        
        with open(self.audit_logger.audit_file, 'r') as f:
            log_entry = json.loads(f.read().strip())
            
        self.assertEqual(log_entry["event_type"], "analysis_started")
        self.assertEqual(log_entry["user_id"], "test_user")
        self.assertEqual(log_entry["details"]["analysis_type"], "comprehensive")

    @pytest.mark.asyncio
    async def test_log_event_sensitive(self):
        """Test logging sensitive events with encryption"""
        await self.audit_logger.log_event(
            event_type="analysis_completed",
            session_id="test_session",
            user_id="test_user",
            details={"bias_score": 0.75, "patient_id": "12345"},
            sensitive_data=True,
        )
        
        with open(self.audit_logger.audit_file, 'r') as f:
            log_entry = json.loads(f.read().strip())
            
        self.assertEqual(log_entry["details"], "ENCRYPTED")
        self.assertEqual(log_entry["encrypted_details"], "encrypted_data")
        self.security_manager.encrypt_data.assert_called_once()


class TestBiasDetectionService(unittest.TestCase):
    """Test BiasDetectionService main functionality"""

    def setUp(self):
        """Set up bias detection service"""
        os.environ["ENCRYPTION_PASSWORD"] = "test-password"
        os.environ["ENCRYPTION_SALT"] = "test-salt"
        os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
        
        self.config = BiasDetectionConfig()
        self.service = BiasDetectionService(self.config)
        
        # Create test session data
        self.test_session_data = SessionData(
            session_id="test_session_001",
            participant_demographics={
                "gender_distribution": {"male": 40, "female": 60},
                "age_distribution": {"18-25": 20, "26-35": 30, "36-45": 25, "46+": 25},
                "ethnicity_distribution": {"white": 50, "black": 20, "hispanic": 15, "asian": 10, "other": 5},
            },
            training_scenario={"scenario_type": "anxiety_management"},
            content={"session_notes": "Patient expressing anxiety about work situation"},
            ai_responses=[
                {"content": "How are you feeling today?", "response_time": 1.2},
                {"content": "Can you tell me more about that?", "response_time": 1.5},
            ],
            expected_outcomes=[{"outcome": "improved_mood", "confidence": 0.8}],
            transcripts=[
                {"text": "I feel anxious about my job", "timestamp": "2024-01-01T10:00:00Z"},
                {"text": "The workload is overwhelming", "timestamp": "2024-01-01T10:05:00Z"},
            ],
            metadata={"version": "1.0", "session_type": "therapy"},
        )

    def test_calculate_entropy(self):
        """Test entropy calculation"""
        # Test balanced distribution (high entropy)
        balanced_values = [25, 25, 25, 25]
        entropy = self.service._calculate_entropy(balanced_values)
        self.assertGreater(entropy, 1.3)  # Should be close to log(4) ≈ 1.386
        
        # Test unbalanced distribution (low entropy)
        unbalanced_values = [90, 5, 3, 2]
        entropy = self.service._calculate_entropy(unbalanced_values)
        self.assertLess(entropy, 1.0)
        
        # Test empty values
        empty_values = []
        entropy = self.service._calculate_entropy(empty_values)
        self.assertEqual(entropy, 0.0)

    def test_demographic_representation_analysis(self):
        """Test demographic representation analysis"""
        result = self.service._analyze_demographic_representation(self.test_session_data)
        
        self.assertIn("bias_score", result)
        self.assertIn("representation_score", result)
        self.assertIn("gender_entropy", result)
        self.assertIn("age_entropy", result)
        self.assertIn("ethnicity_entropy", result)
        self.assertIn("distributions", result)
        
        # Bias score should be between 0 and 1
        self.assertGreaterEqual(result["bias_score"], 0.0)
        self.assertLessEqual(result["bias_score"], 1.0)

    def test_extract_text_content(self):
        """Test text content extraction from session data"""
        text_content = self.service._extract_text_content(self.test_session_data)
        
        self.assertIn("How are you feeling today?", text_content)
        self.assertIn("Can you tell me more about that?", text_content)
        self.assertIn("I feel anxious about my job", text_content)
        self.assertIn("The workload is overwhelming", text_content)
        self.assertIn("Patient expressing anxiety", text_content)

    def test_detect_gender_bias(self):
        """Test gender bias detection in text"""
        # Mock spaCy doc for testing
        from unittest.mock import Mock
        
        # Balanced text
        balanced_tokens = [Mock(text="he"), Mock(text="she"), Mock(text="him"), Mock(text="her")]
        bias_score = self.service._detect_gender_bias(balanced_tokens)
        self.assertEqual(bias_score, 0.0)  # Perfectly balanced
        
        # Unbalanced text
        unbalanced_tokens = [Mock(text="he"), Mock(text="him"), Mock(text="his")]
        bias_score = self.service._detect_gender_bias(unbalanced_tokens)
        self.assertEqual(bias_score, 1.0)  # Completely unbalanced

    def test_calculate_overall_bias_score(self):
        """Test overall bias score calculation"""
        layer_results = [
            {"layer": "preprocessing", "bias_score": 0.3},
            {"layer": "model_level", "bias_score": 0.5},
            {"layer": "interactive", "bias_score": 0.2},
            {"layer": "evaluation", "bias_score": 0.4},
        ]
        
        overall_score = self.service._calculate_overall_bias_score(layer_results)
        
        # Should be weighted average based on config weights
        expected_score = (0.3 * 0.25) + (0.5 * 0.30) + (0.2 * 0.20) + (0.4 * 0.25)
        self.assertAlmostEqual(overall_score, expected_score, places=2)

    def test_determine_alert_level(self):
        """Test alert level determination"""
        # Test different bias score ranges
        self.assertEqual(self.service._determine_alert_level(0.1), "low")
        self.assertEqual(self.service._determine_alert_level(0.4), "warning")
        self.assertEqual(self.service._determine_alert_level(0.7), "high")
        self.assertEqual(self.service._determine_alert_level(0.9), "critical")

    def test_calculate_confidence(self):
        """Test confidence calculation"""
        # All layers successful
        successful_results = [
            {"layer": "preprocessing", "bias_score": 0.3},
            {"layer": "model_level", "bias_score": 0.5},
        ]
        confidence = self.service._calculate_confidence(successful_results)
        self.assertEqual(confidence, 0.8)
        
        # Some layers with errors
        mixed_results = [
            {"layer": "preprocessing", "bias_score": 0.3},
            {"layer": "model_level", "error": "Failed to analyze"},
        ]
        confidence = self.service._calculate_confidence(mixed_results)
        self.assertEqual(confidence, 0.5)

    def test_generate_recommendations(self):
        """Test recommendation generation"""
        # High bias score should generate critical recommendations
        high_bias_results = [
            {"layer": "preprocessing", "bias_score": 0.9, "recommendations": ["Fix preprocessing"]},
            {"layer": "model_level", "bias_score": 0.8, "recommendations": ["Retrain model"]},
        ]
        
        recommendations = self.service._generate_recommendations(high_bias_results)
        
        self.assertIn("Fix preprocessing", recommendations)
        self.assertIn("Retrain model", recommendations)
        # Should include critical-level recommendations
        critical_recs = [r for r in recommendations if "CRITICAL" in r]
        self.assertGreater(len(critical_recs), 0)

    @pytest.mark.asyncio
    async def test_analyze_session_full(self):
        """Test full session analysis"""
        # Mock the audit logger to avoid file operations
        with patch.object(self.service.audit_logger, 'log_event', new_callable=AsyncMock):
            result = await self.service.analyze_session(self.test_session_data, "test_user")
            
            # Verify result structure
            self.assertIn("session_id", result)
            self.assertIn("overall_bias_score", result)
            self.assertIn("layer_results", result)
            self.assertIn("recommendations", result)
            self.assertIn("alert_level", result)
            self.assertIn("confidence", result)
            self.assertIn("processing_time_seconds", result)
            
            # Verify layer results structure
            layer_results = result["layer_results"]
            self.assertIn("preprocessing", layer_results)
            self.assertIn("model_level", layer_results)
            self.assertIn("interactive", layer_results)
            self.assertIn("evaluation", layer_results)
            
            # Verify bias score is within valid range
            self.assertGreaterEqual(result["overall_bias_score"], 0.0)
            self.assertLessEqual(result["overall_bias_score"], 1.0)

    def test_response_consistency_analysis(self):
        """Test response consistency analysis"""
        result = self.service._analyze_response_consistency(self.test_session_data)
        
        self.assertIn("bias_score", result)
        self.assertIn("response_length_variance", result)
        self.assertIn("response_time_variance", result)
        self.assertIn("total_responses", result)
        
        self.assertEqual(result["total_responses"], 2)

    def test_create_synthetic_dataset(self):
        """Test synthetic dataset creation for ML analysis"""
        dataset = self.service._create_synthetic_dataset(self.test_session_data)
        
        if dataset is not None:  # Only test if dataset creation succeeds
            self.assertIn("df", dataset)
            self.assertIn("label_names", dataset)
            self.assertIn("protected_attributes", dataset)
            self.assertIsInstance(dataset["df"], pd.DataFrame)
            self.assertGreater(len(dataset["df"]), 0)


class TestFlaskEndpoints(unittest.TestCase):
    """Test Flask API endpoints"""

    def setUp(self):
        """Set up Flask test client"""
        os.environ["FLASK_SECRET_KEY"] = "test-flask-secret"
        os.environ["JWT_SECRET_KEY"] = "test-jwt-secret"
        os.environ["ENV"] = "development"  # Disable auth for testing
        
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertEqual(data['status'], 'healthy')
        self.assertIn('components', data)
        self.assertIn('timestamp', data)
        self.assertIn('version', data)

    def test_analyze_endpoint_valid_data(self):
        """Test analyze endpoint with valid data"""
        test_data = {
            "session_id": "test_session_001",
            "participant_demographics": {
                "gender_distribution": {"male": 50, "female": 50},
                "age_distribution": {"18-25": 25, "26-35": 25, "36-45": 25, "46+": 25}
            },
            "content": {"session_notes": "Test session"},
            "ai_responses": [{"content": "How are you?", "response_time": 1.0}],
            "expected_outcomes": [{"outcome": "positive"}],
            "transcripts": [{"text": "I feel good", "timestamp": "2024-01-01T10:00:00Z"}],
            "metadata": {"version": "1.0"}
        }
        
        response = self.client.post('/analyze', json=test_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertIn('session_id', data)
        self.assertIn('overall_bias_score', data)
        self.assertIn('layer_results', data)

    def test_analyze_endpoint_missing_required_fields(self):
        """Test analyze endpoint with missing required fields"""
        invalid_data = {
            "session_id": "test_session_001"
            # Missing required fields
        }
        
        response = self.client.post('/analyze', json=invalid_data)
        self.assertEqual(response.status_code, 400)
        
        data = response.get_json()
        self.assertIn('error', data)
        self.assertIn('Missing required field', data['error'])

    def test_analyze_endpoint_no_data(self):
        """Test analyze endpoint with no data"""
        response = self.client.post('/analyze')
        self.assertEqual(response.status_code, 400)
        
        data = response.get_json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'No data provided')

    def test_dashboard_endpoint(self):
        """Test dashboard data endpoint"""
        response = self.client.get('/dashboard')
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertIn('summary', data)
        self.assertIn('trends', data)
        self.assertIn('demographics', data)

    def test_export_endpoint_json(self):
        """Test export endpoint with JSON format"""
        export_data = {
            "format": "json",
            "date_range": {"start": "2024-01-01", "end": "2024-01-31"}
        }
        
        response = self.client.post('/export', json=export_data)
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertIn('sessions', data)
        self.assertIn('metadata', data)

    def test_export_endpoint_csv(self):
        """Test export endpoint with CSV format"""
        export_data = {
            "format": "csv",
            "date_range": {"start": "2024-01-01", "end": "2024-01-31"}
        }
        
        response = self.client.post('/export', json=export_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'text/csv')

    def test_404_endpoint(self):
        """Test 404 error handling"""
        response = self.client.get('/nonexistent')
        self.assertEqual(response.status_code, 404)
        
        data = response.get_json()
        self.assertIn('error', data)
        self.assertEqual(data['error'], 'Endpoint not found')


# Helper class for async mocking
class AsyncMock(MagicMock):
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)


if __name__ == '__main__':
    # Set environment variables for testing
    os.environ["FLASK_SECRET_KEY"] = "test-flask-secret-key"
    os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
    os.environ["ENCRYPTION_PASSWORD"] = "test-encryption-password"
    os.environ["ENCRYPTION_SALT"] = "test-encryption-salt"
    os.environ["ENV"] = "development"
    
    unittest.main()
