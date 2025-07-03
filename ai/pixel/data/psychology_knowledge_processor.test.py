"""
Unit tests for psychology knowledge integration system.

Tests DSM-5/PDM-2 knowledge extraction, structuring, and conversation generation
to ensure clinical accuracy and comprehensive coverage.
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from ai.pixel.data.psychology_knowledge_processor import (
    PsychologyKnowledgeProcessor,
    DSMDisorder,
    DSMCriterion,
    DisorderCategory,
    SeverityLevel,
    PDMPattern,
    TherapeuticConversation
)


class TestPsychologyKnowledgeProcessor:
    """Test suite for PsychologyKnowledgeProcessor."""
    
    @pytest.fixture
    def processor(self):
        """Create a PsychologyKnowledgeProcessor instance for testing."""
        return PsychologyKnowledgeProcessor()
    
    @pytest.fixture
    def sample_dsm_disorder(self):
        """Create a sample DSM disorder for testing."""
        criteria = [
            DSMCriterion(
                criterion_id="A1",
                description="Depressed mood most of the day",
                required=True,
                duration_requirement="at least 2 weeks"
            ),
            DSMCriterion(
                criterion_id="A2",
                description="Diminished interest in activities",
                required=True,
                duration_requirement="at least 2 weeks"
            )
        ]
        
        return DSMDisorder(
            disorder_code="296.23",
            disorder_name="Major Depressive Disorder",
            category=DisorderCategory.DEPRESSIVE,
            criteria=criteria,
            specifiers=["With anxious distress"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "8.5%"},
            differential_diagnosis=["Bipolar Disorder"],
            clinical_features=["Persistent sadness", "Anhedonia"]
        )
    
    def test_initialization(self, processor):
        """Test processor initialization."""
        assert isinstance(processor.dsm5_disorders, dict)
        assert isinstance(processor.pdm2_patterns, dict)
        assert isinstance(processor.conversation_templates, list)
        assert len(processor.dsm5_disorders) == 0
        assert len(processor.pdm2_patterns) == 0
        assert len(processor.conversation_templates) == 0
    
    def test_parse_dsm5_data(self, processor):
        """Test DSM-5 data parsing functionality."""
        disorders = processor.parse_dsm5_data()
        
        # Should return a dictionary of disorders
        assert isinstance(disorders, dict)
        assert len(disorders) > 0
        
        # Check that disorders are properly structured
        for disorder_code, disorder in disorders.items():
            assert isinstance(disorder, DSMDisorder)
            assert disorder.disorder_code == disorder_code
            assert isinstance(disorder.category, DisorderCategory)
            assert isinstance(disorder.criteria, list)
            assert len(disorder.criteria) > 0
            
        # Verify specific disorders are included
        disorder_codes = list(disorders.keys())
        assert "296.23" in disorder_codes  # Major Depressive Disorder
        assert "300.02" in disorder_codes  # Generalized Anxiety Disorder
        assert "300.01" in disorder_codes  # Panic Disorder
        assert "309.81" in disorder_codes  # PTSD
        assert "301.83" in disorder_codes  # Borderline Personality Disorder
    
    def test_comprehensive_dsm5_sample_creation(self, processor):
        """Test creation of comprehensive DSM-5 sample data."""
        disorders = processor._create_comprehensive_dsm5_sample()
        
        assert isinstance(disorders, list)
        assert len(disorders) >= 5  # Should have at least 5 major disorders
        
        # Check category coverage
        categories = set(disorder.category for disorder in disorders)
        expected_categories = {
            DisorderCategory.DEPRESSIVE,
            DisorderCategory.ANXIETY,
            DisorderCategory.TRAUMA_STRESSOR,
            DisorderCategory.PERSONALITY
        }
        assert expected_categories.issubset(categories)
        
        # Verify each disorder has required components
        for disorder in disorders:
            assert disorder.disorder_code
            assert disorder.disorder_name
            assert isinstance(disorder.category, DisorderCategory)
            assert len(disorder.criteria) > 0
            assert len(disorder.severity_levels) > 0
            
            # Check criteria structure
            for criterion in disorder.criteria:
                assert isinstance(criterion, DSMCriterion)
                assert criterion.criterion_id
                assert criterion.description
                assert isinstance(criterion.required, bool)
    
    def test_structure_diagnostic_criteria(self, processor, sample_dsm_disorder):
        """Test structuring of diagnostic criteria."""
        processor.dsm5_disorders[sample_dsm_disorder.disorder_code] = sample_dsm_disorder
        
        structured_data = processor.structure_diagnostic_criteria()
        
        assert isinstance(structured_data, dict)
        assert "dsm5_version" in structured_data
        assert "total_disorders" in structured_data
        assert "categories" in structured_data
        assert "disorders" in structured_data
        
        assert structured_data["total_disorders"] == 1
        assert sample_dsm_disorder.disorder_code in structured_data["disorders"]
        
        # Check category grouping
        category_name = sample_dsm_disorder.category.value
        assert category_name in structured_data["categories"]
        assert sample_dsm_disorder.disorder_code in structured_data["categories"][category_name]
    
    def test_create_disorder_symptom_mappings(self, processor, sample_dsm_disorder):
        """Test creation of disorder-symptom relationship mappings."""
        processor.dsm5_disorders[sample_dsm_disorder.disorder_code] = sample_dsm_disorder
        
        mappings = processor.create_disorder_symptom_mappings()
        
        assert isinstance(mappings, dict)
        assert sample_dsm_disorder.disorder_code in mappings
        
        mapping = mappings[sample_dsm_disorder.disorder_code]
        assert "disorder_name" in mapping
        assert "primary_symptoms" in mapping
        assert "all_symptoms" in mapping
        assert "category" in mapping
        
        assert mapping["disorder_name"] == sample_dsm_disorder.disorder_name
        assert mapping["category"] == sample_dsm_disorder.category.value
        assert isinstance(mapping["primary_symptoms"], list)
        assert isinstance(mapping["all_symptoms"], list)
        assert len(mapping["primary_symptoms"]) <= 5
    
    def test_build_diagnostic_conversation_templates(self, processor, sample_dsm_disorder):
        """Test building of diagnostic conversation templates."""
        processor.dsm5_disorders[sample_dsm_disorder.disorder_code] = sample_dsm_disorder
        
        templates = processor.build_diagnostic_conversation_templates()
        
        assert isinstance(templates, list)
        assert len(templates) == 1
        
        template = templates[0]
        assert template["disorder_code"] == sample_dsm_disorder.disorder_code
        assert template["disorder_name"] == sample_dsm_disorder.disorder_name
        assert template["category"] == sample_dsm_disorder.category.value
        
        # Check required template components
        assert "conversation_starters" in template
        assert "assessment_questions" in template
        assert "therapeutic_responses" in template
        assert "crisis_indicators" in template
        
        assert isinstance(template["conversation_starters"], list)
        assert isinstance(template["assessment_questions"], list)
        assert isinstance(template["therapeutic_responses"], list)
        assert isinstance(template["crisis_indicators"], list)
    
    def test_generate_conversation_starters(self, processor, sample_dsm_disorder):
        """Test generation of conversation starters."""
        starters = processor._generate_conversation_starters(sample_dsm_disorder)
        
        assert isinstance(starters, list)
        assert len(starters) > 0
        
        # Should contain depression-specific starters
        starter_text = " ".join(starters).lower()
        assert any(word in starter_text for word in ["down", "depressed", "sad", "tired"])
    
    def test_generate_assessment_questions(self, processor, sample_dsm_disorder):
        """Test generation of assessment questions."""
        questions = processor._generate_assessment_questions(sample_dsm_disorder)
        
        assert isinstance(questions, list)
        assert len(questions) > 0
        assert len(questions) <= 8  # Should limit to 8 questions
        
        # Questions should be relevant to the disorder criteria
        for question in questions:
            assert isinstance(question, str)
            assert len(question) > 0
            assert question.endswith("?")
    
    def test_generate_therapeutic_responses(self, processor, sample_dsm_disorder):
        """Test generation of therapeutic responses."""
        responses = processor._generate_therapeutic_responses(sample_dsm_disorder)
        
        assert isinstance(responses, list)
        assert len(responses) > 0
        
        # Should contain appropriate therapeutic language
        response_text = " ".join(responses).lower()
        assert any(word in response_text for word in ["depression", "difficult", "support", "together"])
    
    def test_identify_crisis_indicators(self, processor):
        """Test identification of crisis indicators."""
        # Create disorder with suicidal ideation criterion
        criteria = [
            DSMCriterion(
                criterion_id="A9",
                description="Recurrent thoughts of death or suicidal ideation",
                required=False
            )
        ]
        
        disorder = DSMDisorder(
            disorder_code="296.23",
            disorder_name="Major Depressive Disorder",
            category=DisorderCategory.DEPRESSIVE,
            criteria=criteria,
            specifiers=[],
            severity_levels=[SeverityLevel.SEVERE]
        )
        
        indicators = processor._identify_crisis_indicators(disorder)
        
        assert isinstance(indicators, list)
        assert len(indicators) > 0
        
        # Should identify suicidal ideation
        indicator_text = " ".join(indicators).lower()
        assert "suicidal" in indicator_text
    
    def test_validate_dsm5_extraction(self, processor, sample_dsm_disorder):
        """Test validation of DSM-5 extraction."""
        processor.dsm5_disorders[sample_dsm_disorder.disorder_code] = sample_dsm_disorder
        
        validation_results = processor.validate_dsm5_extraction()
        
        assert isinstance(validation_results, dict)
        assert "total_disorders" in validation_results
        assert "categories_covered" in validation_results
        assert "validation_checks" in validation_results
        assert "quality_score" in validation_results
        assert "recommendations" in validation_results
        
        assert validation_results["total_disorders"] == 1
        assert validation_results["categories_covered"] == 1
        assert isinstance(validation_results["quality_score"], float)
        assert 0.0 <= validation_results["quality_score"] <= 1.0
        assert isinstance(validation_results["recommendations"], list)
        
        # Check validation checks
        checks = validation_results["validation_checks"]
        assert "has_diagnostic_criteria" in checks
        assert "has_severity_levels" in checks
        assert "has_differential_diagnosis" in checks
        assert "has_clinical_features" in checks
    
    def test_export_to_json(self, processor, sample_dsm_disorder):
        """Test export of psychology knowledge to JSON."""
        processor.dsm5_disorders[sample_dsm_disorder.disorder_code] = sample_dsm_disorder
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
        
        try:
            processor.export_to_json(tmp_path)
            
            # Verify file was created and contains valid JSON
            assert tmp_path.exists()
            
            with open(tmp_path, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            assert isinstance(exported_data, dict)
            assert "metadata" in exported_data
            assert "structured_criteria" in exported_data
            assert "symptom_mappings" in exported_data
            assert "conversation_templates" in exported_data
            assert "validation_results" in exported_data
            
            # Check metadata
            metadata = exported_data["metadata"]
            assert metadata["total_disorders"] == 1
            assert "version" in metadata
            assert "extraction_date" in metadata
            
        finally:
            if tmp_path.exists():
                tmp_path.unlink()
    
    def test_full_processing_pipeline(self, processor):
        """Test the complete processing pipeline."""
        # Parse DSM-5 data
        disorders = processor.parse_dsm5_data()
        assert len(disorders) > 0
        
        # Structure criteria
        structured_data = processor.structure_diagnostic_criteria()
        assert structured_data["total_disorders"] == len(disorders)
        
        # Create symptom mappings
        mappings = processor.create_disorder_symptom_mappings()
        assert len(mappings) == len(disorders)
        
        # Build conversation templates
        templates = processor.build_diagnostic_conversation_templates()
        assert len(templates) == len(disorders)
        
        # Validate extraction
        validation = processor.validate_dsm5_extraction()
        assert validation["total_disorders"] == len(disorders)
        assert validation["quality_score"] > 0.0
    
    def test_disorder_category_coverage(self, processor):
        """Test that major DSM-5 categories are covered."""
        processor.parse_dsm5_data()
        
        categories = set(disorder.category for disorder in processor.dsm5_disorders.values())
        
        # Should cover major categories
        expected_categories = {
            DisorderCategory.DEPRESSIVE,
            DisorderCategory.ANXIETY,
            DisorderCategory.TRAUMA_STRESSOR,
            DisorderCategory.PERSONALITY
        }
        
        assert expected_categories.issubset(categories)
    
    def test_clinical_accuracy_validation(self, processor):
        """Test clinical accuracy of generated content."""
        processor.parse_dsm5_data()
        
        # Check that all disorders have proper clinical structure
        for disorder in processor.dsm5_disorders.values():
            # Must have diagnostic criteria
            assert len(disorder.criteria) > 0
            
            # Must have severity levels
            assert len(disorder.severity_levels) > 0
            
            # Must have valid disorder code format
            assert disorder.disorder_code
            assert "." in disorder.disorder_code or disorder.disorder_code.isdigit()
            
            # Must have clinical features
            assert len(disorder.clinical_features) > 0
            
            # Criteria must have proper structure
            for criterion in disorder.criteria:
                assert criterion.criterion_id
                assert criterion.description
                assert isinstance(criterion.required, bool)
    
    def test_conversation_template_quality(self, processor):
        """Test quality of generated conversation templates."""
        processor.parse_dsm5_data()
        templates = processor.build_diagnostic_conversation_templates()
        
        for template in templates:
            # Must have all required components
            assert len(template["conversation_starters"]) > 0
            assert len(template["assessment_questions"]) > 0
            assert len(template["therapeutic_responses"]) > 0
            
            # Conversation starters should be realistic
            for starter in template["conversation_starters"]:
                assert len(starter) > 10  # Reasonable length
                assert starter[0].isupper()  # Proper capitalization
                
            # Assessment questions should be questions
            for question in template["assessment_questions"]:
                assert "?" in question
                
            # Therapeutic responses should be supportive
            for response in template["therapeutic_responses"]:
                assert len(response) > 10
                # Should contain supportive language
                response_lower = response.lower()
                supportive_words = ["help", "support", "understand", "work", "together", "feel"]
                assert any(word in response_lower for word in supportive_words)


if __name__ == "__main__":
    pytest.main([__file__])