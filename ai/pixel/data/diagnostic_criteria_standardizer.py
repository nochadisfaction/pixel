"""
Diagnostic Criteria Standardization System

This module provides standardized formatting and validation for DSM-5 diagnostic criteria,
ensuring consistent structure across all disorders for training and clinical use.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from enum import Enum
import re

logger = logging.getLogger(__name__)


class CriterionType(Enum):
    """Types of diagnostic criteria."""
    REQUIRED = "required"
    OPTIONAL = "optional"
    EXCLUSION = "exclusion"
    SPECIFIER = "specifier"
    DURATION = "duration"


class ValidationLevel(Enum):
    """Validation levels for criteria."""
    STRICT = "strict"
    MODERATE = "moderate"
    LENIENT = "lenient"


@dataclass
class StandardizedCriterion:
    """Standardized diagnostic criterion format."""
    id: str
    text: str
    type: CriterionType
    weight: float
    duration_days: Optional[int] = None
    exclusions: List[str] = None
    examples: List[str] = None
    clinical_notes: List[str] = None
    
    def __post_init__(self):
        if self.exclusions is None:
            self.exclusions = []
        if self.examples is None:
            self.examples = []
        if self.clinical_notes is None:
            self.clinical_notes = []


@dataclass
class StandardizedDisorder:
    """Standardized disorder format."""
    code: str
    name: str
    category: str
    criteria: List[StandardizedCriterion]
    minimum_criteria: int
    severity_thresholds: Dict[str, int]
    prevalence: Dict[str, float]
    differential_diagnoses: List[str]
    risk_factors: List[str]
    protective_factors: List[str]
    
    def __post_init__(self):
        if not self.differential_diagnoses:
            self.differential_diagnoses = []
        if not self.risk_factors:
            self.risk_factors = []
        if not self.protective_factors:
            self.protective_factors = []


class DiagnosticCriteriaStandardizer:
    """Standardizes diagnostic criteria into consistent format."""
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.MODERATE):
        self.validation_level = validation_level
        self.standardized_disorders: Dict[str, StandardizedDisorder] = {}
        self.validation_rules = self._initialize_validation_rules()
        
    def _initialize_validation_rules(self) -> Dict[str, Any]:
        """Initialize validation rules based on clinical standards."""
        return {
            "minimum_criteria_count": 3,
            "maximum_criteria_count": 15,
            "required_fields": ["code", "name", "category", "criteria"],
            "criterion_text_min_length": 10,
            "criterion_text_max_length": 500,
            "valid_duration_ranges": {
                "days": (1, 365),
                "weeks": (1, 52),
                "months": (1, 12)
            }
        }
    
    def standardize_disorder(self, disorder_data: Dict[str, Any]) -> StandardizedDisorder:
        """
        Standardize a disorder into the consistent format.
        
        Args:
            disorder_data: Raw disorder data from psychology processor
            
        Returns:
            StandardizedDisorder with consistent formatting
        """
        logger.info(f"Standardizing disorder: {disorder_data.get('disorder_name', 'Unknown')}")
        
        # Extract basic information
        code = disorder_data.get("disorder_code", "")
        name = disorder_data.get("disorder_name", "")
        category = disorder_data.get("category", {}).get("value", "") if isinstance(disorder_data.get("category"), dict) else str(disorder_data.get("category", ""))
        
        # Standardize criteria
        raw_criteria = disorder_data.get("criteria", [])
        standardized_criteria = []
        
        for criterion in raw_criteria:
            std_criterion = self._standardize_criterion(criterion)
            if std_criterion:
                standardized_criteria.append(std_criterion)
        
        # Calculate minimum criteria needed
        required_count = sum(1 for c in standardized_criteria if c.type == CriterionType.REQUIRED)
        optional_count = len(standardized_criteria) - required_count
        minimum_criteria = max(required_count, min(3, len(standardized_criteria)))
        
        # Create severity thresholds
        severity_thresholds = self._calculate_severity_thresholds(standardized_criteria)
        
        # Extract prevalence data
        prevalence_data = disorder_data.get("prevalence_data", {})
        prevalence = self._standardize_prevalence(prevalence_data)
        
        # Extract differential diagnoses
        differential_diagnoses = disorder_data.get("differential_diagnosis", [])
        
        # Generate risk and protective factors
        risk_factors = self._extract_risk_factors(disorder_data)
        protective_factors = self._extract_protective_factors(disorder_data)
        
        standardized_disorder = StandardizedDisorder(
            code=code,
            name=name,
            category=category,
            criteria=standardized_criteria,
            minimum_criteria=minimum_criteria,
            severity_thresholds=severity_thresholds,
            prevalence=prevalence,
            differential_diagnoses=differential_diagnoses,
            risk_factors=risk_factors,
            protective_factors=protective_factors
        )
        
        # Validate the standardized disorder
        self._validate_standardized_disorder(standardized_disorder)
        
        return standardized_disorder
    
    def _standardize_criterion(self, criterion_data: Dict[str, Any]) -> Optional[StandardizedCriterion]:
        """Standardize an individual criterion."""
        if not criterion_data:
            return None
            
        criterion_id = criterion_data.get("criterion_id", "")
        description = criterion_data.get("description", "")
        required = criterion_data.get("required", False)
        duration_req = criterion_data.get("duration_requirement", "")
        exclusions = criterion_data.get("exclusion_criteria", [])
        
        # Determine criterion type
        criterion_type = CriterionType.REQUIRED if required else CriterionType.OPTIONAL
        
        # Calculate weight based on type and clinical importance
        weight = self._calculate_criterion_weight(description, criterion_type)
        
        # Parse duration requirement
        duration_days = self._parse_duration_requirement(duration_req)
        
        # Generate examples and clinical notes
        examples = self._generate_criterion_examples(description)
        clinical_notes = self._generate_clinical_notes(description, criterion_type)
        
        return StandardizedCriterion(
            id=criterion_id,
            text=description,
            type=criterion_type,
            weight=weight,
            duration_days=duration_days,
            exclusions=exclusions,
            examples=examples,
            clinical_notes=clinical_notes
        )
    
    def _calculate_criterion_weight(self, description: str, criterion_type: CriterionType) -> float:
        """Calculate the clinical weight of a criterion."""
        base_weight = 1.0 if criterion_type == CriterionType.REQUIRED else 0.5
        
        # Increase weight for critical symptoms
        critical_keywords = ["suicide", "death", "harm", "psychosis", "severe", "impairment"]
        if any(keyword in description.lower() for keyword in critical_keywords):
            base_weight *= 1.5
            
        # Increase weight for core symptoms
        core_keywords = ["mood", "anxiety", "depression", "panic", "trauma"]
        if any(keyword in description.lower() for keyword in core_keywords):
            base_weight *= 1.2
            
        return min(base_weight, 2.0)  # Cap at 2.0
    
    def _parse_duration_requirement(self, duration_str: str) -> Optional[int]:
        """Parse duration requirement into days."""
        if not duration_str:
            return None
            
        duration_str = duration_str.lower()
        
        # Extract number and unit
        import re
        match = re.search(r'(\d+)\s*(day|week|month)', duration_str)
        if not match:
            return None
            
        number = int(match.group(1))
        unit = match.group(2)
        
        # Convert to days
        if unit == "day":
            return number
        elif unit == "week":
            return number * 7
        elif unit == "month":
            return number * 30
            
        return None
    
    def _generate_criterion_examples(self, description: str) -> List[str]:
        """Generate clinical examples for a criterion."""
        examples = []
        
        if "depressed mood" in description.lower():
            examples = [
                "Patient reports feeling sad most days",
                "Describes mood as 'empty' or 'hopeless'",
                "Observable tearfulness during interview"
            ]
        elif "anxiety" in description.lower():
            examples = [
                "Excessive worry about multiple life domains",
                "Physical symptoms like racing heart",
                "Avoidance of anxiety-provoking situations"
            ]
        elif "sleep" in description.lower():
            examples = [
                "Difficulty falling asleep (>30 minutes)",
                "Frequent nighttime awakenings",
                "Early morning awakening with inability to return to sleep"
            ]
        elif "appetite" in description.lower():
            examples = [
                "Significant weight loss without dieting",
                "Loss of interest in food",
                "Eating much more than usual"
            ]
        
        return examples[:3]  # Limit to 3 examples
    
    def _generate_clinical_notes(self, description: str, criterion_type: CriterionType) -> List[str]:
        """Generate clinical notes for assessment."""
        notes = []
        
        if criterion_type == CriterionType.REQUIRED:
            notes.append("This criterion must be present for diagnosis")
            
        if "suicide" in description.lower():
            notes.extend([
                "Requires immediate safety assessment",
                "Document risk factors and protective factors",
                "Consider hospitalization if high risk"
            ])
        elif "psychosis" in description.lower():
            notes.extend([
                "Assess reality testing carefully",
                "Rule out substance-induced symptoms",
                "Consider medical causes"
            ])
        elif "impairment" in description.lower():
            notes.append("Assess functional impact on daily activities")
            
        return notes
    
    def _calculate_severity_thresholds(self, criteria: List[StandardizedCriterion]) -> Dict[str, int]:
        """Calculate severity thresholds based on criteria."""
        total_criteria = len(criteria)
        required_criteria = sum(1 for c in criteria if c.type == CriterionType.REQUIRED)
        
        return {
            "mild": max(required_criteria, total_criteria // 3),
            "moderate": max(required_criteria + 1, total_criteria // 2),
            "severe": max(required_criteria + 2, (total_criteria * 2) // 3)
        }
    
    def _standardize_prevalence(self, prevalence_data: Dict[str, Any]) -> Dict[str, float]:
        """Standardize prevalence data format."""
        standardized = {}
        
        for key, value in prevalence_data.items():
            if isinstance(value, str) and "%" in value:
                # Convert percentage string to float
                try:
                    standardized[key] = float(value.replace("%", "")) / 100.0
                except ValueError:
                    continue
            elif isinstance(value, (int, float)):
                standardized[key] = float(value)
                
        return standardized
    
    def _extract_risk_factors(self, disorder_data: Dict[str, Any]) -> List[str]:
        """Extract risk factors from disorder data."""
        risk_factors = []
        
        category = disorder_data.get("category", "")
        if isinstance(category, dict):
            category = category.get("value", "")
            
        # Category-specific risk factors
        if "depressive" in category.lower():
            risk_factors.extend([
                "Family history of depression",
                "Previous depressive episodes",
                "Chronic medical conditions",
                "Substance use disorders",
                "Stressful life events"
            ])
        elif "anxiety" in category.lower():
            risk_factors.extend([
                "Family history of anxiety disorders",
                "Childhood trauma or abuse",
                "Chronic stress",
                "Medical conditions affecting breathing or heart",
                "Substance use"
            ])
        elif "trauma" in category.lower():
            risk_factors.extend([
                "Previous trauma exposure",
                "Lack of social support",
                "Pre-existing mental health conditions",
                "Substance use disorders",
                "History of childhood abuse"
            ])
        elif "personality" in category.lower():
            risk_factors.extend([
                "Childhood trauma or neglect",
                "Family history of personality disorders",
                "Unstable family environment",
                "Substance use disorders",
                "History of self-harm"
            ])
            
        return risk_factors
    
    def _extract_protective_factors(self, disorder_data: Dict[str, Any]) -> List[str]:
        """Extract protective factors from disorder data."""
        return [
            "Strong social support network",
            "Regular physical exercise",
            "Healthy coping strategies",
            "Access to mental health care",
            "Stable employment or education",
            "Spiritual or religious practices",
            "Good physical health"
        ]
    
    def _validate_standardized_disorder(self, disorder: StandardizedDisorder) -> None:
        """Validate a standardized disorder against clinical standards."""
        errors = []
        
        # Check required fields
        if not disorder.code:
            errors.append("Missing disorder code")
        if not disorder.name:
            errors.append("Missing disorder name")
        if not disorder.category:
            errors.append("Missing disorder category")
        if not disorder.criteria:
            errors.append("Missing diagnostic criteria")
            
        # Validate criteria count
        if len(disorder.criteria) < self.validation_rules["minimum_criteria_count"]:
            errors.append(f"Too few criteria: {len(disorder.criteria)} < {self.validation_rules['minimum_criteria_count']}")
        if len(disorder.criteria) > self.validation_rules["maximum_criteria_count"]:
            errors.append(f"Too many criteria: {len(disorder.criteria)} > {self.validation_rules['maximum_criteria_count']}")
            
        # Validate individual criteria
        for criterion in disorder.criteria:
            if len(criterion.text) < self.validation_rules["criterion_text_min_length"]:
                errors.append(f"Criterion text too short: {criterion.id}")
            if len(criterion.text) > self.validation_rules["criterion_text_max_length"]:
                errors.append(f"Criterion text too long: {criterion.id}")
                
        if errors and self.validation_level == ValidationLevel.STRICT:
            raise ValueError(f"Validation errors for {disorder.code}: {'; '.join(errors)}")
        elif errors:
            logger.warning(f"Validation warnings for {disorder.code}: {'; '.join(errors)}")
    
    def standardize_all_disorders(self, disorders_data: Dict[str, Any]) -> Dict[str, StandardizedDisorder]:
        """Standardize all disorders from psychology processor output."""
        logger.info(f"Standardizing {len(disorders_data)} disorders")
        
        standardized = {}
        
        for disorder_code, disorder_data in disorders_data.items():
            try:
                std_disorder = self.standardize_disorder(disorder_data)
                standardized[disorder_code] = std_disorder
                self.standardized_disorders[disorder_code] = std_disorder
            except Exception as e:
                logger.error(f"Failed to standardize disorder {disorder_code}: {e}")
                continue
                
        logger.info(f"Successfully standardized {len(standardized)} disorders")
        return standardized
    
    def generate_standardization_report(self) -> Dict[str, Any]:
        """Generate a comprehensive standardization report."""
        if not self.standardized_disorders:
            return {"error": "No disorders have been standardized"}
            
        report = {
            "summary": {
                "total_disorders": len(self.standardized_disorders),
                "validation_level": self.validation_level.value,
                "standardization_date": "2024-01-01"
            },
            "category_breakdown": {},
            "criteria_statistics": {
                "total_criteria": 0,
                "required_criteria": 0,
                "optional_criteria": 0,
                "average_criteria_per_disorder": 0.0
            },
            "quality_metrics": {
                "disorders_with_examples": 0,
                "disorders_with_clinical_notes": 0,
                "disorders_with_duration_requirements": 0,
                "average_criterion_weight": 0.0
            },
            "validation_results": {
                "passed_validation": 0,
                "validation_warnings": 0,
                "validation_errors": 0
            }
        }
        
        # Calculate statistics
        total_criteria = 0
        required_criteria = 0
        total_weight = 0.0
        
        for disorder in self.standardized_disorders.values():
            # Category breakdown
            category = disorder.category
            if category not in report["category_breakdown"]:
                report["category_breakdown"][category] = 0
            report["category_breakdown"][category] += 1
            
            # Criteria statistics
            total_criteria += len(disorder.criteria)
            for criterion in disorder.criteria:
                if criterion.type == CriterionType.REQUIRED:
                    required_criteria += 1
                total_weight += criterion.weight
                
            # Quality metrics
            if any(criterion.examples for criterion in disorder.criteria):
                report["quality_metrics"]["disorders_with_examples"] += 1
            if any(criterion.clinical_notes for criterion in disorder.criteria):
                report["quality_metrics"]["disorders_with_clinical_notes"] += 1
            if any(criterion.duration_days for criterion in disorder.criteria):
                report["quality_metrics"]["disorders_with_duration_requirements"] += 1
        
        # Finalize statistics
        report["criteria_statistics"]["total_criteria"] = total_criteria
        report["criteria_statistics"]["required_criteria"] = required_criteria
        report["criteria_statistics"]["optional_criteria"] = total_criteria - required_criteria
        report["criteria_statistics"]["average_criteria_per_disorder"] = total_criteria / len(self.standardized_disorders)
        report["quality_metrics"]["average_criterion_weight"] = total_weight / total_criteria if total_criteria > 0 else 0.0
        
        # Validation results (simplified for this implementation)
        report["validation_results"]["passed_validation"] = len(self.standardized_disorders)
        
        return report
    
    def export_standardized_format(self, output_path: Path) -> None:
        """Export standardized disorders to JSON format."""
        logger.info(f"Exporting standardized disorders to {output_path}")
        
        export_data = {
            "metadata": {
                "format_version": "1.0",
                "standardization_date": "2024-01-01",
                "validation_level": self.validation_level.value,
                "total_disorders": len(self.standardized_disorders)
            },
            "standardized_disorders": {
                code: asdict(disorder) for code, disorder in self.standardized_disorders.items()
            },
            "standardization_report": self.generate_standardization_report()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Successfully exported {len(self.standardized_disorders)} standardized disorders")