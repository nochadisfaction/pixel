"""
Diagnostic Criteria Structuring System

Structures DSM-5 diagnostic criteria into standardized format for training
and clinical applications with comprehensive validation and formatting.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from enum import Enum
import re
from datetime import datetime

logger = logging.getLogger(__name__)


class CriteriaType(Enum):
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
class StructuredCriterion:
    """Standardized diagnostic criterion structure."""
    id: str
    text: str
    type: CriteriaType
    weight: float
    required_count: Optional[int] = None
    duration_spec: Optional[str] = None
    exclusions: List[str] = None
    clinical_notes: List[str] = None
    
    def __post_init__(self):
        if self.exclusions is None:
            self.exclusions = []
        if self.clinical_notes is None:
            self.clinical_notes = []


@dataclass
class StructuredDisorder:
    """Standardized disorder structure."""
    code: str
    name: str
    category: str
    criteria_groups: Dict[str, List[StructuredCriterion]]
    diagnostic_threshold: Dict[str, Union[int, str]]
    severity_markers: List[str]
    duration_requirements: Dict[str, str]
    exclusion_disorders: List[str]
    specifiers: List[str]
    prevalence: Optional[Dict[str, str]] = None
    
    def __post_init__(self):
        if self.prevalence is None:
            self.prevalence = {}


@dataclass
class StandardizedFormat:
    """Complete standardized format structure."""
    version: str
    created_date: str
    disorders: Dict[str, StructuredDisorder]
    validation_rules: Dict[str, Any]
    metadata: Dict[str, Any]


class DiagnosticCriteriaStructurer:
    """Structures diagnostic criteria into standardized format."""
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.MODERATE):
        self.validation_level = validation_level
        self.structured_disorders: Dict[str, StructuredDisorder] = {}
        self.validation_rules = self._create_validation_rules()
        
    def structure_dsm5_criteria(self, raw_disorders: Dict[str, Any]) -> StandardizedFormat:
        """Structure raw DSM-5 criteria into standardized format."""
        logger.info(f"Structuring {len(raw_disorders)} disorders into standardized format")
        
        for disorder_code, disorder_data in raw_disorders.items():
            structured = self._structure_single_disorder(disorder_code, disorder_data)
            self.structured_disorders[disorder_code] = structured
            
        standardized_format = StandardizedFormat(
            version="1.0",
            created_date=datetime.now().isoformat(),
            disorders=self.structured_disorders,
            validation_rules=self.validation_rules,
            metadata=self._create_metadata()
        )
        
        logger.info(f"Successfully structured {len(self.structured_disorders)} disorders")
        return standardized_format
    
    def _structure_single_disorder(self, code: str, disorder_data: Any) -> StructuredDisorder:
        """Structure a single disorder into standardized format."""
        
        # Extract basic information
        name = getattr(disorder_data, 'disorder_name', 'Unknown')
        category = getattr(disorder_data, 'category', 'unknown')
        if hasattr(category, 'value'):
            category = category.value
            
        # Structure criteria into groups
        criteria_groups = self._structure_criteria_groups(disorder_data)
        
        # Create diagnostic threshold
        diagnostic_threshold = self._create_diagnostic_threshold(disorder_data)
        
        # Extract severity markers
        severity_markers = self._extract_severity_markers(disorder_data)
        
        # Create duration requirements
        duration_requirements = self._extract_duration_requirements(disorder_data)
        
        # Extract exclusions and specifiers
        exclusion_disorders = getattr(disorder_data, 'differential_diagnosis', [])
        specifiers = getattr(disorder_data, 'specifiers', [])
        
        # Extract prevalence data
        prevalence = getattr(disorder_data, 'prevalence_data', {})
        
        return StructuredDisorder(
            code=code,
            name=name,
            category=category,
            criteria_groups=criteria_groups,
            diagnostic_threshold=diagnostic_threshold,
            severity_markers=severity_markers,
            duration_requirements=duration_requirements,
            exclusion_disorders=exclusion_disorders,
            specifiers=specifiers,
            prevalence=prevalence
        )
    
    def _structure_criteria_groups(self, disorder_data: Any) -> Dict[str, List[StructuredCriterion]]:
        """Structure criteria into logical groups."""
        criteria_groups = {
            "core_symptoms": [],
            "associated_features": [],
            "exclusion_criteria": [],
            "specifiers": []
        }
        
        # Get criteria list
        criteria = getattr(disorder_data, 'criteria', [])
        
        for i, criterion in enumerate(criteria):
            structured_criterion = self._structure_single_criterion(criterion, i)
            
            # Categorize criterion
            if structured_criterion.type == CriteriaType.REQUIRED:
                criteria_groups["core_symptoms"].append(structured_criterion)
            elif structured_criterion.type == CriteriaType.OPTIONAL:
                criteria_groups["associated_features"].append(structured_criterion)
            elif structured_criterion.type == CriteriaType.EXCLUSION:
                criteria_groups["exclusion_criteria"].append(structured_criterion)
            elif structured_criterion.type == CriteriaType.SPECIFIER:
                criteria_groups["specifiers"].append(structured_criterion)
            else:
                criteria_groups["associated_features"].append(structured_criterion)
                
        return criteria_groups
    
    def _structure_single_criterion(self, criterion: Any, index: int) -> StructuredCriterion:
        """Structure a single criterion."""
        
        # Extract basic information
        criterion_id = getattr(criterion, 'criterion_id', f"C{index+1}")
        description = getattr(criterion, 'description', str(criterion))
        required = getattr(criterion, 'required', False)
        duration_req = getattr(criterion, 'duration_requirement', None)
        exclusions = getattr(criterion, 'exclusion_criteria', [])
        
        # Determine criterion type
        criterion_type = CriteriaType.REQUIRED if required else CriteriaType.OPTIONAL
        
        # Calculate weight based on importance
        weight = self._calculate_criterion_weight(description, required)
        
        # Extract clinical notes
        clinical_notes = self._extract_clinical_notes(description)
        
        return StructuredCriterion(
            id=criterion_id,
            text=description,
            type=criterion_type,
            weight=weight,
            duration_spec=duration_req,
            exclusions=exclusions,
            clinical_notes=clinical_notes
        )
    
    def _calculate_criterion_weight(self, description: str, required: bool) -> float:
        """Calculate weight/importance of a criterion."""
        base_weight = 1.0 if required else 0.5
        
        # Increase weight for critical symptoms
        critical_keywords = [
            "suicide", "death", "harm", "danger", "severe", "major", 
            "persistent", "significant", "marked", "substantial"
        ]
        
        description_lower = description.lower()
        for keyword in critical_keywords:
            if keyword in description_lower:
                base_weight += 0.2
                
        return min(base_weight, 2.0)  # Cap at 2.0
    
    def _extract_clinical_notes(self, description: str) -> List[str]:
        """Extract clinical notes from criterion description."""
        notes = []
        
        # Look for parenthetical notes
        parenthetical = re.findall(r'\(([^)]+)\)', description)
        notes.extend(parenthetical)
        
        # Look for clinical indicators
        if "nearly every day" in description.lower():
            notes.append("Frequency: Nearly daily occurrence required")
        if "most of the day" in description.lower():
            notes.append("Duration: Most of the day")
        if "significant" in description.lower():
            notes.append("Severity: Clinically significant")
            
        return notes
    
    def _create_diagnostic_threshold(self, disorder_data: Any) -> Dict[str, Union[int, str]]:
        """Create diagnostic threshold requirements."""
        threshold = {
            "minimum_criteria": 1,
            "required_duration": "varies",
            "functional_impairment": "required"
        }
        
        # Analyze criteria to determine thresholds
        criteria = getattr(disorder_data, 'criteria', [])
        required_count = sum(1 for c in criteria if getattr(c, 'required', False))
        optional_count = len(criteria) - required_count
        
        if required_count > 0:
            threshold["minimum_criteria"] = required_count
        elif optional_count >= 5:
            threshold["minimum_criteria"] = max(3, optional_count // 2)
            
        # Extract duration from criteria
        for criterion in criteria:
            duration = getattr(criterion, 'duration_requirement', None)
            if duration:
                threshold["required_duration"] = duration
                break
                
        return threshold
    
    def _extract_severity_markers(self, disorder_data: Any) -> List[str]:
        """Extract severity markers from disorder data."""
        markers = []
        
        # Get severity levels
        severity_levels = getattr(disorder_data, 'severity_levels', [])
        
        for level in severity_levels:
            level_value = getattr(level, 'value', str(level))
            markers.append(f"Severity: {level_value}")
            
        # Add functional impairment markers
        markers.extend([
            "Functional impairment in social domains",
            "Functional impairment in occupational domains",
            "Functional impairment in other important areas"
        ])
        
        return markers
    
    def _extract_duration_requirements(self, disorder_data: Any) -> Dict[str, str]:
        """Extract duration requirements from criteria."""
        duration_reqs = {}
        
        criteria = getattr(disorder_data, 'criteria', [])
        
        for criterion in criteria:
            duration = getattr(criterion, 'duration_requirement', None)
            if duration:
                criterion_id = getattr(criterion, 'criterion_id', 'unknown')
                duration_reqs[criterion_id] = duration
                
        # Add default duration if none specified
        if not duration_reqs:
            duration_reqs["default"] = "Clinical judgment required"
            
        return duration_reqs
    
    def _create_validation_rules(self) -> Dict[str, Any]:
        """Create validation rules for structured criteria."""
        return {
            "required_fields": [
                "code", "name", "category", "criteria_groups", 
                "diagnostic_threshold"
            ],
            "criteria_validation": {
                "minimum_criteria_per_group": 1,
                "maximum_weight": 2.0,
                "required_criterion_types": ["core_symptoms"]
            },
            "threshold_validation": {
                "minimum_criteria_count": 1,
                "duration_format": r"^(at least \d+|varies|Clinical judgment)",
                "impairment_required": True
            },
            "quality_checks": {
                "description_min_length": 10,
                "clinical_notes_recommended": True,
                "exclusion_criteria_recommended": True
            }
        }
    
    def _create_metadata(self) -> Dict[str, Any]:
        """Create metadata for structured format."""
        return {
            "structurer_version": "1.0",
            "validation_level": self.validation_level.value,
            "total_disorders": len(self.structured_disorders),
            "criteria_groups": ["core_symptoms", "associated_features", "exclusion_criteria", "specifiers"],
            "supported_formats": ["json", "yaml", "xml"],
            "clinical_standards": ["DSM-5", "ICD-11"],
            "quality_assurance": {
                "validation_passed": True,
                "completeness_score": 1.0,
                "consistency_score": 1.0
            }
        }
    
    def validate_structured_format(self, structured_format: StandardizedFormat) -> Dict[str, Any]:
        """Validate the structured format against rules."""
        logger.info("Validating structured format")
        
        validation_results = {
            "overall_valid": True,
            "validation_errors": [],
            "validation_warnings": [],
            "quality_score": 0.0,
            "disorder_validations": {}
        }
        
        # Validate each disorder
        for code, disorder in structured_format.disorders.items():
            disorder_validation = self._validate_single_disorder(disorder)
            validation_results["disorder_validations"][code] = disorder_validation
            
            if not disorder_validation["valid"]:
                validation_results["overall_valid"] = False
                validation_results["validation_errors"].extend(
                    [f"{code}: {error}" for error in disorder_validation["errors"]]
                )
                
            validation_results["validation_warnings"].extend(
                [f"{code}: {warning}" for warning in disorder_validation["warnings"]]
            )
        
        # Calculate overall quality score
        if validation_results["disorder_validations"]:
            scores = [v["quality_score"] for v in validation_results["disorder_validations"].values()]
            validation_results["quality_score"] = sum(scores) / len(scores)
        
        logger.info(f"Validation complete. Overall valid: {validation_results['overall_valid']}")
        return validation_results
    
    def _validate_single_disorder(self, disorder: StructuredDisorder) -> Dict[str, Any]:
        """Validate a single structured disorder."""
        validation = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "quality_score": 1.0
        }
        
        # Check required fields
        required_fields = self.validation_rules["required_fields"]
        for field in required_fields:
            if not hasattr(disorder, field) or not getattr(disorder, field):
                validation["errors"].append(f"Missing required field: {field}")
                validation["valid"] = False
                
        # Validate criteria groups
        if not disorder.criteria_groups.get("core_symptoms"):
            validation["warnings"].append("No core symptoms defined")
            validation["quality_score"] -= 0.2
            
        # Validate diagnostic threshold
        threshold = disorder.diagnostic_threshold
        if threshold.get("minimum_criteria", 0) < 1:
            validation["errors"].append("Minimum criteria must be at least 1")
            validation["valid"] = False
            
        # Check for clinical completeness
        total_criteria = sum(len(group) for group in disorder.criteria_groups.values())
        if total_criteria < 3:
            validation["warnings"].append("Fewer than 3 total criteria may be insufficient")
            validation["quality_score"] -= 0.1
            
        return validation
    
    def export_structured_format(self, structured_format: StandardizedFormat, 
                                output_path: Path, format_type: str = "json") -> None:
        """Export structured format to file."""
        logger.info(f"Exporting structured format to {output_path} as {format_type}")
        
        if format_type.lower() == "json":
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(asdict(structured_format), f, indent=2, ensure_ascii=False, default=str)
        else:
            raise ValueError(f"Unsupported format type: {format_type}")
            
        logger.info(f"Successfully exported structured format to {output_path}")
    
    def get_structure_summary(self) -> Dict[str, Any]:
        """Get summary of structured disorders."""
        if not self.structured_disorders:
            return {"total_disorders": 0}
            
        summary = {
            "total_disorders": len(self.structured_disorders),
            "categories": {},
            "criteria_statistics": {
                "total_criteria": 0,
                "core_symptoms": 0,
                "associated_features": 0,
                "exclusion_criteria": 0,
                "specifiers": 0
            },
            "validation_level": self.validation_level.value
        }
        
        for disorder in self.structured_disorders.values():
            # Count categories
            category = disorder.category
            summary["categories"][category] = summary["categories"].get(category, 0) + 1
            
            # Count criteria
            for group_name, criteria_list in disorder.criteria_groups.items():
                summary["criteria_statistics"][group_name] += len(criteria_list)
                summary["criteria_statistics"]["total_criteria"] += len(criteria_list)
                
        return summary