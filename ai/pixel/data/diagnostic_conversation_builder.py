"""
Diagnostic Conversation Template Builder

Builds comprehensive diagnostic conversation templates for each DSM-5 disorder,
including assessment flows, therapeutic responses, and clinical decision trees.
"""

import json
import logging
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
from enum import Enum
import random

logger = logging.getLogger(__name__)


class ConversationType(Enum):
    """Types of diagnostic conversations."""
    INITIAL_ASSESSMENT = "initial_assessment"
    SYMPTOM_EXPLORATION = "symptom_exploration"
    SEVERITY_ASSESSMENT = "severity_assessment"
    DIFFERENTIAL_DIAGNOSIS = "differential_diagnosis"
    CRISIS_ASSESSMENT = "crisis_assessment"
    TREATMENT_PLANNING = "treatment_planning"


class ResponseType(Enum):
    """Types of therapeutic responses."""
    EMPATHETIC = "empathetic"
    EXPLORATORY = "exploratory"
    CLARIFYING = "clarifying"
    SUPPORTIVE = "supportive"
    EDUCATIONAL = "educational"
    CRISIS_INTERVENTION = "crisis_intervention"


class ConversationFlow(Enum):
    """Conversation flow patterns."""
    LINEAR = "linear"
    BRANCHING = "branching"
    ADAPTIVE = "adaptive"
    CRISIS_FOCUSED = "crisis_focused"


@dataclass
class ConversationTurn:
    """Single turn in a diagnostic conversation."""
    turn_id: str
    speaker: str  # "client" or "therapist"
    content: str
    response_type: Optional[ResponseType] = None
    clinical_notes: List[str] = None
    follow_up_options: List[str] = None
    
    def __post_init__(self):
        if self.clinical_notes is None:
            self.clinical_notes = []
        if self.follow_up_options is None:
            self.follow_up_options = []


@dataclass
class ConversationBranch:
    """Branching path in conversation."""
    branch_id: str
    condition: str
    turns: List[ConversationTurn]
    next_branches: List[str] = None
    
    def __post_init__(self):
        if self.next_branches is None:
            self.next_branches = []


@dataclass
class DiagnosticConversationTemplate:
    """Complete diagnostic conversation template."""
    template_id: str
    disorder_code: str
    disorder_name: str
    conversation_type: ConversationType
    conversation_flow: ConversationFlow
    opening_turns: List[ConversationTurn]
    main_branches: List[ConversationBranch]
    closing_turns: List[ConversationTurn]
    crisis_protocols: List[ConversationTurn]
    assessment_goals: List[str]
    clinical_decision_points: List[str]


class DiagnosticConversationBuilder:
    """Builds diagnostic conversation templates for disorders."""
    
    def __init__(self):
        self.conversation_templates: Dict[str, List[DiagnosticConversationTemplate]] = {}
        self.response_patterns = self._build_response_patterns()
        
    def build_diagnostic_conversations(self, disorders: Dict[str, Any], 
                                     symptom_mappings: Dict[str, Any]) -> Dict[str, List[DiagnosticConversationTemplate]]:
        """Build diagnostic conversation templates for all disorders."""
        logger.info(f"Building diagnostic conversations for {len(disorders)} disorders")
        
        for disorder_code, disorder_data in disorders.items():
            templates = self._build_disorder_conversations(
                disorder_code, disorder_data, symptom_mappings.get(disorder_code, {})
            )
            self.conversation_templates[disorder_code] = templates
            
        logger.info(f"Built {sum(len(templates) for templates in self.conversation_templates.values())} conversation templates")
        return self.conversation_templates
    
    def _build_disorder_conversations(self, disorder_code: str, disorder_data: Any, 
                                    symptom_mapping: Dict[str, Any]) -> List[DiagnosticConversationTemplate]:
        """Build conversation templates for a single disorder."""
        
        templates = []
        disorder_name = getattr(disorder_data, 'disorder_name', 'Unknown')
        
        # Build different types of conversations
        conversation_types = [
            ConversationType.INITIAL_ASSESSMENT,
            ConversationType.SYMPTOM_EXPLORATION,
            ConversationType.SEVERITY_ASSESSMENT,
            ConversationType.CRISIS_ASSESSMENT
        ]
        
        for conv_type in conversation_types:
            template = self._build_single_conversation_template(
                disorder_code, disorder_name, disorder_data, symptom_mapping, conv_type
            )
            templates.append(template)
            
        return templates
    
    def _build_single_conversation_template(self, disorder_code: str, disorder_name: str,
                                          disorder_data: Any, symptom_mapping: Dict[str, Any],
                                          conversation_type: ConversationType) -> DiagnosticConversationTemplate:
        """Build a single conversation template."""
        
        template_id = f"{disorder_code}_{conversation_type.value}"
        
        # Determine conversation flow
        flow = self._determine_conversation_flow(conversation_type, disorder_data)
        
        # Build opening turns
        opening_turns = self._build_opening_turns(conversation_type, disorder_name)
        
        # Build main conversation branches
        main_branches = self._build_main_branches(conversation_type, disorder_data, symptom_mapping)
        
        # Build closing turns
        closing_turns = self._build_closing_turns(conversation_type)
        
        # Build crisis protocols
        crisis_protocols = self._build_crisis_protocols(disorder_data)
        
        # Define assessment goals
        assessment_goals = self._define_assessment_goals(conversation_type, disorder_data)
        
        # Define clinical decision points
        decision_points = self._define_clinical_decision_points(conversation_type, disorder_data)
        
        return DiagnosticConversationTemplate(
            template_id=template_id,
            disorder_code=disorder_code,
            disorder_name=disorder_name,
            conversation_type=conversation_type,
            conversation_flow=flow,
            opening_turns=opening_turns,
            main_branches=main_branches,
            closing_turns=closing_turns,
            crisis_protocols=crisis_protocols,
            assessment_goals=assessment_goals,
            clinical_decision_points=decision_points
        )
    
    def _determine_conversation_flow(self, conversation_type: ConversationType, 
                                   disorder_data: Any) -> ConversationFlow:
        """Determine appropriate conversation flow."""
        
        # Check for crisis indicators
        criteria = getattr(disorder_data, 'criteria', [])
        has_crisis_criteria = any(
            'suicide' in getattr(c, 'description', '').lower() or 
            'death' in getattr(c, 'description', '').lower()
            for c in criteria
        )
        
        if conversation_type == ConversationType.CRISIS_ASSESSMENT or has_crisis_criteria:
            return ConversationFlow.CRISIS_FOCUSED
        elif conversation_type == ConversationType.INITIAL_ASSESSMENT:
            return ConversationFlow.BRANCHING
        elif conversation_type == ConversationType.SYMPTOM_EXPLORATION:
            return ConversationFlow.ADAPTIVE
        else:
            return ConversationFlow.LINEAR
    
    def _build_opening_turns(self, conversation_type: ConversationType, 
                           disorder_name: str) -> List[ConversationTurn]:
        """Build opening conversation turns."""
        
        turns = []
        
        if conversation_type == ConversationType.INITIAL_ASSESSMENT:
            # Client opening
            client_openings = [
                "I've been struggling with some mental health issues lately.",
                "I think I might need help with my emotional well-being.",
                "I'm not feeling like myself and I'm worried about it.",
                "My family suggested I talk to someone about how I've been feeling."
            ]
            
            turns.append(ConversationTurn(
                turn_id="opening_client_1",
                speaker="client",
                content=random.choice(client_openings),
                clinical_notes=["Initial presentation", "Client-initiated concern"]
            ))
            
            # Therapist response
            turns.append(ConversationTurn(
                turn_id="opening_therapist_1",
                speaker="therapist",
                content="Thank you for coming in today. It takes courage to reach out for help. Can you tell me more about what's been going on?",
                response_type=ResponseType.EMPATHETIC,
                clinical_notes=["Validation and encouragement", "Open-ended exploration"],
                follow_up_options=[
                    "Explore specific symptoms",
                    "Assess timeline of concerns",
                    "Evaluate functional impact"
                ]
            ))
            
        elif conversation_type == ConversationType.CRISIS_ASSESSMENT:
            turns.append(ConversationTurn(
                turn_id="crisis_opening_client_1",
                speaker="client",
                content="I'm having thoughts that scare me and I don't know what to do.",
                clinical_notes=["Potential crisis presentation", "Immediate safety assessment needed"]
            ))
            
            turns.append(ConversationTurn(
                turn_id="crisis_opening_therapist_1",
                speaker="therapist",
                content="I'm glad you reached out. Your safety is my priority. Can you tell me more about these thoughts you're having?",
                response_type=ResponseType.CRISIS_INTERVENTION,
                clinical_notes=["Immediate safety focus", "Crisis assessment protocol"],
                follow_up_options=[
                    "Assess suicidal ideation",
                    "Evaluate immediate safety",
                    "Explore support systems"
                ]
            ))
            
        return turns
    
    def _build_main_branches(self, conversation_type: ConversationType, 
                           disorder_data: Any, symptom_mapping: Dict[str, Any]) -> List[ConversationBranch]:
        """Build main conversation branches."""
        
        branches = []
        criteria = getattr(disorder_data, 'criteria', [])
        
        if conversation_type == ConversationType.SYMPTOM_EXPLORATION:
            # Create branches for each major criterion
            for i, criterion in enumerate(criteria[:3]):  # Limit to 3 main criteria
                branch = self._build_symptom_exploration_branch(criterion, i)
                branches.append(branch)
                
        elif conversation_type == ConversationType.SEVERITY_ASSESSMENT:
            # Create severity assessment branches
            severity_branch = self._build_severity_assessment_branch(disorder_data)
            branches.append(severity_branch)
            
        elif conversation_type == ConversationType.CRISIS_ASSESSMENT:
            # Create crisis assessment branches
            crisis_branch = self._build_crisis_assessment_branch(disorder_data)
            branches.append(crisis_branch)
            
        return branches
    
    def _build_symptom_exploration_branch(self, criterion: Any, index: int) -> ConversationBranch:
        """Build a symptom exploration branch."""
        
        criterion_desc = getattr(criterion, 'description', 'Unknown symptom')
        branch_id = f"symptom_exploration_{index}"
        
        turns = []
        
        # Client describes symptom
        client_descriptions = self._generate_client_symptom_descriptions(criterion_desc)
        turns.append(ConversationTurn(
            turn_id=f"{branch_id}_client_1",
            speaker="client",
            content=random.choice(client_descriptions),
            clinical_notes=[f"Symptom presentation: {criterion_desc}"]
        ))
        
        # Therapist explores further
        exploration_questions = self._generate_exploration_questions(criterion_desc)
        turns.append(ConversationTurn(
            turn_id=f"{branch_id}_therapist_1",
            speaker="therapist",
            content=random.choice(exploration_questions),
            response_type=ResponseType.EXPLORATORY,
            clinical_notes=["Symptom exploration", "Gathering clinical details"],
            follow_up_options=[
                "Assess frequency and duration",
                "Explore impact on functioning",
                "Evaluate severity level"
            ]
        ))
        
        return ConversationBranch(
            branch_id=branch_id,
            condition=f"Exploring {criterion_desc}",
            turns=turns
        )
    
    def _build_severity_assessment_branch(self, disorder_data: Any) -> ConversationBranch:
        """Build severity assessment branch."""
        
        turns = []
        
        # Client describes impact
        turns.append(ConversationTurn(
            turn_id="severity_client_1",
            speaker="client",
            content="It's really affecting my daily life. I can barely function at work and my relationships are suffering.",
            clinical_notes=["Functional impairment reported", "Multiple life domains affected"]
        ))
        
        # Therapist assesses severity
        turns.append(ConversationTurn(
            turn_id="severity_therapist_1",
            speaker="therapist",
            content="It sounds like these symptoms are having a significant impact on your life. Can you help me understand how severe this feels on a scale of 1 to 10?",
            response_type=ResponseType.CLARIFYING,
            clinical_notes=["Severity assessment", "Functional impact evaluation"],
            follow_up_options=[
                "Explore specific functional domains",
                "Assess duration of impairment",
                "Evaluate need for immediate intervention"
            ]
        ))
        
        return ConversationBranch(
            branch_id="severity_assessment",
            condition="Assessing symptom severity and functional impact",
            turns=turns
        )
    
    def _build_crisis_assessment_branch(self, disorder_data: Any) -> ConversationBranch:
        """Build crisis assessment branch."""
        
        turns = []
        
        # Client expresses crisis thoughts
        turns.append(ConversationTurn(
            turn_id="crisis_client_1",
            speaker="client",
            content="Sometimes I think about ending it all. I feel like such a burden to everyone.",
            clinical_notes=["Suicidal ideation expressed", "Feelings of worthlessness", "IMMEDIATE SAFETY ASSESSMENT REQUIRED"]
        ))
        
        # Therapist crisis response
        turns.append(ConversationTurn(
            turn_id="crisis_therapist_1",
            speaker="therapist",
            content="Thank you for trusting me with something so important. I want to make sure you're safe. When you say 'ending it all,' are you having thoughts of hurting yourself?",
            response_type=ResponseType.CRISIS_INTERVENTION,
            clinical_notes=["Direct suicide assessment", "Safety prioritization", "Crisis intervention protocol"],
            follow_up_options=[
                "Assess specific suicidal plans",
                "Evaluate protective factors",
                "Determine immediate safety needs",
                "Consider hospitalization if necessary"
            ]
        ))
        
        return ConversationBranch(
            branch_id="crisis_assessment",
            condition="Crisis intervention and safety assessment",
            turns=turns
        )
    
    def _build_closing_turns(self, conversation_type: ConversationType) -> List[ConversationTurn]:
        """Build closing conversation turns."""
        
        turns = []
        
        if conversation_type == ConversationType.CRISIS_ASSESSMENT:
            # Crisis closing with safety planning
            turns.append(ConversationTurn(
                turn_id="crisis_closing_therapist_1",
                speaker="therapist",
                content="Before we end today, let's create a safety plan together. Who can you call if you have these thoughts again?",
                response_type=ResponseType.CRISIS_INTERVENTION,
                clinical_notes=["Safety planning", "Crisis resource identification"]
            ))
            
        else:
            # Standard closing
            turns.append(ConversationTurn(
                turn_id="closing_therapist_1",
                speaker="therapist",
                content="Thank you for sharing so openly with me today. Based on what we've discussed, I'd like to schedule a follow-up appointment to continue exploring these concerns.",
                response_type=ResponseType.SUPPORTIVE,
                clinical_notes=["Session summary", "Treatment planning", "Follow-up scheduling"]
            ))
            
        return turns
    
    def _build_crisis_protocols(self, disorder_data: Any) -> List[ConversationTurn]:
        """Build crisis intervention protocols."""
        
        protocols = []
        
        # Check if disorder has crisis potential
        criteria = getattr(disorder_data, 'criteria', [])
        has_crisis_potential = any(
            'suicide' in getattr(c, 'description', '').lower() or 
            'death' in getattr(c, 'description', '').lower() or
            'harm' in getattr(c, 'description', '').lower()
            for c in criteria
        )
        
        if has_crisis_potential:
            protocols.extend([
                ConversationTurn(
                    turn_id="crisis_protocol_1",
                    speaker="therapist",
                    content="I need to ask you directly - are you having thoughts of hurting yourself or ending your life?",
                    response_type=ResponseType.CRISIS_INTERVENTION,
                    clinical_notes=["Direct suicide assessment", "Crisis protocol activation"]
                ),
                ConversationTurn(
                    turn_id="crisis_protocol_2",
                    speaker="therapist",
                    content="Your safety is my primary concern. Let's work together to make sure you have support and resources available.",
                    response_type=ResponseType.CRISIS_INTERVENTION,
                    clinical_notes=["Safety prioritization", "Resource mobilization"]
                )
            ])
            
        return protocols
    
    def _define_assessment_goals(self, conversation_type: ConversationType, 
                               disorder_data: Any) -> List[str]:
        """Define assessment goals for conversation type."""
        
        goals = []
        
        if conversation_type == ConversationType.INITIAL_ASSESSMENT:
            goals.extend([
                "Establish therapeutic rapport",
                "Gather presenting concerns",
                "Assess current functioning level",
                "Screen for immediate safety concerns",
                "Identify treatment goals"
            ])
            
        elif conversation_type == ConversationType.SYMPTOM_EXPLORATION:
            goals.extend([
                "Explore specific symptom presentations",
                "Assess symptom frequency and duration",
                "Evaluate functional impact",
                "Identify triggers and patterns",
                "Gather diagnostic information"
            ])
            
        elif conversation_type == ConversationType.CRISIS_ASSESSMENT:
            goals.extend([
                "Assess immediate safety",
                "Evaluate suicidal/homicidal ideation",
                "Identify protective factors",
                "Develop safety plan",
                "Determine level of care needed"
            ])
            
        return goals
    
    def _define_clinical_decision_points(self, conversation_type: ConversationType, 
                                       disorder_data: Any) -> List[str]:
        """Define clinical decision points."""
        
        decision_points = []
        
        if conversation_type == ConversationType.CRISIS_ASSESSMENT:
            decision_points.extend([
                "Immediate safety assessment required",
                "Consider involuntary commitment if imminent danger",
                "Activate crisis response team if available",
                "Document all safety planning interventions",
                "Ensure 24/7 crisis contact information provided"
            ])
            
        else:
            decision_points.extend([
                "Assess need for additional screening tools",
                "Consider referral for psychological testing",
                "Evaluate medication consultation needs",
                "Determine appropriate treatment modality",
                "Schedule follow-up based on severity"
            ])
            
        return decision_points
    
    def _generate_client_symptom_descriptions(self, criterion_desc: str) -> List[str]:
        """Generate realistic client descriptions of symptoms."""
        
        descriptions = []
        desc_lower = criterion_desc.lower()
        
        if 'depressed mood' in desc_lower:
            descriptions.extend([
                "I feel sad most of the time, like there's a heavy weight on my chest.",
                "I wake up feeling down and it doesn't get better throughout the day.",
                "Everything feels gray and hopeless. I can't remember the last time I felt happy."
            ])
            
        elif 'diminished interest' in desc_lower:
            descriptions.extend([
                "I used to love reading and hiking, but now nothing seems enjoyable.",
                "I don't care about things that used to matter to me.",
                "Even my favorite activities feel like a chore now."
            ])
            
        elif 'anxiety' in desc_lower or 'worry' in desc_lower:
            descriptions.extend([
                "I worry about everything constantly. My mind never stops racing.",
                "I feel anxious about things that never bothered me before.",
                "The worry is overwhelming and I can't turn it off."
            ])
            
        elif 'sleep' in desc_lower:
            descriptions.extend([
                "I either can't fall asleep or I wake up multiple times during the night.",
                "I'm exhausted but my mind won't let me rest.",
                "Sleep has become a real struggle for me."
            ])
            
        else:
            descriptions.extend([
                f"I've been experiencing {criterion_desc.lower()} and it's really affecting me.",
                f"The {criterion_desc.lower()} has been getting worse lately.",
                f"I'm struggling with {criterion_desc.lower()} and don't know what to do."
            ])
            
        return descriptions
    
    def _generate_exploration_questions(self, criterion_desc: str) -> List[str]:
        """Generate therapeutic exploration questions."""
        
        questions = []
        desc_lower = criterion_desc.lower()
        
        if 'mood' in desc_lower:
            questions.extend([
                "Can you help me understand what your mood feels like on a typical day?",
                "How long have you been experiencing these mood changes?",
                "Are there times when your mood feels different, or is it consistently low?"
            ])
            
        elif 'sleep' in desc_lower:
            questions.extend([
                "Tell me more about your sleep patterns. What does a typical night look like?",
                "How long have you been having sleep difficulties?",
                "How is the sleep problem affecting your daily functioning?"
            ])
            
        elif 'anxiety' in desc_lower or 'worry' in desc_lower:
            questions.extend([
                "What kinds of things do you find yourself worrying about most?",
                "How does the anxiety feel in your body?",
                "Are there specific situations that trigger more anxiety for you?"
            ])
            
        else:
            questions.extend([
                f"Can you tell me more about how {criterion_desc.lower()} shows up for you?",
                f"How long have you been experiencing {criterion_desc.lower()}?",
                f"How is {criterion_desc.lower()} impacting your daily life?"
            ])
            
        return questions
    
    def _build_response_patterns(self) -> Dict[ResponseType, List[str]]:
        """Build therapeutic response patterns."""
        
        return {
            ResponseType.EMPATHETIC: [
                "That sounds really difficult.",
                "I can hear how much you're struggling with this.",
                "It takes courage to share something so personal.",
                "Thank you for trusting me with this."
            ],
            ResponseType.EXPLORATORY: [
                "Can you tell me more about that?",
                "Help me understand what that experience is like for you.",
                "What does that look like in your daily life?",
                "How long have you been experiencing this?"
            ],
            ResponseType.CLARIFYING: [
                "Let me make sure I understand correctly...",
                "When you say [X], what do you mean exactly?",
                "Can you give me a specific example of that?",
                "Help me understand the difference between..."
            ],
            ResponseType.SUPPORTIVE: [
                "You're not alone in this.",
                "We can work through this together.",
                "You've taken an important step by being here.",
                "There are effective treatments available."
            ]
        }
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of conversation templates."""
        
        if not self.conversation_templates:
            return {"total_templates": 0}
        
        summary = {
            "total_disorders": len(self.conversation_templates),
            "total_templates": sum(len(templates) for templates in self.conversation_templates.values()),
            "conversation_types": {},
            "flow_types": {},
            "average_turns_per_template": 0
        }
        
        total_turns = 0
        template_count = 0
        
        for templates in self.conversation_templates.values():
            for template in templates:
                template_count += 1
                
                # Count conversation types
                conv_type = template.conversation_type.value
                summary["conversation_types"][conv_type] = summary["conversation_types"].get(conv_type, 0) + 1
                
                # Count flow types
                flow_type = template.conversation_flow.value
                summary["flow_types"][flow_type] = summary["flow_types"].get(flow_type, 0) + 1
                
                # Count turns
                turn_count = (len(template.opening_turns) + 
                            sum(len(branch.turns) for branch in template.main_branches) +
                            len(template.closing_turns))
                total_turns += turn_count
        
        if template_count > 0:
            summary["average_turns_per_template"] = total_turns / template_count
            
        return summary
    
    def export_conversation_templates(self, output_path: Path) -> None:
        """Export conversation templates to JSON."""
        logger.info(f"Exporting conversation templates to {output_path}")
        
        export_data = {
            "metadata": {
                "version": "1.0",
                "total_disorders": len(self.conversation_templates),
                "total_templates": sum(len(templates) for templates in self.conversation_templates.values())
            },
            "conversation_templates": {
                disorder_code: [asdict(template) for template in templates]
                for disorder_code, templates in self.conversation_templates.items()
            },
            "summary": self.get_conversation_summary()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            
        logger.info(f"Successfully exported conversation templates to {output_path}")