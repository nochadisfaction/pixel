"""
Disorder-Symptom Relationship Mapping System

Creates comprehensive mappings between DSM-5 disorders and their associated symptoms,
including severity relationships, co-occurrence patterns, and clinical correlations.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Set, Tuple
from pathlib import Path
from enum import Enum
import re
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)


class SymptomSeverity(Enum):
    """Symptom severity levels."""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"


class SymptomFrequency(Enum):
    """Symptom frequency patterns."""
    RARE = "rare"
    OCCASIONAL = "occasional"
    FREQUENT = "frequent"
    PERSISTENT = "persistent"


class RelationshipType(Enum):
    """Types of disorder-symptom relationships."""
    CORE = "core_symptom"
    ASSOCIATED = "associated_symptom"
    SPECIFIER = "specifier_symptom"
    EXCLUSION = "exclusion_symptom"
    DIFFERENTIAL = "differential_symptom"


@dataclass
class SymptomProfile:
    """Comprehensive symptom profile."""
    symptom_id: str
    symptom_name: str
    description: str
    severity_range: List[SymptomSeverity]
    frequency_pattern: SymptomFrequency
    clinical_indicators: List[str]
    assessment_questions: List[str]
    related_symptoms: List[str] = None
    
    def __post_init__(self):
        if self.related_symptoms is None:
            self.related_symptoms = []


@dataclass
class DisorderSymptomMapping:
    """Mapping between disorder and symptoms."""
    disorder_code: str
    disorder_name: str
    symptom_relationships: Dict[str, RelationshipType]
    symptom_weights: Dict[str, float]
    symptom_clusters: Dict[str, List[str]]
    diagnostic_combinations: List[List[str]]
    severity_correlations: Dict[str, Dict[str, float]]


@dataclass
class SymptomCooccurrence:
    """Symptom co-occurrence patterns."""
    symptom_pair: Tuple[str, str]
    cooccurrence_rate: float
    clinical_significance: str
    disorders_involved: List[str]


class DisorderSymptomMapper:
    """Creates comprehensive disorder-symptom relationship mappings."""
    
    def __init__(self):
        self.symptom_profiles: Dict[str, SymptomProfile] = {}
        self.disorder_mappings: Dict[str, DisorderSymptomMapping] = {}
        self.symptom_cooccurrences: List[SymptomCooccurrence] = []
        self.symptom_vocabulary = self._build_symptom_vocabulary()
        
    def create_disorder_symptom_mappings(self, disorders: Dict[str, Any]) -> Dict[str, DisorderSymptomMapping]:
        """Create comprehensive disorder-symptom mappings."""
        logger.info(f"Creating disorder-symptom mappings for {len(disorders)} disorders")
        
        # First pass: extract all symptoms and create profiles
        all_symptoms = self._extract_all_symptoms(disorders)
        self._create_symptom_profiles(all_symptoms)
        
        # Second pass: create disorder mappings
        for disorder_code, disorder_data in disorders.items():
            mapping = self._create_single_disorder_mapping(disorder_code, disorder_data)
            self.disorder_mappings[disorder_code] = mapping
            
        # Third pass: analyze co-occurrence patterns
        self._analyze_symptom_cooccurrence()
        
        logger.info(f"Created mappings for {len(self.disorder_mappings)} disorders with {len(self.symptom_profiles)} unique symptoms")
        return self.disorder_mappings
    
    def _extract_all_symptoms(self, disorders: Dict[str, Any]) -> Set[str]:
        """Extract all unique symptoms from disorders."""
        all_symptoms = set()
        
        for disorder_data in disorders.values():
            criteria = getattr(disorder_data, 'criteria', [])
            for criterion in criteria:
                description = getattr(criterion, 'description', '')
                symptoms = self._parse_symptoms_from_text(description)
                all_symptoms.update(symptoms)
                
            # Also extract from clinical features
            clinical_features = getattr(disorder_data, 'clinical_features', [])
            for feature in clinical_features:
                symptoms = self._parse_symptoms_from_text(feature)
                all_symptoms.update(symptoms)
                
        return all_symptoms
    
    def _parse_symptoms_from_text(self, text: str) -> List[str]:
        """Parse individual symptoms from descriptive text."""
        symptoms = []
        
        # Common symptom patterns
        symptom_patterns = [
            r'depressed mood',
            r'diminished interest',
            r'weight loss',
            r'weight gain',
            r'appetite changes',
            r'insomnia',
            r'hypersomnia',
            r'psychomotor agitation',
            r'psychomotor retardation',
            r'fatigue',
            r'loss of energy',
            r'feelings of worthlessness',
            r'inappropriate guilt',
            r'diminished ability to think',
            r'difficulty concentrating',
            r'indecisiveness',
            r'recurrent thoughts of death',
            r'suicidal ideation',
            r'excessive anxiety',
            r'excessive worry',
            r'restlessness',
            r'being easily fatigued',
            r'difficulty concentrating',
            r'irritability',
            r'muscle tension',
            r'sleep disturbance',
            r'panic attacks',
            r'persistent concern',
            r'maladaptive change in behavior',
            r'intrusive memories',
            r'distressing dreams',
            r'flashbacks',
            r'avoidance',
            r'negative alterations in mood',
            r'hyperarousal',
            r'emotional dysregulation',
            r'interpersonal difficulties',
            r'identity disturbance',
            r'impulsivity',
            r'fear of abandonment'
        ]
        
        text_lower = text.lower()
        for pattern in symptom_patterns:
            if re.search(pattern, text_lower):
                # Clean up the symptom name
                symptom_name = pattern.replace(r'\b', '').replace(r'\\b', '')
                symptoms.append(symptom_name)
                
        # If no specific patterns found, extract key phrases
        if not symptoms:
            # Look for descriptive phrases
            phrases = re.findall(r'\b[a-z]+(?:\s+[a-z]+){1,3}\b', text_lower)
            for phrase in phrases:
                if len(phrase.split()) >= 2 and len(phrase) > 10:
                    symptoms.append(phrase)
                    
        return symptoms
    
    def _create_symptom_profiles(self, symptoms: Set[str]) -> None:
        """Create detailed profiles for each symptom."""
        logger.info(f"Creating profiles for {len(symptoms)} symptoms")
        
        for symptom in symptoms:
            profile = self._create_single_symptom_profile(symptom)
            self.symptom_profiles[symptom] = profile
    
    def _create_single_symptom_profile(self, symptom: str) -> SymptomProfile:
        """Create a detailed profile for a single symptom."""
        
        # Generate symptom ID
        symptom_id = re.sub(r'[^a-z0-9]', '_', symptom.lower())
        
        # Determine severity range based on symptom type
        severity_range = self._determine_severity_range(symptom)
        
        # Determine frequency pattern
        frequency_pattern = self._determine_frequency_pattern(symptom)
        
        # Generate clinical indicators
        clinical_indicators = self._generate_clinical_indicators(symptom)
        
        # Generate assessment questions
        assessment_questions = self._generate_assessment_questions(symptom)
        
        return SymptomProfile(
            symptom_id=symptom_id,
            symptom_name=symptom,
            description=f"Clinical presentation of {symptom}",
            severity_range=severity_range,
            frequency_pattern=frequency_pattern,
            clinical_indicators=clinical_indicators,
            assessment_questions=assessment_questions
        )
    
    def _determine_severity_range(self, symptom: str) -> List[SymptomSeverity]:
        """Determine possible severity range for a symptom."""
        symptom_lower = symptom.lower()
        
        # Critical symptoms
        if any(word in symptom_lower for word in ['suicidal', 'death', 'harm', 'psychotic']):
            return [SymptomSeverity.MODERATE, SymptomSeverity.SEVERE, SymptomSeverity.CRITICAL]
        
        # Severe symptoms
        elif any(word in symptom_lower for word in ['severe', 'major', 'significant', 'marked']):
            return [SymptomSeverity.MODERATE, SymptomSeverity.SEVERE]
        
        # Moderate symptoms
        elif any(word in symptom_lower for word in ['persistent', 'chronic', 'recurrent']):
            return [SymptomSeverity.MILD, SymptomSeverity.MODERATE, SymptomSeverity.SEVERE]
        
        # Default range
        else:
            return [SymptomSeverity.MILD, SymptomSeverity.MODERATE]
    
    def _determine_frequency_pattern(self, symptom: str) -> SymptomFrequency:
        """Determine frequency pattern for a symptom."""
        symptom_lower = symptom.lower()
        
        if any(phrase in symptom_lower for phrase in ['nearly every day', 'most days', 'persistent']):
            return SymptomFrequency.PERSISTENT
        elif any(phrase in symptom_lower for phrase in ['frequent', 'often', 'regularly']):
            return SymptomFrequency.FREQUENT
        elif any(phrase in symptom_lower for phrase in ['sometimes', 'occasionally']):
            return SymptomFrequency.OCCASIONAL
        else:
            return SymptomFrequency.FREQUENT  # Default
    
    def _generate_clinical_indicators(self, symptom: str) -> List[str]:
        """Generate clinical indicators for a symptom."""
        indicators = []
        symptom_lower = symptom.lower()
        
        # Mood-related indicators
        if any(word in symptom_lower for word in ['mood', 'depressed', 'sad']):
            indicators.extend([
                "Observable changes in facial expression",
                "Reduced verbal communication",
                "Decreased activity level",
                "Changes in posture and body language"
            ])
        
        # Anxiety-related indicators
        elif any(word in symptom_lower for word in ['anxiety', 'worry', 'nervous']):
            indicators.extend([
                "Physical tension and restlessness",
                "Rapid speech or pressured speech",
                "Avoidance behaviors",
                "Physiological arousal signs"
            ])
        
        # Sleep-related indicators
        elif any(word in symptom_lower for word in ['sleep', 'insomnia', 'hypersomnia']):
            indicators.extend([
                "Changes in sleep-wake cycle",
                "Fatigue and daytime sleepiness",
                "Difficulty with sleep initiation or maintenance",
                "Early morning awakening patterns"
            ])
        
        # Cognitive indicators
        elif any(word in symptom_lower for word in ['concentration', 'memory', 'thinking']):
            indicators.extend([
                "Difficulty completing tasks",
                "Increased errors in work or daily activities",
                "Complaints of mental fog or confusion",
                "Reduced decision-making ability"
            ])
        
        # Default indicators
        else:
            indicators.extend([
                "Changes in typical behavior patterns",
                "Impact on daily functioning",
                "Subjective distress reports"
            ])
            
        return indicators[:4]  # Limit to 4 indicators
    
    def _generate_assessment_questions(self, symptom: str) -> List[str]:
        """Generate assessment questions for a symptom."""
        questions = []
        symptom_lower = symptom.lower()
        
        # Mood-related questions
        if any(word in symptom_lower for word in ['mood', 'depressed', 'sad']):
            questions.extend([
                f"How would you describe your mood over the past two weeks?",
                f"Have you noticed changes in your emotional state?",
                f"On a scale of 1-10, how would you rate your mood today?"
            ])
        
        # Anxiety-related questions
        elif any(word in symptom_lower for word in ['anxiety', 'worry', 'nervous']):
            questions.extend([
                f"What kinds of things do you find yourself worrying about?",
                f"How often do you experience feelings of anxiety?",
                f"Do you notice physical symptoms when you feel anxious?"
            ])
        
        # Sleep-related questions
        elif any(word in symptom_lower for word in ['sleep', 'insomnia', 'hypersomnia']):
            questions.extend([
                f"How has your sleep been lately?",
                f"Do you have trouble falling asleep or staying asleep?",
                f"How many hours of sleep do you typically get per night?"
            ])
        
        # General questions
        else:
            questions.extend([
                f"Can you tell me more about {symptom}?",
                f"How long have you been experiencing {symptom}?",
                f"How does {symptom} affect your daily life?"
            ])
            
        return questions[:3]  # Limit to 3 questions
    
    def _create_single_disorder_mapping(self, disorder_code: str, disorder_data: Any) -> DisorderSymptomMapping:
        """Create mapping for a single disorder."""
        
        disorder_name = getattr(disorder_data, 'disorder_name', 'Unknown')
        
        # Extract symptom relationships
        symptom_relationships = {}
        symptom_weights = {}
        
        criteria = getattr(disorder_data, 'criteria', [])
        for criterion in criteria:
            description = getattr(criterion, 'description', '')
            required = getattr(criterion, 'required', False)
            
            symptoms = self._parse_symptoms_from_text(description)
            for symptom in symptoms:
                if symptom in self.symptom_profiles:
                    relationship_type = RelationshipType.CORE if required else RelationshipType.ASSOCIATED
                    symptom_relationships[symptom] = relationship_type
                    
                    # Calculate weight based on requirement and clinical importance
                    weight = 1.0 if required else 0.6
                    if any(word in symptom.lower() for word in ['suicidal', 'death', 'severe']):
                        weight += 0.3
                    symptom_weights[symptom] = min(weight, 1.0)
        
        # Create symptom clusters
        symptom_clusters = self._create_symptom_clusters(symptom_relationships.keys())
        
        # Generate diagnostic combinations
        diagnostic_combinations = self._generate_diagnostic_combinations(symptom_relationships)
        
        # Create severity correlations
        severity_correlations = self._create_severity_correlations(symptom_relationships.keys())
        
        return DisorderSymptomMapping(
            disorder_code=disorder_code,
            disorder_name=disorder_name,
            symptom_relationships=symptom_relationships,
            symptom_weights=symptom_weights,
            symptom_clusters=symptom_clusters,
            diagnostic_combinations=diagnostic_combinations,
            severity_correlations=severity_correlations
        )
    
    def _create_symptom_clusters(self, symptoms: List[str]) -> Dict[str, List[str]]:
        """Create logical clusters of related symptoms."""
        clusters = {
            "mood_symptoms": [],
            "cognitive_symptoms": [],
            "physical_symptoms": [],
            "behavioral_symptoms": [],
            "social_symptoms": []
        }
        
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            
            # Mood cluster
            if any(word in symptom_lower for word in ['mood', 'depressed', 'sad', 'hopeless', 'worthless']):
                clusters["mood_symptoms"].append(symptom)
            
            # Cognitive cluster
            elif any(word in symptom_lower for word in ['concentration', 'memory', 'thinking', 'decision']):
                clusters["cognitive_symptoms"].append(symptom)
            
            # Physical cluster
            elif any(word in symptom_lower for word in ['sleep', 'appetite', 'energy', 'fatigue', 'weight']):
                clusters["physical_symptoms"].append(symptom)
            
            # Behavioral cluster
            elif any(word in symptom_lower for word in ['agitation', 'retardation', 'impulsivity', 'avoidance']):
                clusters["behavioral_symptoms"].append(symptom)
            
            # Social cluster
            elif any(word in symptom_lower for word in ['interpersonal', 'relationship', 'social', 'abandonment']):
                clusters["social_symptoms"].append(symptom)
            
            # Default to behavioral if unclear
            else:
                clusters["behavioral_symptoms"].append(symptom)
        
        # Remove empty clusters
        return {k: v for k, v in clusters.items() if v}
    
    def _generate_diagnostic_combinations(self, symptom_relationships: Dict[str, RelationshipType]) -> List[List[str]]:
        """Generate possible diagnostic combinations."""
        combinations = []
        
        # Get core symptoms
        core_symptoms = [s for s, r in symptom_relationships.items() if r == RelationshipType.CORE]
        associated_symptoms = [s for s, r in symptom_relationships.items() if r == RelationshipType.ASSOCIATED]
        
        # Create combinations based on clinical logic
        if len(core_symptoms) >= 2:
            # Combination with all core symptoms
            combinations.append(core_symptoms)
            
            # Combinations with core + associated
            if associated_symptoms:
                combinations.append(core_symptoms + associated_symptoms[:2])
        
        elif len(core_symptoms) == 1 and len(associated_symptoms) >= 3:
            # Single core + multiple associated
            combinations.append([core_symptoms[0]] + associated_symptoms[:3])
        
        # Minimum viable combination
        all_symptoms = list(symptom_relationships.keys())
        if len(all_symptoms) >= 3:
            combinations.append(all_symptoms[:3])
        
        return combinations[:5]  # Limit to 5 combinations
    
    def _create_severity_correlations(self, symptoms: List[str]) -> Dict[str, Dict[str, float]]:
        """Create severity correlations between symptoms."""
        correlations = {}
        
        for symptom in symptoms:
            correlations[symptom] = {}
            
            # Create correlations with other symptoms
            for other_symptom in symptoms:
                if symptom != other_symptom:
                    # Calculate correlation based on symptom similarity
                    correlation = self._calculate_symptom_correlation(symptom, other_symptom)
                    if correlation > 0.3:  # Only include meaningful correlations
                        correlations[symptom][other_symptom] = correlation
        
        return correlations
    
    def _calculate_symptom_correlation(self, symptom1: str, symptom2: str) -> float:
        """Calculate correlation between two symptoms."""
        
        # Simple correlation based on shared keywords
        words1 = set(symptom1.lower().split())
        words2 = set(symptom2.lower().split())
        
        # Remove common words
        common_words = {'and', 'or', 'of', 'in', 'to', 'the', 'a', 'an'}
        words1 -= common_words
        words2 -= common_words
        
        if not words1 or not words2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        base_correlation = intersection / union if union > 0 else 0.0
        
        # Boost correlation for clinically related symptoms
        clinical_relationships = [
            (['mood', 'depressed', 'sad'], ['energy', 'fatigue', 'tired']),
            (['anxiety', 'worry'], ['sleep', 'insomnia']),
            (['concentration', 'thinking'], ['memory', 'decision']),
            (['appetite', 'weight'], ['sleep', 'energy'])
        ]
        
        for group1, group2 in clinical_relationships:
            if (any(word in symptom1.lower() for word in group1) and 
                any(word in symptom2.lower() for word in group2)):
                base_correlation += 0.3
            elif (any(word in symptom2.lower() for word in group1) and 
                  any(word in symptom1.lower() for word in group2)):
                base_correlation += 0.3
        
        return min(base_correlation, 1.0)
    
    def _analyze_symptom_cooccurrence(self) -> None:
        """Analyze symptom co-occurrence patterns across disorders."""
        logger.info("Analyzing symptom co-occurrence patterns")
        
        # Collect all symptom pairs
        symptom_pairs = defaultdict(list)
        
        for disorder_code, mapping in self.disorder_mappings.items():
            symptoms = list(mapping.symptom_relationships.keys())
            
            # Generate all pairs
            for i, symptom1 in enumerate(symptoms):
                for symptom2 in symptoms[i+1:]:
                    pair = tuple(sorted([symptom1, symptom2]))
                    symptom_pairs[pair].append(disorder_code)
        
        # Create co-occurrence objects
        for pair, disorders in symptom_pairs.items():
            if len(disorders) >= 2:  # Only include pairs that co-occur in multiple disorders
                cooccurrence_rate = len(disorders) / len(self.disorder_mappings)
                
                # Determine clinical significance
                if cooccurrence_rate >= 0.6:
                    significance = "High clinical significance"
                elif cooccurrence_rate >= 0.4:
                    significance = "Moderate clinical significance"
                else:
                    significance = "Low clinical significance"
                
                cooccurrence = SymptomCooccurrence(
                    symptom_pair=pair,
                    cooccurrence_rate=cooccurrence_rate,
                    clinical_significance=significance,
                    disorders_involved=disorders
                )
                self.symptom_cooccurrences.append(cooccurrence)
    
    def _build_symptom_vocabulary(self) -> Dict[str, List[str]]:
        """Build comprehensive symptom vocabulary."""
        return {
            "mood_terms": [
                "depressed", "sad", "hopeless", "worthless", "guilty", "empty",
                "irritable", "anxious", "worried", "fearful", "angry"
            ],
            "cognitive_terms": [
                "concentration", "memory", "thinking", "decision", "confusion",
                "attention", "focus", "clarity", "processing"
            ],
            "physical_terms": [
                "sleep", "appetite", "weight", "energy", "fatigue", "tired",
                "pain", "tension", "restless", "agitated"
            ],
            "behavioral_terms": [
                "withdrawal", "isolation", "avoidance", "impulsive", "reckless",
                "compulsive", "repetitive", "ritualistic"
            ],
            "social_terms": [
                "relationship", "interpersonal", "social", "abandonment",
                "rejection", "intimacy", "trust", "attachment"
            ]
        }
    
    def get_mapping_summary(self) -> Dict[str, Any]:
        """Get summary of disorder-symptom mappings."""
        if not self.disorder_mappings:
            return {"total_mappings": 0}
        
        summary = {
            "total_disorders": len(self.disorder_mappings),
            "total_symptoms": len(self.symptom_profiles),
            "total_cooccurrences": len(self.symptom_cooccurrences),
            "relationship_distribution": defaultdict(int),
            "cluster_distribution": defaultdict(int),
            "severity_coverage": defaultdict(int)
        }
        
        # Analyze relationship types
        for mapping in self.disorder_mappings.values():
            for relationship_type in mapping.symptom_relationships.values():
                summary["relationship_distribution"][relationship_type.value] += 1
            
            # Analyze clusters
            for cluster_name, symptoms in mapping.symptom_clusters.items():
                summary["cluster_distribution"][cluster_name] += len(symptoms)
        
        # Analyze severity coverage
        for profile in self.symptom_profiles.values():
            for severity in profile.severity_range:
                summary["severity_coverage"][severity.value] += 1
        
        return dict(summary)
    
    def export_mappings(self, output_path: Path) -> None:
        """Export disorder-symptom mappings to JSON."""
        logger.info(f"Exporting disorder-symptom mappings to {output_path}")
        
        export_data = {
            "metadata": {
                "version": "1.0",
                "total_disorders": len(self.disorder_mappings),
                "total_symptoms": len(self.symptom_profiles),
                "total_cooccurrences": len(self.symptom_cooccurrences)
            },
            "symptom_profiles": {k: asdict(v) for k, v in self.symptom_profiles.items()},
            "disorder_mappings": {k: asdict(v) for k, v in self.disorder_mappings.items()},
            "symptom_cooccurrences": [asdict(c) for c in self.symptom_cooccurrences],
            "summary": self.get_mapping_summary()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Successfully exported mappings to {output_path}")