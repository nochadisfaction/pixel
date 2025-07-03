"""
DSM-5 Clinical Standards Validation System

Validates DSM-5 extraction against established clinical standards,
ensuring accuracy, completeness, and compliance with diagnostic criteria.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Set, Tuple
from pathlib import Path
from enum import Enum
import re
from collections import defaultdict

logger = logging.getLogger(__name__)


class ValidationLevel(Enum):
    """Validation strictness levels."""
    STRICT = "strict"
    MODERATE = "moderate"
    LENIENT = "lenient"


class ValidationCategory(Enum):
    """Categories of validation checks."""
    DIAGNOSTIC_CRITERIA = "diagnostic_criteria"
    CLINICAL_ACCURACY = "clinical_accuracy"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    SAFETY_COMPLIANCE = "safety_compliance"


class ValidationSeverity(Enum):
    """Severity levels for validation issues."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class ValidationIssue:
    """Individual validation issue."""
    issue_id: str
    category: ValidationCategory
    severity: ValidationSeverity
    description: str
    disorder_code: Optional[str] = None
    criterion_id: Optional[str] = None
    recommendation: Optional[str] = None
    clinical_impact: Optional[str] = None


@dataclass
class ValidationResult:
    """Complete validation result for a disorder."""
    disorder_code: str
    disorder_name: str
    overall_score: float
    category_scores: Dict[ValidationCategory, float]
    issues: List[ValidationIssue]
    passed_checks: List[str]
    clinical_compliance: bool
    safety_approved: bool


@dataclass
class ClinicalStandard:
    """Clinical standard definition."""
    standard_id: str
    category: ValidationCategory
    description: str
    validation_rule: str
    severity_if_failed: ValidationSeverity
    clinical_rationale: str


class DSM5ClinicalValidator:
    """Validates DSM-5 extraction against clinical standards."""
    
    def __init__(self, validation_level: ValidationLevel = ValidationLevel.MODERATE):
        self.validation_level = validation_level
        self.clinical_standards = self._define_clinical_standards()
        self.validation_results: Dict[str, ValidationResult] = {}
        
    def validate_dsm5_extraction(self, disorders: Dict[str, Any], 
                                structured_data: Dict[str, Any],
                                symptom_mappings: Dict[str, Any],
                                conversation_templates: Dict[str, Any]) -> Dict[str, ValidationResult]:
        """Validate complete DSM-5 extraction against clinical standards."""
        logger.info(f"Validating DSM-5 extraction for {len(disorders)} disorders")
        
        for disorder_code, disorder_data in disorders.items():
            result = self._validate_single_disorder(
                disorder_code, disorder_data, structured_data, 
                symptom_mappings, conversation_templates
            )
            self.validation_results[disorder_code] = result
            
        logger.info(f"Validation complete. Results for {len(self.validation_results)} disorders")
        return self.validation_results
    
    def _validate_single_disorder(self, disorder_code: str, disorder_data: Any,
                                 structured_data: Dict[str, Any],
                                 symptom_mappings: Dict[str, Any],
                                 conversation_templates: Dict[str, Any]) -> ValidationResult:
        """Validate a single disorder against clinical standards."""
        
        disorder_name = getattr(disorder_data, 'disorder_name', 'Unknown')
        issues = []
        passed_checks = []
        category_scores = {}
        
        # Run validation checks for each category
        for category in ValidationCategory:
            category_issues, category_passed = self._validate_category(
                category, disorder_code, disorder_data, structured_data,
                symptom_mappings, conversation_templates
            )
            
            issues.extend(category_issues)
            passed_checks.extend(category_passed)
            
            # Calculate category score
            total_checks = len(category_issues) + len(category_passed)
            if total_checks > 0:
                category_scores[category] = len(category_passed) / total_checks
            else:
                category_scores[category] = 1.0
        
        # Calculate overall score
        overall_score = sum(category_scores.values()) / len(category_scores) if category_scores else 0.0
        
        # Determine clinical compliance and safety approval
        clinical_compliance = self._assess_clinical_compliance(issues)
        safety_approved = self._assess_safety_approval(issues)
        
        return ValidationResult(
            disorder_code=disorder_code,
            disorder_name=disorder_name,
            overall_score=overall_score,
            category_scores=category_scores,
            issues=issues,
            passed_checks=passed_checks,
            clinical_compliance=clinical_compliance,
            safety_approved=safety_approved
        )
    
    def _validate_category(self, category: ValidationCategory, disorder_code: str,
                          disorder_data: Any, structured_data: Dict[str, Any],
                          symptom_mappings: Dict[str, Any],
                          conversation_templates: Dict[str, Any]) -> Tuple[List[ValidationIssue], List[str]]:
        """Validate a specific category of standards."""
        
        issues = []
        passed_checks = []
        
        # Get standards for this category
        category_standards = [s for s in self.clinical_standards if s.category == category]
        
        for standard in category_standards:
            try:
                is_valid, issue_description = self._check_standard(
                    standard, disorder_code, disorder_data, structured_data,
                    symptom_mappings, conversation_templates
                )
                
                if is_valid:
                    passed_checks.append(f"{category.value}: {standard.description}")
                else:
                    issue = ValidationIssue(
                        issue_id=f"{disorder_code}_{standard.standard_id}",
                        category=category,
                        severity=standard.severity_if_failed,
                        description=issue_description or f"Failed: {standard.description}",
                        disorder_code=disorder_code,
                        recommendation=self._generate_recommendation(standard, disorder_data),
                        clinical_impact=self._assess_clinical_impact(standard, disorder_data)
                    )
                    issues.append(issue)
                    
            except Exception as e:
                logger.warning(f"Error validating standard {standard.standard_id}: {e}")
                
        return issues, passed_checks
    
    def _check_standard(self, standard: ClinicalStandard, disorder_code: str,
                       disorder_data: Any, structured_data: Dict[str, Any],
                       symptom_mappings: Dict[str, Any],
                       conversation_templates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Check a specific clinical standard."""
        
        if standard.category == ValidationCategory.DIAGNOSTIC_CRITERIA:
            return self._check_diagnostic_criteria_standard(standard, disorder_data)
        elif standard.category == ValidationCategory.CLINICAL_ACCURACY:
            return self._check_clinical_accuracy_standard(standard, disorder_data)
        elif standard.category == ValidationCategory.COMPLETENESS:
            return self._check_completeness_standard(standard, disorder_data, structured_data)
        elif standard.category == ValidationCategory.CONSISTENCY:
            return self._check_consistency_standard(standard, disorder_data, symptom_mappings)
        elif standard.category == ValidationCategory.SAFETY_COMPLIANCE:
            return self._check_safety_compliance_standard(standard, disorder_data, conversation_templates)
        else:
            return True, None
    
    def _check_diagnostic_criteria_standard(self, standard: ClinicalStandard, 
                                          disorder_data: Any) -> Tuple[bool, Optional[str]]:
        """Check diagnostic criteria standards."""
        
        criteria = getattr(disorder_data, 'criteria', [])
        
        if standard.standard_id == "minimum_criteria_count":
            if len(criteria) < 3:
                return False, f"Only {len(criteria)} criteria defined, minimum 3 required"
            return True, None
            
        elif standard.standard_id == "required_criteria_present":
            required_criteria = [c for c in criteria if getattr(c, 'required', False)]
            if len(required_criteria) < 1:
                return False, "No required criteria defined"
            return True, None
            
        elif standard.standard_id == "duration_requirements":
            has_duration = any(getattr(c, 'duration_requirement', None) for c in criteria)
            if not has_duration:
                return False, "No duration requirements specified"
            return True, None
            
        elif standard.standard_id == "exclusion_criteria":
            differential_diagnosis = getattr(disorder_data, 'differential_diagnosis', [])
            if len(differential_diagnosis) < 2:
                return False, f"Only {len(differential_diagnosis)} differential diagnoses, minimum 2 recommended"
            return True, None
            
        return True, None
    
    def _check_clinical_accuracy_standard(self, standard: ClinicalStandard,
                                        disorder_data: Any) -> Tuple[bool, Optional[str]]:
        """Check clinical accuracy standards."""
        
        if standard.standard_id == "disorder_code_format":
            disorder_code = getattr(disorder_data, 'disorder_code', '')
            if not re.match(r'^\d{3}\.\d{1,2}$', disorder_code):
                return False, f"Invalid disorder code format: {disorder_code}"
            return True, None
            
        elif standard.standard_id == "clinical_features_present":
            clinical_features = getattr(disorder_data, 'clinical_features', [])
            if len(clinical_features) < 3:
                return False, f"Only {len(clinical_features)} clinical features, minimum 3 required"
            return True, None
            
        elif standard.standard_id == "prevalence_data":
            prevalence_data = getattr(disorder_data, 'prevalence_data', {})
            if not prevalence_data:
                return False, "No prevalence data provided"
            return True, None
            
        elif standard.standard_id == "severity_levels":
            severity_levels = getattr(disorder_data, 'severity_levels', [])
            if len(severity_levels) < 2:
                return False, f"Only {len(severity_levels)} severity levels, minimum 2 required"
            return True, None
            
        return True, None
    
    def _check_completeness_standard(self, standard: ClinicalStandard, disorder_data: Any,
                                   structured_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Check completeness standards."""
        
        if standard.standard_id == "all_required_fields":
            required_fields = ['disorder_code', 'disorder_name', 'category', 'criteria']
            missing_fields = []
            
            for field in required_fields:
                if not hasattr(disorder_data, field) or not getattr(disorder_data, field):
                    missing_fields.append(field)
                    
            if missing_fields:
                return False, f"Missing required fields: {', '.join(missing_fields)}"
            return True, None
            
        elif standard.standard_id == "structured_format_complete":
            disorder_code = getattr(disorder_data, 'disorder_code', '')
            if disorder_code not in structured_data.get('disorders', {}):
                return False, "Disorder not found in structured format"
            return True, None
            
        return True, None
    
    def _check_consistency_standard(self, standard: ClinicalStandard, disorder_data: Any,
                                  symptom_mappings: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Check consistency standards."""
        
        if standard.standard_id == "symptom_mapping_consistency":
            disorder_code = getattr(disorder_data, 'disorder_code', '')
            if disorder_code not in symptom_mappings:
                return False, "No symptom mapping found for disorder"
            return True, None
            
        elif standard.standard_id == "criteria_description_quality":
            criteria = getattr(disorder_data, 'criteria', [])
            for criterion in criteria:
                description = getattr(criterion, 'description', '')
                if len(description) < 10:
                    return False, f"Criterion description too short: '{description}'"
            return True, None
            
        return True, None
    
    def _check_safety_compliance_standard(self, standard: ClinicalStandard, disorder_data: Any,
                                        conversation_templates: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Check safety compliance standards."""
        
        if standard.standard_id == "crisis_assessment_present":
            # Check if disorder has potential for crisis
            criteria = getattr(disorder_data, 'criteria', [])
            has_crisis_potential = any(
                'suicide' in getattr(c, 'description', '').lower() or 
                'death' in getattr(c, 'description', '').lower()
                for c in criteria
            )
            
            if has_crisis_potential:
                disorder_code = getattr(disorder_data, 'disorder_code', '')
                templates = conversation_templates.get(disorder_code, [])
                has_crisis_template = any(
                    t.get('conversation_type') == 'crisis_assessment' for t in templates
                )
                
                if not has_crisis_template:
                    return False, "Crisis assessment template missing for disorder with crisis potential"
                    
            return True, None
            
        elif standard.standard_id == "safety_protocols_defined":
            disorder_code = getattr(disorder_data, 'disorder_code', '')
            templates = conversation_templates.get(disorder_code, [])
            
            for template in templates:
                crisis_protocols = template.get('crisis_protocols', [])
                if not crisis_protocols and template.get('conversation_type') == 'crisis_assessment':
                    return False, "Crisis protocols not defined for crisis assessment template"
                    
            return True, None
            
        return True, None
    
    def _generate_recommendation(self, standard: ClinicalStandard, disorder_data: Any) -> str:
        """Generate recommendation for failed standard."""
        
        recommendations = {
            "minimum_criteria_count": "Add additional diagnostic criteria to meet clinical standards",
            "required_criteria_present": "Define at least one criterion as required for diagnosis",
            "duration_requirements": "Specify duration requirements for key diagnostic criteria",
            "exclusion_criteria": "Add differential diagnoses to improve diagnostic accuracy",
            "disorder_code_format": "Use standard DSM-5 disorder code format (XXX.XX)",
            "clinical_features_present": "Add more clinical features to improve diagnostic clarity",
            "prevalence_data": "Include prevalence data for clinical context",
            "severity_levels": "Define multiple severity levels (mild, moderate, severe)",
            "all_required_fields": "Complete all required disorder fields",
            "structured_format_complete": "Ensure disorder is properly structured",
            "symptom_mapping_consistency": "Create symptom mapping for disorder",
            "criteria_description_quality": "Improve criterion descriptions with more detail",
            "crisis_assessment_present": "Add crisis assessment template for safety",
            "safety_protocols_defined": "Define crisis intervention protocols"
        }
        
        return recommendations.get(standard.standard_id, "Review and improve based on clinical standards")
    
    def _assess_clinical_impact(self, standard: ClinicalStandard, disorder_data: Any) -> str:
        """Assess clinical impact of failed standard."""
        
        high_impact_standards = [
            "required_criteria_present", "crisis_assessment_present", 
            "safety_protocols_defined", "disorder_code_format"
        ]
        
        medium_impact_standards = [
            "minimum_criteria_count", "duration_requirements", 
            "clinical_features_present", "severity_levels"
        ]
        
        if standard.standard_id in high_impact_standards:
            return "High impact on diagnostic accuracy and patient safety"
        elif standard.standard_id in medium_impact_standards:
            return "Medium impact on clinical utility and diagnostic precision"
        else:
            return "Low impact on overall clinical effectiveness"
    
    def _assess_clinical_compliance(self, issues: List[ValidationIssue]) -> bool:
        """Assess overall clinical compliance."""
        
        critical_issues = [i for i in issues if i.severity == ValidationSeverity.CRITICAL]
        high_issues = [i for i in issues if i.severity == ValidationSeverity.HIGH]
        
        # Fail if any critical issues or more than 2 high issues
        if critical_issues or len(high_issues) > 2:
            return False
        return True
    
    def _assess_safety_approval(self, issues: List[ValidationIssue]) -> bool:
        """Assess safety approval status."""
        
        safety_issues = [i for i in issues if i.category == ValidationCategory.SAFETY_COMPLIANCE]
        critical_safety_issues = [i for i in safety_issues if i.severity in [ValidationSeverity.CRITICAL, ValidationSeverity.HIGH]]
        
        return len(critical_safety_issues) == 0
    
    def _define_clinical_standards(self) -> List[ClinicalStandard]:
        """Define clinical standards for validation."""
        
        standards = []
        
        # Diagnostic Criteria Standards
        standards.extend([
            ClinicalStandard(
                standard_id="minimum_criteria_count",
                category=ValidationCategory.DIAGNOSTIC_CRITERIA,
                description="Minimum number of diagnostic criteria",
                validation_rule="At least 3 diagnostic criteria required",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Adequate criteria ensure diagnostic reliability"
            ),
            ClinicalStandard(
                standard_id="required_criteria_present",
                category=ValidationCategory.DIAGNOSTIC_CRITERIA,
                description="Required criteria identification",
                validation_rule="At least one criterion must be marked as required",
                severity_if_failed=ValidationSeverity.HIGH,
                clinical_rationale="Required criteria define core diagnostic features"
            ),
            ClinicalStandard(
                standard_id="duration_requirements",
                category=ValidationCategory.DIAGNOSTIC_CRITERIA,
                description="Duration requirements specified",
                validation_rule="Duration requirements must be specified for key criteria",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Duration requirements distinguish disorders from transient states"
            ),
            ClinicalStandard(
                standard_id="exclusion_criteria",
                category=ValidationCategory.DIAGNOSTIC_CRITERIA,
                description="Differential diagnosis provided",
                validation_rule="At least 2 differential diagnoses required",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Differential diagnosis improves diagnostic accuracy"
            )
        ])
        
        # Clinical Accuracy Standards
        standards.extend([
            ClinicalStandard(
                standard_id="disorder_code_format",
                category=ValidationCategory.CLINICAL_ACCURACY,
                description="Standard disorder code format",
                validation_rule="Disorder code must follow DSM-5 format (XXX.XX)",
                severity_if_failed=ValidationSeverity.HIGH,
                clinical_rationale="Standard codes ensure clinical interoperability"
            ),
            ClinicalStandard(
                standard_id="clinical_features_present",
                category=ValidationCategory.CLINICAL_ACCURACY,
                description="Clinical features documented",
                validation_rule="At least 3 clinical features required",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Clinical features aid in recognition and assessment"
            ),
            ClinicalStandard(
                standard_id="prevalence_data",
                category=ValidationCategory.CLINICAL_ACCURACY,
                description="Prevalence data included",
                validation_rule="Prevalence data should be provided for clinical context",
                severity_if_failed=ValidationSeverity.LOW,
                clinical_rationale="Prevalence data informs clinical decision-making"
            ),
            ClinicalStandard(
                standard_id="severity_levels",
                category=ValidationCategory.CLINICAL_ACCURACY,
                description="Severity levels defined",
                validation_rule="At least 2 severity levels required",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Severity levels guide treatment intensity"
            )
        ])
        
        # Completeness Standards
        standards.extend([
            ClinicalStandard(
                standard_id="all_required_fields",
                category=ValidationCategory.COMPLETENESS,
                description="All required fields present",
                validation_rule="All required disorder fields must be completed",
                severity_if_failed=ValidationSeverity.HIGH,
                clinical_rationale="Complete information ensures clinical utility"
            ),
            ClinicalStandard(
                standard_id="structured_format_complete",
                category=ValidationCategory.COMPLETENESS,
                description="Structured format completeness",
                validation_rule="Disorder must be present in structured format",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Structured format enables systematic processing"
            )
        ])
        
        # Consistency Standards
        standards.extend([
            ClinicalStandard(
                standard_id="symptom_mapping_consistency",
                category=ValidationCategory.CONSISTENCY,
                description="Symptom mapping consistency",
                validation_rule="Symptom mapping must exist for disorder",
                severity_if_failed=ValidationSeverity.MEDIUM,
                clinical_rationale="Consistent symptom mapping enables accurate assessment"
            ),
            ClinicalStandard(
                standard_id="criteria_description_quality",
                category=ValidationCategory.CONSISTENCY,
                description="Criteria description quality",
                validation_rule="Criterion descriptions must be adequately detailed",
                severity_if_failed=ValidationSeverity.LOW,
                clinical_rationale="Detailed descriptions improve diagnostic clarity"
            )
        ])
        
        # Safety Compliance Standards
        standards.extend([
            ClinicalStandard(
                standard_id="crisis_assessment_present",
                category=ValidationCategory.SAFETY_COMPLIANCE,
                description="Crisis assessment availability",
                validation_rule="Crisis assessment required for disorders with crisis potential",
                severity_if_failed=ValidationSeverity.CRITICAL,
                clinical_rationale="Crisis assessment ensures patient safety"
            ),
            ClinicalStandard(
                standard_id="safety_protocols_defined",
                category=ValidationCategory.SAFETY_COMPLIANCE,
                description="Safety protocols defined",
                validation_rule="Safety protocols must be defined for crisis situations",
                severity_if_failed=ValidationSeverity.CRITICAL,
                clinical_rationale="Safety protocols protect patients and clinicians"
            )
        ])
        
        return standards
    
    def get_validation_summary(self) -> Dict[str, Any]:
        """Get summary of validation results."""
        
        if not self.validation_results:
            return {"total_validations": 0}
        
        summary = {
            "total_disorders": len(self.validation_results),
            "overall_compliance_rate": 0.0,
            "safety_approval_rate": 0.0,
            "average_score": 0.0,
            "category_performance": {},
            "issue_distribution": defaultdict(int),
            "severity_distribution": defaultdict(int)
        }
        
        compliant_count = 0
        safety_approved_count = 0
        total_score = 0.0
        category_totals = defaultdict(float)
        
        for result in self.validation_results.values():
            if result.clinical_compliance:
                compliant_count += 1
            if result.safety_approved:
                safety_approved_count += 1
                
            total_score += result.overall_score
            
            # Aggregate category scores
            for category, score in result.category_scores.items():
                category_totals[category.value] += score
                
            # Count issues
            for issue in result.issues:
                summary["issue_distribution"][issue.category.value] += 1
                summary["severity_distribution"][issue.severity.value] += 1
        
        # Calculate rates and averages
        total_disorders = len(self.validation_results)
        summary["overall_compliance_rate"] = compliant_count / total_disorders
        summary["safety_approval_rate"] = safety_approved_count / total_disorders
        summary["average_score"] = total_score / total_disorders
        
        # Calculate category performance
        for category, total in category_totals.items():
            summary["category_performance"][category] = total / total_disorders
        
        return dict(summary)
    
    def export_validation_results(self, output_path: Path) -> None:
        """Export validation results to JSON."""
        logger.info(f"Exporting validation results to {output_path}")
        
        export_data = {
            "metadata": {
                "version": "1.0",
                "validation_level": self.validation_level.value,
                "total_disorders": len(self.validation_results),
                "total_standards": len(self.clinical_standards)
            },
            "clinical_standards": [asdict(s) for s in self.clinical_standards],
            "validation_results": {k: asdict(v) for k, v in self.validation_results.items()},
            "summary": self.get_validation_summary()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Successfully exported validation results to {output_path}")