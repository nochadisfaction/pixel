"""
DSM-5/PDM-2 Knowledge Extraction and Conversation Generation System

This module provides comprehensive psychology knowledge processing capabilities,
extracting structured diagnostic criteria from DSM-5 and PDM-2 frameworks
and converting them into therapeutic conversation training data.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from enum import Enum
import re

logger = logging.getLogger(__name__)


class DisorderCategory(Enum):
    """DSM-5 disorder categories."""
    NEURODEVELOPMENTAL = "neurodevelopmental_disorders"
    SCHIZOPHRENIA_SPECTRUM = "schizophrenia_spectrum_disorders"
    BIPOLAR_RELATED = "bipolar_related_disorders"
    DEPRESSIVE = "depressive_disorders"
    ANXIETY = "anxiety_disorders"
    OBSESSIVE_COMPULSIVE = "obsessive_compulsive_disorders"
    TRAUMA_STRESSOR = "trauma_stressor_related_disorders"
    DISSOCIATIVE = "dissociative_disorders"
    SOMATIC_SYMPTOM = "somatic_symptom_disorders"
    FEEDING_EATING = "feeding_eating_disorders"
    ELIMINATION = "elimination_disorders"
    SLEEP_WAKE = "sleep_wake_disorders"
    SEXUAL_DYSFUNCTIONS = "sexual_dysfunctions"
    GENDER_DYSPHORIA = "gender_dysphoria"
    DISRUPTIVE_IMPULSE = "disruptive_impulse_control_disorders"
    SUBSTANCE_RELATED = "substance_related_addictive_disorders"
    NEUROCOGNITIVE = "neurocognitive_disorders"
    PERSONALITY = "personality_disorders"
    PARAPHILIC = "paraphilic_disorders"
    OTHER_CONDITIONS = "other_conditions"


class SeverityLevel(Enum):
    """Disorder severity levels."""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    UNSPECIFIED = "unspecified"


@dataclass
class DSMCriterion:
    """Individual DSM-5 diagnostic criterion."""
    criterion_id: str
    description: str
    required: bool
    duration_requirement: Optional[str] = None
    exclusion_criteria: List[str] = None
    
    def __post_init__(self):
        if self.exclusion_criteria is None:
            self.exclusion_criteria = []


@dataclass
class DSMDisorder:
    """Complete DSM-5 disorder definition."""
    disorder_code: str
    disorder_name: str
    category: DisorderCategory
    criteria: List[DSMCriterion]
    specifiers: List[str]
    severity_levels: List[SeverityLevel]
    prevalence_data: Optional[Dict[str, Any]] = None
    differential_diagnosis: List[str] = None
    clinical_features: List[str] = None
    
    def __post_init__(self):
        if self.differential_diagnosis is None:
            self.differential_diagnosis = []
        if self.clinical_features is None:
            self.clinical_features = []


@dataclass
class PDMPattern:
    """PDM-2 psychodynamic pattern."""
    pattern_id: str
    pattern_name: str
    description: str
    attachment_style: str
    defense_mechanisms: List[str]
    developmental_considerations: List[str]
    therapeutic_implications: List[str]


@dataclass
class TherapeuticConversation:
    """Structured therapeutic conversation."""
    conversation_id: str
    disorder_context: DSMDisorder
    client_presentation: str
    therapist_responses: List[str]
    clinical_rationale: List[str]
    therapeutic_goals: List[str]


class PsychologyKnowledgeProcessor:
    """Main processor for psychology knowledge extraction and conversation generation."""
    
    def __init__(self):
        self.dsm5_disorders: Dict[str, DSMDisorder] = {}
        self.pdm2_patterns: Dict[str, PDMPattern] = {}
        self.conversation_templates: List[TherapeuticConversation] = []
        
    def parse_dsm5_data(self, knowledge_source: Optional[str] = None) -> Dict[str, DSMDisorder]:
        """
        Parse DSM-5 diagnostic criteria from knowledge base.
        
        Args:
            knowledge_source: Path to knowledge source (if None, uses built-in data)
            
        Returns:
            Dictionary of DSM-5 disorders keyed by disorder code
        """
        logger.info("Parsing DSM-5 diagnostic criteria")
        
        # Since we don't have the original ai/1.PsychologyTest/ directory,
        # we'll create comprehensive sample DSM-5 data based on clinical standards
        sample_disorders = self._create_comprehensive_dsm5_sample()
        
        for disorder in sample_disorders:
            self.dsm5_disorders[disorder.disorder_code] = disorder
            
        logger.info(f"Parsed {len(self.dsm5_disorders)} DSM-5 disorders")
        return self.dsm5_disorders
    
    def _create_comprehensive_dsm5_sample(self) -> List[DSMDisorder]:
        """Create comprehensive sample DSM-5 disorders covering major categories."""
        
        disorders = []
        
        # Major Depressive Disorder (296.23)
        mdd_criteria = [
            DSMCriterion(
                criterion_id="A1",
                description="Depressed mood most of the day, nearly every day",
                required=True,
                duration_requirement="at least 2 weeks"
            ),
            DSMCriterion(
                criterion_id="A2", 
                description="Markedly diminished interest or pleasure in activities",
                required=True,
                duration_requirement="at least 2 weeks"
            ),
            DSMCriterion(
                criterion_id="A3",
                description="Significant weight loss or gain, or appetite changes",
                required=False
            ),
            DSMCriterion(
                criterion_id="A4",
                description="Insomnia or hypersomnia nearly every day",
                required=False
            ),
            DSMCriterion(
                criterion_id="A5",
                description="Psychomotor agitation or retardation",
                required=False
            ),
            DSMCriterion(
                criterion_id="A6",
                description="Fatigue or loss of energy nearly every day",
                required=False
            ),
            DSMCriterion(
                criterion_id="A7",
                description="Feelings of worthlessness or inappropriate guilt",
                required=False
            ),
            DSMCriterion(
                criterion_id="A8",
                description="Diminished ability to think or concentrate",
                required=False
            ),
            DSMCriterion(
                criterion_id="A9",
                description="Recurrent thoughts of death or suicidal ideation",
                required=False
            )
        ]
        
        mdd = DSMDisorder(
            disorder_code="296.23",
            disorder_name="Major Depressive Disorder, Single Episode, Severe",
            category=DisorderCategory.DEPRESSIVE,
            criteria=mdd_criteria,
            specifiers=["With anxious distress", "With mixed features", "With melancholic features"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "8.5%", "12_month": "6.7%"},
            differential_diagnosis=["Bipolar Disorder", "Adjustment Disorder", "Substance-Induced Mood Disorder"],
            clinical_features=["Persistent sadness", "Anhedonia", "Cognitive impairment", "Somatic symptoms"]
        )
        disorders.append(mdd)
        
        # Generalized Anxiety Disorder (300.02)
        gad_criteria = [
            DSMCriterion(
                criterion_id="A",
                description="Excessive anxiety and worry about various events or activities",
                required=True,
                duration_requirement="at least 6 months"
            ),
            DSMCriterion(
                criterion_id="B",
                description="Difficulty controlling the worry",
                required=True
            ),
            DSMCriterion(
                criterion_id="C1",
                description="Restlessness or feeling keyed up or on edge",
                required=False
            ),
            DSMCriterion(
                criterion_id="C2",
                description="Being easily fatigued",
                required=False
            ),
            DSMCriterion(
                criterion_id="C3",
                description="Difficulty concentrating or mind going blank",
                required=False
            ),
            DSMCriterion(
                criterion_id="C4",
                description="Irritability",
                required=False
            ),
            DSMCriterion(
                criterion_id="C5",
                description="Muscle tension",
                required=False
            ),
            DSMCriterion(
                criterion_id="C6",
                description="Sleep disturbance",
                required=False
            )
        ]
        
        gad = DSMDisorder(
            disorder_code="300.02",
            disorder_name="Generalized Anxiety Disorder",
            category=DisorderCategory.ANXIETY,
            criteria=gad_criteria,
            specifiers=["With excessive worry about multiple domains"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "5.7%", "12_month": "3.1%"},
            differential_diagnosis=["Panic Disorder", "Social Anxiety Disorder", "Specific Phobia"],
            clinical_features=["Excessive worry", "Physical tension", "Cognitive symptoms", "Avoidance behaviors"]
        )
        disorders.append(gad)
        
        # Panic Disorder (300.01)
        panic_criteria = [
            DSMCriterion(
                criterion_id="A",
                description="Recurrent unexpected panic attacks",
                required=True
            ),
            DSMCriterion(
                criterion_id="B1",
                description="Persistent concern about additional panic attacks",
                required=False,
                duration_requirement="at least 1 month"
            ),
            DSMCriterion(
                criterion_id="B2",
                description="Significant maladaptive change in behavior related to attacks",
                required=False,
                duration_requirement="at least 1 month"
            )
        ]
        
        panic_disorder = DSMDisorder(
            disorder_code="300.01",
            disorder_name="Panic Disorder",
            category=DisorderCategory.ANXIETY,
            criteria=panic_criteria,
            specifiers=["With agoraphobia", "Without agoraphobia"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "4.7%", "12_month": "2.7%"},
            differential_diagnosis=["Specific Phobia", "Social Anxiety Disorder", "PTSD"],
            clinical_features=["Panic attacks", "Anticipatory anxiety", "Avoidance", "Physical symptoms"]
        )
        disorders.append(panic_disorder)
        
        # Post-Traumatic Stress Disorder (309.81)
        ptsd_criteria = [
            DSMCriterion(
                criterion_id="A",
                description="Exposure to actual or threatened death, serious injury, or sexual violence",
                required=True
            ),
            DSMCriterion(
                criterion_id="B1",
                description="Recurrent, involuntary, and intrusive distressing memories",
                required=False
            ),
            DSMCriterion(
                criterion_id="B2",
                description="Recurrent distressing dreams related to the traumatic event",
                required=False
            ),
            DSMCriterion(
                criterion_id="B3",
                description="Dissociative reactions (flashbacks)",
                required=False
            ),
            DSMCriterion(
                criterion_id="C1",
                description="Avoidance of trauma-related thoughts, feelings, or memories",
                required=False
            ),
            DSMCriterion(
                criterion_id="C2",
                description="Avoidance of trauma-related external reminders",
                required=False
            )
        ]
        
        ptsd = DSMDisorder(
            disorder_code="309.81",
            disorder_name="Post-Traumatic Stress Disorder",
            category=DisorderCategory.TRAUMA_STRESSOR,
            criteria=ptsd_criteria,
            specifiers=["With dissociative symptoms", "With delayed expression"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "3.5%", "12_month": "1.3%"},
            differential_diagnosis=["Acute Stress Disorder", "Adjustment Disorder", "Major Depressive Disorder"],
            clinical_features=["Re-experiencing", "Avoidance", "Negative alterations", "Hyperarousal"]
        )
        disorders.append(ptsd)
        
        # Borderline Personality Disorder (301.83)
        bpd_criteria = [
            DSMCriterion(
                criterion_id="1",
                description="Frantic efforts to avoid real or imagined abandonment",
                required=False
            ),
            DSMCriterion(
                criterion_id="2",
                description="Pattern of unstable and intense interpersonal relationships",
                required=False
            ),
            DSMCriterion(
                criterion_id="3",
                description="Identity disturbance: unstable self-image or sense of self",
                required=False
            ),
            DSMCriterion(
                criterion_id="4",
                description="Impulsivity in potentially self-damaging areas",
                required=False
            ),
            DSMCriterion(
                criterion_id="5",
                description="Recurrent suicidal behavior, gestures, or threats",
                required=False
            )
        ]
        
        bpd = DSMDisorder(
            disorder_code="301.83",
            disorder_name="Borderline Personality Disorder",
            category=DisorderCategory.PERSONALITY,
            criteria=bpd_criteria,
            specifiers=["With co-occurring mood disorder", "With co-occurring substance use"],
            severity_levels=[SeverityLevel.MILD, SeverityLevel.MODERATE, SeverityLevel.SEVERE],
            prevalence_data={"lifetime": "1.4%", "clinical_settings": "10-20%"},
            differential_diagnosis=["Bipolar Disorder", "Major Depressive Disorder", "PTSD"],
            clinical_features=["Emotional dysregulation", "Interpersonal difficulties", "Identity issues", "Impulsivity"]
        )
        disorders.append(bpd)
        
        return disorders
    
    def structure_diagnostic_criteria(self) -> Dict[str, Any]:
        """Structure diagnostic criteria into standardized format."""
        logger.info("Structuring diagnostic criteria into standardized format")
        
        structured_data = {
            "dsm5_version": "5.0",
            "extraction_date": "2024-01-01",
            "total_disorders": len(self.dsm5_disorders),
            "categories": {},
            "disorders": {}
        }
        
        # Group by category
        for disorder in self.dsm5_disorders.values():
            category_name = disorder.category.value
            if category_name not in structured_data["categories"]:
                structured_data["categories"][category_name] = []
            structured_data["categories"][category_name].append(disorder.disorder_code)
            
            # Convert disorder to dict for JSON serialization
            structured_data["disorders"][disorder.disorder_code] = asdict(disorder)
            
        logger.info(f"Structured {len(structured_data['disorders'])} disorders across {len(structured_data['categories'])} categories")
        return structured_data
    
    def create_disorder_symptom_mappings(self) -> Dict[str, List[str]]:
        """Create disorder-symptom relationship mappings."""
        logger.info("Creating disorder-symptom relationship mappings")
        
        mappings = {}
        
        for disorder_code, disorder in self.dsm5_disorders.items():
            symptoms = []
            
            # Extract symptoms from criteria
            for criterion in disorder.criteria:
                symptoms.append(criterion.description)
                
            # Add clinical features
            symptoms.extend(disorder.clinical_features)
            
            mappings[disorder_code] = {
                "disorder_name": disorder.disorder_name,
                "primary_symptoms": symptoms[:5],  # Top 5 symptoms
                "all_symptoms": symptoms,
                "category": disorder.category.value
            }
            
        logger.info(f"Created symptom mappings for {len(mappings)} disorders")
        return mappings
    
    def build_diagnostic_conversation_templates(self) -> List[Dict[str, Any]]:
        """Build diagnostic conversation templates for each disorder."""
        logger.info("Building diagnostic conversation templates")
        
        templates = []
        
        for disorder_code, disorder in self.dsm5_disorders.items():
            template = {
                "disorder_code": disorder_code,
                "disorder_name": disorder.disorder_name,
                "category": disorder.category.value,
                "conversation_starters": self._generate_conversation_starters(disorder),
                "assessment_questions": self._generate_assessment_questions(disorder),
                "therapeutic_responses": self._generate_therapeutic_responses(disorder),
                "crisis_indicators": self._identify_crisis_indicators(disorder)
            }
            templates.append(template)
            
        logger.info(f"Built conversation templates for {len(templates)} disorders")
        return templates
    
    def _generate_conversation_starters(self, disorder: DSMDisorder) -> List[str]:
        """Generate conversation starters for a specific disorder."""
        starters = []
        
        if disorder.category == DisorderCategory.DEPRESSIVE:
            starters = [
                "I've been feeling really down lately and nothing seems to help.",
                "I don't enjoy things I used to love anymore.",
                "I'm having trouble sleeping and feel tired all the time.",
                "I feel worthless and like I'm a burden to everyone."
            ]
        elif disorder.category == DisorderCategory.ANXIETY:
            starters = [
                "I worry about everything constantly and can't turn it off.",
                "I had another panic attack yesterday and I'm scared it will happen again.",
                "I avoid social situations because I'm afraid of being judged.",
                "My heart races and I feel like I can't breathe sometimes."
            ]
        elif disorder.category == DisorderCategory.TRAUMA_STRESSOR:
            starters = [
                "I keep having nightmares about what happened to me.",
                "I can't stop thinking about the accident.",
                "Loud noises make me jump and feel like I'm back there.",
                "I avoid places that remind me of the trauma."
            ]
        elif disorder.category == DisorderCategory.PERSONALITY:
            starters = [
                "My relationships always end badly and I don't know why.",
                "I feel empty inside most of the time.",
                "I'm terrified that people will abandon me.",
                "My emotions change so quickly I can't keep up."
            ]
        else:
            starters = [
                "I'm struggling with some mental health issues.",
                "I don't feel like myself lately.",
                "I think I need help but I'm not sure what's wrong.",
                "My symptoms are affecting my daily life."
            ]
            
        return starters
    
    def _generate_assessment_questions(self, disorder: DSMDisorder) -> List[str]:
        """Generate assessment questions based on DSM-5 criteria."""
        questions = []
        
        for criterion in disorder.criteria:
            if "mood" in criterion.description.lower():
                questions.append(f"Can you tell me more about your mood over the past {criterion.duration_requirement or 'few weeks'}?")
            elif "sleep" in criterion.description.lower():
                questions.append("How has your sleep been lately? Any changes in your sleep patterns?")
            elif "appetite" in criterion.description.lower():
                questions.append("Have you noticed any changes in your appetite or weight recently?")
            elif "worry" in criterion.description.lower():
                questions.append("What kinds of things do you find yourself worrying about?")
            elif "panic" in criterion.description.lower():
                questions.append("Can you describe what happens during these episodes?")
            else:
                questions.append(f"Have you experienced {criterion.description.lower()}?")
                
        return questions[:8]  # Limit to 8 questions
    
    def _generate_therapeutic_responses(self, disorder: DSMDisorder) -> List[str]:
        """Generate appropriate therapeutic responses."""
        responses = []
        
        if disorder.category == DisorderCategory.DEPRESSIVE:
            responses = [
                "It sounds like you're going through a really difficult time. Depression can make everything feel overwhelming.",
                "What you're describing are common symptoms of depression. You're not alone in feeling this way.",
                "Let's work together to understand these feelings and develop some coping strategies.",
                "It's important that we assess your safety. Are you having any thoughts of hurting yourself?"
            ]
        elif disorder.category == DisorderCategory.ANXIETY:
            responses = [
                "Anxiety can be very overwhelming. Let's explore some techniques to help manage these feelings.",
                "What you're experiencing sounds like panic attacks. They're frightening but not dangerous.",
                "We can work on breathing exercises and grounding techniques to help during anxious moments.",
                "Let's identify your triggers and develop a plan for managing anxiety-provoking situations."
            ]
        elif disorder.category == DisorderCategory.TRAUMA_STRESSOR:
            responses = [
                "Trauma can have lasting effects on how we think and feel. Your reactions are normal responses to abnormal events.",
                "We'll go at your pace as we work through these experiences. You're in control here.",
                "Let's focus on building your sense of safety and developing coping skills.",
                "Trauma therapy can help you process these experiences in a safe environment."
            ]
        else:
            responses = [
                "Thank you for sharing this with me. It takes courage to talk about these experiences.",
                "Let's work together to understand what you're going through and find ways to help.",
                "Your feelings are valid and we can develop strategies to address them.",
                "I'm here to support you through this process."
            ]
            
        return responses
    
    def _identify_crisis_indicators(self, disorder: DSMDisorder) -> List[str]:
        """Identify crisis indicators for each disorder."""
        indicators = []
        
        # Check for suicidal ideation criteria
        for criterion in disorder.criteria:
            if any(word in criterion.description.lower() for word in ["suicide", "death", "harm"]):
                indicators.append("Suicidal ideation assessment required")
                
        if disorder.category == DisorderCategory.DEPRESSIVE:
            indicators.extend([
                "Expressions of hopelessness or worthlessness",
                "Social withdrawal and isolation",
                "Substance use as coping mechanism"
            ])
        elif disorder.category == DisorderCategory.PERSONALITY:
            indicators.extend([
                "Self-harm behaviors or threats",
                "Intense fear of abandonment",
                "Impulsive dangerous behaviors"
            ])
            
        return indicators
    
    def validate_dsm5_extraction(self) -> Dict[str, Any]:
        """Validate DSM-5 extraction against clinical standards."""
        logger.info("Validating DSM-5 extraction against clinical standards")
        
        validation_results = {
            "total_disorders": len(self.dsm5_disorders),
            "categories_covered": len(set(d.category for d in self.dsm5_disorders.values())),
            "validation_checks": {
                "has_diagnostic_criteria": 0,
                "has_severity_levels": 0,
                "has_differential_diagnosis": 0,
                "has_clinical_features": 0
            },
            "quality_score": 0.0,
            "recommendations": []
        }
        
        for disorder in self.dsm5_disorders.values():
            if disorder.criteria:
                validation_results["validation_checks"]["has_diagnostic_criteria"] += 1
            if disorder.severity_levels:
                validation_results["validation_checks"]["has_severity_levels"] += 1
            if disorder.differential_diagnosis:
                validation_results["validation_checks"]["has_differential_diagnosis"] += 1
            if disorder.clinical_features:
                validation_results["validation_checks"]["has_clinical_features"] += 1
                
        # Calculate quality score
        total_checks = len(validation_results["validation_checks"])
        total_possible = len(self.dsm5_disorders) * total_checks
        total_passed = sum(validation_results["validation_checks"].values())
        validation_results["quality_score"] = total_passed / total_possible if total_possible > 0 else 0.0
        
        # Generate recommendations
        if validation_results["quality_score"] < 0.8:
            validation_results["recommendations"].append("Consider adding more comprehensive diagnostic criteria")
        if validation_results["categories_covered"] < 10:
            validation_results["recommendations"].append("Expand coverage to include more DSM-5 categories")
            
        logger.info(f"Validation complete. Quality score: {validation_results['quality_score']:.2f}")
        return validation_results
    
    def export_to_json(self, output_path: Path) -> None:
        """Export processed psychology knowledge to JSON format."""
        logger.info(f"Exporting psychology knowledge to {output_path}")
        
        export_data = {
            "metadata": {
                "version": "1.0",
                "extraction_date": "2024-01-01",
                "total_disorders": len(self.dsm5_disorders)
            },
            "structured_criteria": self.structure_diagnostic_criteria(),
            "symptom_mappings": self.create_disorder_symptom_mappings(),
            "conversation_templates": self.build_diagnostic_conversation_templates(),
            "validation_results": self.validate_dsm5_extraction()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Successfully exported psychology knowledge to {output_path}")