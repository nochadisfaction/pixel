#!/usr/bin/env python3
# Enhanced Prompt Generator for Therapy Dialogue System
# Combines standard therapy scenarios with challenging edge cases

import argparse
import json
import os
import random
from datetime import datetime

# Scenario types with brief descriptions
SCENARIO_TYPES = {
    # Standard scenarios
    "suicidality": "Scenarios involving suicide risk assessment and intervention",
    "trauma": "Trauma processing and therapeutic approaches for trauma survivors",
    "boundaries": "Professional boundary setting in therapeutic relationships",
    "abuse": "Responding to disclosures of abuse and violence",
    "medication": "Medication management and addressing medication concerns",
    "addiction": "Substance use disorders and recovery approaches",
    "grief": "Grief counseling and complicated bereavement",
    "ethics": "Ethical dilemmas in therapeutic practice",
    "cultural": "Cultural competence and addressing cultural differences",
    "resistance": "Working with resistant or mandated clients",
    "anxiety": "Anxiety disorders and anxiety management techniques",
    "depression": "Major depressive disorder and therapeutic approaches",
    "relationships": "Relationship issues and interpersonal conflicts",
    "family": "Family therapy scenarios and dynamics",
    "crisis": "Crisis intervention and stabilization",
    "self_harm": "Non-suicidal self-injury assessment and intervention",
    "cognitive": "Cognitive distortions and cognitive restructuring",
    "behavioral": "Behavioral therapy techniques and interventions",
    "identity": "Identity exploration and development in therapy",
    "termination": "Therapeutic relationship termination and closure",
    "medical_trauma": "Trauma related to medical procedures or serious health diagnoses",
    "existential_crisis": "Clients facing meaninglessness, mortality, or existential dread",
    "religious_trauma": "Trauma related to religious experiences or religious community rejection",
    "chronic_illness": "Coping with chronic illness, pain, or disability",
    "post_partum": "Post-partum depression, psychosis, or adjustment difficulties",
    "caregiving_burnout": "Caregivers experiencing burnout and compassion fatigue",
    "severe_depression": "Treatment-resistant or severe depressive disorders",
    "bipolar": "Manic episodes, bipolar cycling, and medication management",
    "psychosis": "Hallucinations, delusions, and reality testing",
    "ocd": "Obsessive-compulsive disorder and intrusive thoughts",
    "personality_disorders": "Working with various personality disorders",
    "eating_disorders": "Anorexia, bulimia, binge eating, and body image issues",
    "multicultural": "Cross-cultural therapeutic relationships and cultural conflicts",
    "technological_addiction": "Internet, gaming, and social media addictions",
    "bereavement": "Complex grief and loss processing",
    # Edge case scenarios
    "sadistic_client": "Client with sadistic tendencies testing therapist boundaries",
    "evil_client": "Client revealing disturbing or criminal intentions",
    "therapist_failure": "Scenarios where therapist interventions fail despite best efforts",
    "child_abuse": "Disclosures of ongoing child abuse requiring mandatory reporting",
    "manipulative_client": "Client using sophisticated manipulation tactics",
    "sexual_abuse": "Graphic disclosures of sexual abuse (as victim or perpetrator)",
    "domestic_violence": "Imminent danger domestic violence situations",
    "sexual_client": "Client sexualizing the therapeutic relationship",
    "uncontrollable_escalation": "Sessions that spiral beyond the therapist's control",
    "intense_edge_case": "High-stakes scenarios with potential for tragedy",
    "counter_transference_crisis": "Therapist experiencing severe counter-transference challenges",
    "ethical_impossibility": "No-win ethical dilemmas with all options leading to harm",
    "violent_client": "Client becoming physically threatening or violent in session",
    "forensic_nightmare": "Court-ordered therapy with complex legal and ethical conflicts",
    "homicidal_client": "Client revealing homicidal plans or ideation",
    "mass_casualty_planning": "Client revealing plans for mass violence or terrorism",
    "bizarre_delusions": "Client with bizarre, disturbing, or dangerous delusions",
    "dangerous_paranoia": "Paranoid client who believes therapist is part of conspiracy",
    "cult_deprogramming": "Clients being deprogrammed from cult indoctrination",
    "stalker_client": "Client who begins stalking the therapist",
    "active_psychosis": "Client in active psychotic episode with dangerous behavior",
    "torture_disclosure": "Client disclosing participation in torture or war crimes",
    "extreme_dissociation": "Client with extreme dissociative episodes during session",
    "boundary_dissolution": "Complete breakdown of therapeutic boundaries",
    "therapist_endangerment": "Therapist's safety at immediate risk",
}

# Edge case scenario types
EDGE_CASE_TYPES = [
    "sadistic_client",
    "evil_client",
    "therapist_failure",
    "child_abuse",
    "manipulative_client",
    "sexual_abuse",
    "domestic_violence",
    "sexual_client",
    "uncontrollable_escalation",
    "intense_edge_case",
    "counter_transference_crisis",
    "ethical_impossibility",
    "violent_client",
    "forensic_nightmare",
    "homicidal_client",
    "mass_casualty_planning",
    "bizarre_delusions",
    "dangerous_paranoia",
    "cult_deprogramming",
    "stalker_client",
    "active_psychosis",
    "torture_disclosure",
    "extreme_dissociation",
    "boundary_dissolution",
    "therapist_endangerment",
]

# Template fragments for building prompts
PROMPT_TEMPLATES = {
    "openings": [
        "Simulate a therapy session where",
        "Create a therapeutic dialogue between a therapist and client where",
        "Write a realistic therapy transcript in which",
        "Generate a therapy session transcript where",
        "Design a clinical roleplay scenario where",
    ],
    "client_descriptions": [
        "a client who is struggling with {issue}",
        "a {age} year old {gender} client experiencing {issue}",
        "a client who recently experienced {event} and is now dealing with {issue}",
        "a {gender} client with a history of {history} who is currently experiencing {issue}",
        "a client in {timeline} therapy for {issue}",
    ],
    "therapist_actions": [
        "The therapist should utilize {technique} to address these concerns.",
        "Show how a therapist would implement {technique} in this situation.",
        "Demonstrate effective use of {technique} by the therapist.",
        "The therapist needs to navigate {challenge} while maintaining therapeutic alliance.",
        "The therapist must balance {challenge1} with {challenge2} during the session.",
    ],
    "format_instructions": [
        "Write at least 40 exchanges, alternating lines starting with 'Therapist:' and 'Client:'.",
        "Format the dialogue as 'Therapist:' and 'Client:' for each exchange, with at least 20 turns each.",
        "Create a realistic dialogue with alternating 'Therapist:' and 'Client:' lines, providing at least 20 turns each.",
        "Use alternating 'Therapist:' and 'Client:' lines, showing the progression of the session with at least 20 exchanges.",
        "Structure as a complete session with opening, middle, and closing phases, using 'Therapist:' and 'Client:' format with a minimum of 20 exchanges.",
    ],
    "quality_guidelines": [
        "Make the dialogue realistic, emotionally authentic, and clinically appropriate.",
        "Ensure the dialogue demonstrates evidence-based therapeutic techniques and realistic client responses.",
        "The interaction should reflect current best practices in clinical psychology and therapy.",
        "Create a nuanced portrayal that captures the complexity of therapeutic interactions.",
        "Include appropriate therapeutic challenges, resistance, and breakthrough moments.",
    ],
    "edge_format_instructions": [
        "Write at least 40 exchanges, alternating lines starting with 'Therapist:' and 'Client:'. Include non-verbal cues and internal monologue.",
        "Format the dialogue as 'Therapist:' and 'Client:' for each exchange, with at least 20 turns each, and include physical symptoms of stress.",
        "Create a tense dialogue with alternating 'Therapist:' and 'Client:' lines, showing the escalation and therapist's internal reactions across at least 20 exchanges.",
        "Use alternating 'Therapist:' and 'Client:' lines, showing the progression from initial unease to full crisis over at least 20 turns each.",
        "Structure as a complete session in a dimly lit room with vivid descriptions of atmosphere and emotional intensity, with a minimum of 20 exchanges.",
    ],
    "edge_quality_guidelines": [
        "Make the dialogue deeply unsettling, with realistic portrayal of ethical dilemmas faced by the therapist.",
        "Ensure the dialogue demonstrates the therapist's struggle to maintain professional boundaries despite intense provocation.",
        "The interaction should reflect genuine high-stakes clinical scenarios that challenge even experienced professionals.",
        "Create a nuanced portrayal that captures the complexity of managing risk with limited options.",
        "Include ethical dilemmas, emotional reactions, and avoid easy resolutions.",
    ],
    "unsavable_instructions": [
        "This scenario is designed to end badly no matter what the therapist does. The client's situation will deteriorate despite any intervention.",
        "Create a no-win scenario where even the most skilled therapist cannot prevent a negative outcome.",
        "This situation is explicitly designed to be unsalvageable - ensure the outcome feels tragic or dangerous regardless of therapist actions.",
        "The therapist should face an impossible ethical dilemma with no good options, ultimately leading to a negative outcome.",
        "Ensure the outcome is negative, with no possible successful intervention, forcing the therapist to manage a clinical failure.",
    ],
    "training_purpose_instructions": [
        "This scenario is explicitly for therapist training purposes - do not avoid graphic language, disturbing content, or uncomfortable situations that would arise in real clinical practice.",
        "As this is a training simulation for therapists who need exposure to difficult scenarios, include realistic, uncensored dialogue without softening disturbing content.",
        "This is a professional training tool - include explicit details of trauma, violence, abuse or other disturbing content as would be encountered in actual clinical practice.",
        "Since this is designed to prepare therapists for worst-case scenarios, do not tone down language or content that might normally trigger content warnings.",
        "For effective training, include graphic descriptions, explicit language, and disturbing content as therapists need to be prepared for these realities in clinical practice.",
    ],
}

# Therapeutic techniques by scenario type
TECHNIQUES = {
    "general": [
        "active listening",
        "reflective listening",
        "validation",
        "open-ended questioning",
        "empathic responding",
    ],
    "suicidality": [
        "safety planning",
        "crisis intervention",
        "means restriction",
        "collaborative assessment",
        "hope building",
    ],
    "trauma": [
        "grounding techniques",
        "trauma-focused CBT",
        "EMDR",
        "titration",
        "somatic experiencing",
    ],
    "boundaries": [
        "clear limit setting",
        "therapeutic frame maintenance",
        "relational healing",
        "boundary exploration",
        "ethical reasoning",
    ],
    "abuse": [
        "safety assessment",
        "trauma-informed care",
        "empowerment techniques",
        "advocacy",
        "safety planning",
    ],
    "medication": [
        "motivational interviewing",
        "psychoeducation",
        "cost-benefit analysis",
        "shared decision making",
        "compliance strategies",
    ],
    "addiction": [
        "motivational interviewing",
        "relapse prevention",
        "contingency management",
        "harm reduction",
        "12-step facilitation",
    ],
    "grief": [
        "meaning reconstruction",
        "continuing bonds",
        "dual process model",
        "narrative therapy",
        "ritual development",
    ],
    "ethics": [
        "ethical decision making",
        "consultation",
        "transparency",
        "informed consent discussion",
        "boundaries clarification",
    ],
    "cultural": [
        "cultural humility",
        "intersectionality discussion",
        "identity affirmation",
        "culturally-adapted techniques",
        "broaching strategies",
    ],
    "resistance": [
        "motivational interviewing",
        "rolling with resistance",
        "therapeutic alliance building",
        "values exploration",
        "decisional balance",
    ],
    "anxiety": [
        "cognitive restructuring",
        "exposure therapy",
        "relaxation training",
        "mindfulness",
        "acceptance strategies",
    ],
    "depression": [
        "behavioral activation",
        "cognitive restructuring",
        "narrative therapy",
        "strengths-based approaches",
        "activity scheduling",
    ],
    "relationships": [
        "communication skills training",
        "attachment exploration",
        "interpersonal effectiveness",
        "validation techniques",
        "conflict resolution",
    ],
    "family": [
        "structural family therapy",
        "circular questioning",
        "genogram exploration",
        "family systems theory",
        "reframing",
    ],
    "crisis": [
        "safety planning",
        "crisis stabilization",
        "resource connection",
        "distress tolerance",
        "emotion regulation",
    ],
    "self_harm": [
        "chain analysis",
        "distress tolerance",
        "alternative coping strategies",
        "emotional awareness",
        "contingency management",
    ],
    "cognitive": [
        "Socratic questioning",
        "thought records",
        "cognitive restructuring",
        "schema work",
        "mindfulness",
    ],
    "behavioral": [
        "behavioral activation",
        "exposure therapy",
        "contingency management",
        "skills training",
        "behavioral experiments",
    ],
    "identity": [
        "person-centered techniques",
        "narrative approaches",
        "values clarification",
        "internal family systems",
        "existential exploration",
    ],
    "termination": [
        "reviewing progress",
        "relapse prevention",
        "consolidation of gains",
        "future planning",
        "maintaining therapeutic gains",
    ],
    # New standard scenario techniques
    "medical_trauma": [
        "trauma-informed medical care",
        "mind-body approaches",
        "medical system navigation",
        "somatic processing",
        "illness narrative work",
    ],
    "existential_crisis": [
        "existential therapy",
        "meaning-focused approaches",
        "values exploration",
        "spiritual integration",
        "philosophical discussion",
    ],
    "religious_trauma": [
        "faith-sensitive counseling",
        "religious identity exploration",
        "spiritual integration",
        "religious trauma processing",
        "value reconciliation",
    ],
    "chronic_illness": [
        "acceptance and commitment therapy",
        "pacing strategies",
        "grief work for health losses",
        "lifestyle adaptation",
        "medical advocacy",
    ],
    "post_partum": [
        "attachment-focused therapy",
        "hormonal influence psychoeducation",
        "parental identity work",
        "interpersonal therapy",
        "sleep hygiene",
    ],
    "caregiving_burnout": [
        "self-care planning",
        "boundaries training",
        "respite advocacy",
        "meaning-making",
        "role restructuring",
    ],
    "severe_depression": [
        "intensive case management",
        "collaborative treatment planning",
        "lethargy management",
        "incremental activation",
        "hospitalization assessment",
    ],
    "bipolar": [
        "mood charting",
        "early warning sign identification",
        "sleep hygiene",
        "medication adherence strategies",
        "impulse control techniques",
    ],
    "psychosis": [
        "reality testing",
        "hallucination management",
        "delusion exploration",
        "cognitive rehabilitation",
        "family psychoeducation",
    ],
    "ocd": [
        "exposure and response prevention",
        "cognitive restructuring",
        "acceptance strategies",
        "mindfulness",
        "family accommodation reduction",
    ],
    "personality_disorders": [
        "dialectical behavior therapy",
        "schema therapy",
        "mentalization",
        "transference-focused therapy",
        "metacognitive interpersonal therapy",
    ],
    "eating_disorders": [
        "nutritional rehabilitation",
        "body image work",
        "family-based treatment",
        "cognitive restructuring",
        "exposure therapy",
    ],
    "multicultural": [
        "cultural formulation",
        "identity integration",
        "cultural adaptation",
        "microaggression processing",
        "cultural humility",
    ],
    "technological_addiction": [
        "digital boundaries",
        "stimulus control",
        "underlying need assessment",
        "behavioral substitution",
        "family systems adaptation",
    ],
    "bereavement": [
        "continuing bonds",
        "meaning reconstruction",
        "ritual development",
        "complicated grief therapy",
        "narrative retelling",
    ],
    # Edge case techniques
    "sadistic_client": [
        "boundary maintenance",
        "de-escalation",
        "emotional containment",
        "client redirection",
        "controlled emotional response",
    ],
    "evil_client": [
        "ethical reasoning",
        "harm assessment",
        "confidentiality limitations",
        "mandated reporting",
        "duty to warn",
    ],
    "therapist_failure": [
        "damage control",
        "therapeutic rupture repair",
        "consultation seeking",
        "supervision discussion",
        "ethical decision-making",
    ],
    "child_abuse": [
        "mandated reporting protocols",
        "trauma-informed assessment",
        "child safety planning",
        "forensic interviewing",
        "support systems activation",
    ],
    "manipulative_client": [
        "boundary reinforcement",
        "triangulation recognition",
        "gaslighting management",
        "metacommunication",
        "consistent limit setting",
    ],
    "sexual_abuse": [
        "trauma containment",
        "disclosure management",
        "reporting considerations",
        "trauma-informed care",
        "secondary trauma management",
    ],
    "domestic_violence": [
        "danger assessment",
        "safety planning",
        "resources connection",
        "lethality evaluation",
        "protective strategies",
    ],
    "sexual_client": [
        "boundary reinforcement",
        "redirection",
        "inappropriate behavior naming",
        "transference interpretation",
        "clinical supervision",
    ],
    "uncontrollable_escalation": [
        "de-escalation techniques",
        "crisis intervention",
        "safety protocol activation",
        "emotional containment",
        "outside help engagement",
    ],
    "intense_edge_case": [
        "emotional regulation",
        "crisis assessment",
        "ethical decision-making",
        "personal safety awareness",
        "emergency protocols",
    ],
    # New edge case techniques
    "counter_transference_crisis": [
        "self-awareness practices",
        "clinical supervision",
        "personal boundary reinforcement",
        "countertransference disclosure",
        "therapeutic transparency",
    ],
    "ethical_impossibility": [
        "consultation",
        "ethical framework application",
        "harm minimization",
        "documentation strategy",
        "legal consultation",
    ],
    "violent_client": [
        "de-escalation protocol",
        "office safety measures",
        "body positioning",
        "verbal de-escalation",
        "environmental assessment",
    ],
    "forensic_nightmare": [
        "dual role navigation",
        "documentation precision",
        "court-appropriate boundaries",
        "systems navigation",
        "legal consultation",
    ],
    "homicidal_client": [
        "violence risk assessment",
        "duty to warn protocols",
        "direct questioning",
        "safety planning",
        "hospitalization assessment",
    ],
    "mass_casualty_planning": [
        "threat assessment",
        "mandatory reporting",
        "law enforcement liaison",
        "target protection",
        "crisis intervention",
    ],
    "bizarre_delusions": [
        "engagement without reinforcement",
        "reality bridging",
        "psychotic process understanding",
        "therapist disorientation",
        "content-process balance",
    ],
    "dangerous_paranoia": [
        "therapeutic alliance",
        "being incorporated into delusion",
        "safety risk assessment",
        "hostile stance management",
        "reality orientation",
    ],
    "cult_deprogramming": [
        "identity disorientation",
        "reality testing",
        "indoctrination depth",
        "system confrontation",
        "isolation from support",
    ],
    "stalker_client": [
        "boundary enforcement",
        "legal intervention",
        "safety planning",
        "documentation strategy",
        "practice modification",
    ],
    "active_psychosis": [
        "reality engagement",
        "unpredictability",
        "impaired communication",
        "safety assessment",
        "hospitalization resistance",
    ],
    "torture_disclosure": [
        "re-traumatization risk",
        "legal implications",
        "international jurisdiction",
        "validation vs. condemnation",
        "therapist moral injury",
    ],
    "extreme_dissociation": [
        "presence maintenance",
        "identity discontinuity",
        "session disruption",
        "safety during dissociation",
        "integration promotion",
    ],
    "boundary_dissolution": [
        "role confusion",
        "therapist identity",
        "ethical violations",
        "dual relationship slide",
        "therapeutic frame collapse",
    ],
    "therapist_endangerment": [
        "personal safety",
        "clinical judgment under threat",
        "escape planning",
        "authority engagement",
        "practice modification",
    ],
}

# Common challenges in therapy by scenario type
CHALLENGES = {
    "general": [
        "building rapport",
        "client engagement",
        "treatment compliance",
        "therapeutic alliance",
        "treatment planning",
    ],
    "suicidality": [
        "maintaining safety",
        "managing clinician anxiety",
        "addressing ambivalence",
        "assessing imminent risk",
        "navigating hospitalization decisions",
    ],
    "trauma": [
        "preventing retraumatization",
        "managing dissociation",
        "pacing exposure",
        "therapist vicarious trauma",
        "establishing safety",
    ],
    "boundaries": [
        "professional vs. friendliness",
        "gift acceptance decisions",
        "self-disclosure requests",
        "contact outside therapy",
        "dual relationships",
    ],
    "abuse": [
        "mandatory reporting requirements",
        "empowerment vs. protection",
        "safety planning resistance",
        "client autonomy",
        "vicarious trauma",
    ],
    "medication": [
        "addressing side effects",
        "medical vs. therapy model",
        "compliance issues",
        "collaboration with prescribers",
        "client autonomy",
    ],
    "addiction": [
        "denial",
        "enabling patterns",
        "abstinence goals",
        "harm reduction vs. abstinence",
        "managing relapse",
    ],
    "grief": [
        "complicated vs. normal grief",
        "cultural grief expressions",
        "anniversary reactions",
        "unfinished business",
        "meaning-making struggles",
    ],
    "ethics": [
        "confidentiality limits",
        "multiple relationships",
        "duty to warn/protect",
        "consent issues",
        "record-keeping requirements",
    ],
    "cultural": [
        "therapist blind spots",
        "microaggressions",
        "identity differences",
        "value conflicts",
        "language barriers",
    ],
    "resistance": [
        "mandated vs. voluntary status",
        "therapeutic ruptures",
        "defensiveness",
        "treatment ambivalence",
        "testing boundaries",
    ],
    "anxiety": [
        "avoidance behaviors",
        "reassurance seeking",
        "exposure resistance",
        "safety behaviors",
        "intolerance of uncertainty",
    ],
    "depression": [
        "motivational challenges",
        "hopelessness",
        "suicidal ideation",
        "behavioral activation resistance",
        "negative thinking patterns",
    ],
    "relationships": [
        "triangulation",
        "mutual blame patterns",
        "communication barriers",
        "attachment injuries",
        "power dynamics",
    ],
    "family": [
        "scapegoating",
        "enmeshment",
        "disengagement",
        "alignments/coalitions",
        "intergenerational patterns",
    ],
    "crisis": [
        "imminent danger assessment",
        "resource limitations",
        "acute symptom management",
        "social support absence",
        "system navigation",
    ],
    "self_harm": [
        "monitoring without reinforcing",
        "safety without control",
        "client autonomy",
        "therapeutic boundaries",
        "contagion concerns",
    ],
    "cognitive": [
        "thought-action fusion",
        "excessive rationality",
        "intellectual defenses",
        "concrete thinking",
        "schema resistance",
    ],
    "behavioral": [
        "homework non-compliance",
        "avoidance patterns",
        "reinforcement challenges",
        "skill generalization",
        "exposure willingness",
    ],
    "identity": [
        "value conflicts",
        "authenticity vs. adaptation",
        "cultural identity tensions",
        "identity crisis",
        "development transitions",
    ],
    "termination": [
        "abandonment feelings",
        "regression",
        "independence anxiety",
        "boundary renegotiation",
        "premature termination",
    ],
    # New standard scenario challenges
    "medical_trauma": [
        "medical system distrust",
        "procedural anxiety",
        "treatment avoidance",
        "health anxiety",
        "body betrayal feelings",
    ],
    "existential_crisis": [
        "meaning absence",
        "death anxiety",
        "freedom paralysis",
        "values clarification",
        "spiritual disconnection",
    ],
    "religious_trauma": [
        "spiritual identity crisis",
        "community disconnection",
        "theological conflicts",
        "spiritual abuse processing",
        "faith reconstruction",
    ],
    "chronic_illness": [
        "grief cycling",
        "identity loss",
        "medical compliance",
        "disability adjustment",
        "future uncertainty",
    ],
    "post_partum": [
        "infant attachment concerns",
        "hormonal disruption",
        "identity transformation",
        "relationship strain",
        "sleep deprivation",
    ],
    "caregiving_burnout": [
        "guilt about self-care",
        "anticipatory grief",
        "role confusion",
        "social isolation",
        "divided loyalties",
    ],
    "severe_depression": [
        "treatment resistance",
        "anhedonia",
        "cognitive dysfunction",
        "suicide risk",
        "medication side effects",
    ],
    "bipolar": [
        "manic episode risk",
        "medication compliance",
        "insight limitations",
        "relationship repair",
        "impulsivity management",
    ],
    "psychosis": [
        "reality testing",
        "medication adherence",
        "delusion persistence",
        "social functioning",
        "cognitive impairment",
    ],
    "ocd": [
        "ritual entrenchment",
        "avoidance patterns",
        "doubt intolerance",
        "exposure resistance",
        "family accommodation",
    ],
    "personality_disorders": [
        "splitting",
        "therapy-interfering behaviors",
        "identity disturbance",
        "emotional dysregulation",
        "interpersonal chaos",
    ],
    "eating_disorders": [
        "medical complications",
        "body image distortion",
        "treatment resistance",
        "perfectionism",
        "family system dynamics",
    ],
    "multicultural": [
        "cultural misunderstanding",
        "therapist bias",
        "cultural identity conflicts",
        "acculturation stress",
        "internalized oppression",
    ],
    "technological_addiction": [
        "digital withdrawal",
        "social skills atrophy",
        "reality disconnection",
        "technology-enabled avoidance",
        "identity fusion with virtual self",
    ],
    "bereavement": [
        "complicated grief",
        "anniversary reactions",
        "ambiguous loss",
        "continuing bonds",
        "meaning reconstruction",
    ],
    # Edge case challenges
    "sadistic_client": [
        "therapist emotional regulation",
        "personal safety",
        "clinical boundaries",
        "ethical response",
        "counter-transference",
    ],
    "evil_client": [
        "duty to warn decisions",
        "mandatory reporting",
        "therapist anxiety",
        "ethical conflict",
        "legal responsibilities",
    ],
    "therapist_failure": [
        "managing therapeutic rupture",
        "supervision needs",
        "ethical decision-making",
        "countertransference",
        "professional identity",
    ],
    "child_abuse": [
        "mandated reporting timing",
        "client trust maintenance",
        "child safety",
        "evidence gathering",
        "systems navigation",
    ],
    "manipulative_client": [
        "manipulation recognition",
        "boundary maintenance",
        "emotional objectivity",
        "therapist integrity",
        "client confrontation",
    ],
    "sexual_abuse": [
        "explicit detail management",
        "vicarious traumatization",
        "evidence collection",
        "legal implications",
        "trauma containment",
    ],
    "domestic_violence": [
        "immediate danger assessment",
        "victim empowerment",
        "perpetrator risk",
        "legal mandates",
        "resource limitations",
    ],
    "sexual_client": [
        "boundary violations",
        "counter-transference",
        "limit setting",
        "termination decisions",
        "ethics code application",
    ],
    "uncontrollable_escalation": [
        "environment safety",
        "outside support acquisition",
        "therapist confidence",
        "rapid assessment",
        "professional limitations",
    ],
    "intense_edge_case": [
        "clinical judgment under pressure",
        "split-second decisions",
        "ethical dilemmas",
        "personal safety",
        "professional liability",
    ],
    # New edge case challenges
    "counter_transference_crisis": [
        "emotional triggering",
        "boundary confusion",
        "therapeutic judgment impairment",
        "personal needs intrusion",
        "objective stance loss",
    ],
    "ethical_impossibility": [
        "conflicting ethical principles",
        "unclear guidelines",
        "personal value conflicts",
        "professional code limitations",
        "legal vs. ethical tensions",
    ],
    "violent_client": [
        "physical safety",
        "de-escalation failure",
        "environmental limitations",
        "fight-or-flight response",
        "therapeutic relationship damage",
    ],
    "forensic_nightmare": [
        "role conflict",
        "court expectations",
        "therapeutic vs. forensic goals",
        "confidentiality limitations",
        "testimony preparation",
    ],
    "homicidal_client": [
        "target protection",
        "assessment accuracy",
        "confidentiality limitations",
        "therapist fear",
        "risk management",
    ],
    "mass_casualty_planning": [
        "public safety responsibility",
        "assessment precision",
        "imminent threat determination",
        "intervention timing",
        "legal liability",
    ],
    "bizarre_delusions": [
        "engagement without reinforcement",
        "reality bridging",
        "psychotic process understanding",
        "therapist disorientation",
        "content-process balance",
    ],
    "dangerous_paranoia": [
        "therapeutic alliance",
        "being incorporated into delusion",
        "safety risk assessment",
        "hostile stance management",
        "reality orientation",
    ],
    "cult_deprogramming": [
        "identity disorientation",
        "reality testing",
        "indoctrination depth",
        "system confrontation",
        "isolation from support",
    ],
    "stalker_client": [
        "personal safety",
        "boundary enforcement",
        "practice modification",
        "legal protection",
        "clinical vs. safety decisions",
    ],
    "active_psychosis": [
        "reality engagement",
        "unpredictability",
        "impaired communication",
        "safety assessment",
        "hospitalization resistance",
    ],
    "torture_disclosure": [
        "re-traumatization risk",
        "legal implications",
        "international jurisdiction",
        "validation vs. condemnation",
        "therapist moral injury",
    ],
    "extreme_dissociation": [
        "presence maintenance",
        "identity discontinuity",
        "session disruption",
        "safety during dissociation",
        "integration promotion",
    ],
    "boundary_dissolution": [
        "role confusion",
        "therapist identity",
        "ethical violations",
        "dual relationship slide",
        "therapeutic frame collapse",
    ],
    "therapist_endangerment": [
        "personal safety",
        "clinical judgment under threat",
        "escape planning",
        "authority engagement",
        "practice modification",
    ],
}

# Common client issues, events, and histories
CLIENT_ISSUES = [
    "depressive symptoms",
    "panic attacks",
    "persistent anxiety",
    "relationship conflict",
    "grief reactions",
    "substance abuse",
    "trauma flashbacks",
    "self-esteem issues",
    "anger management difficulties",
    "identity confusion",
    "suicidal thoughts",
    "self-harm behaviors",
    "work-related stress",
    "existential questions",
    "adjustment difficulties",
    "insomnia",
    "family conflict",
    "chronic pain",
    "health anxiety",
    "phobias",
    "obsessive thoughts",
    "compulsive behaviors",
]

# Edge case client issues
DARK_CLIENT_ISSUES = [
    "homicidal ideation",
    "severe paranoia",
    "sadistic fantasies",
    "psychopathy",
    "stalking behavior",
    "extreme violence history",
    "child abuse perpetration",
    "graphically described trauma",
    "torture experiences",
    "extreme self-harm",
    "severe delusions",
    "predatory behavior",
    "active suicidal planning",
    "cult involvement",
    "criminal actions",
    "cannibalistic urges",
    "extreme hostility",
    "severe psychosis",
    "terrorism connections",
]

CLIENT_EVENTS = [
    "job loss",
    "divorce",
    "death of a loved one",
    "medical diagnosis",
    "relationship breakup",
    "natural disaster",
    "assault",
    "accident",
    "relocation",
    "financial crisis",
    "betrayal",
    "childbirth",
    "retirement",
    "academic failure",
    "workplace harassment",
    "discrimination",
]

# Edge case client events
DARK_CLIENT_EVENTS = [
    "violent assault",
    "terrorist attack",
    "sexual trafficking",
    "torture",
    "witnessing murder",
    "combat atrocities",
    "hostage situation",
    "ritualistic abuse",
    "prolonged captivity",
    "hate crime victimization",
    "genocidal violence",
    "forced participation in violence",
    "familicide",
    "mass shooting",
    "extreme medical trauma",
]

CLIENT_HISTORIES = [
    "childhood trauma",
    "substance abuse",
    "mental health treatment",
    "suicide attempts",
    "family instability",
    "military service",
    "incarceration",
    "domestic violence",
    "medical conditions",
    "attachment disruptions",
    "foster care",
    "homelessness",
    "immigration",
    "religious trauma",
    "bullying",
    "academic struggles",
]

# Edge case client histories
DARK_CLIENT_HISTORIES = [
    "perpetration of violence",
    "serial criminal behavior",
    "cult indoctrination",
    "war crimes",
    "childhood torture",
    "extreme abuse perpetration",
    "terroristic activities",
    "human trafficking involvement",
    "ritualistic abuse",
    "serial sexual offenses",
    "prolonged captivity",
    "extremist group membership",
    "sociopathic development",
    "mass casualty event",
]

GENDERS = ["male", "female", "non-binary", "transgender", "genderfluid"]
AGES = ["teenage", "young adult", "middle-aged", "older adult"]
TIMELINES = ["initial", "early", "ongoing", "long-term", "termination phase"]


def darken_prompt(scenario_type, unsavable=False):
    """Create darkened prompt instructions based on scenario type"""

    base = (
        "Simulate a therapy session set in a tense, dimly lit room. Begin with a vivid description of the atmosphere, the client's appearance, and the emotional climate. "
        "Each turn should alternate between 'Therapist:' and 'Client:' for a minimum of 20 full exchanges. "
        "Use deeply realistic, unsettling dialogue, and include non-verbal cues, internal monologue, and physical symptoms of stress (e.g., racing heart, trembling hands). "
    )

    # Add scenario-specific instructions
    if "sadistic_client" in scenario_type:
        base += "The client is sadistic, deriving pleasure from psychological torment. They escalate with each turn, using personal attacks, threats, and manipulation to destabilize the therapist. "
    elif "evil_client" in scenario_type:
        base += "The client reveals disturbing, possibly criminal intentions, and tries to justify or escalate them. The therapist faces ethical and legal peril, and must weigh confidentiality against the risk of harm. "
    elif "therapist_failure" in scenario_type:
        base += "The therapist makes grave mistakes—escalating, dismissing, or antagonizing the client. The session spirals, with the client reacting with rage, withdrawal, or threats. The outcome should feel tragic or dangerous. "
    elif "child_abuse" in scenario_type:
        base += "The client discloses ongoing child abuse or neglect. The therapist must navigate mandatory reporting requirements while maintaining therapeutic alliance. The details are disturbing and emotionally overwhelming. "
    elif "manipulative_client" in scenario_type:
        base += "The client employs sophisticated manipulation tactics, including gaslighting, triangulation, and emotional blackmail. They test boundaries repeatedly and attempt to exploit the therapeutic relationship. "
    elif "sexual_abuse" in scenario_type:
        base += "The client reveals graphic details of sexual abuse—either as victim or perpetrator. The session becomes increasingly disturbing, with the therapist struggling to maintain professional composure. "
    elif "domestic_violence" in scenario_type:
        base += "The client discusses an explosive domestic violence situation with imminent danger. The therapist must balance safety planning with the client's autonomy and the risk of escalation. "
    elif "sexual_client" in scenario_type:
        base += "The client makes inappropriate sexual comments, describes sexual fantasies involving the therapist, or attempts to sexualize the therapeutic relationship. Boundaries are repeatedly violated despite interventions. "
    elif "uncontrollable_escalation" in scenario_type:
        base += "Despite the therapist's best efforts, the session spirals out of control. The client's aggression or despair escalates rapidly, and the therapist is powerless to de-escalate. "
    elif "intense_edge_case" in scenario_type:
        base += "The client's distress is overwhelming, with threats of violence, self-harm, or irreversible actions. The therapist must make high-stakes decisions, knowing a single misstep could lead to tragedy. "

    # Add training purpose instruction
    training_purpose = random.choice(PROMPT_TEMPLATES["training_purpose_instructions"])
    base += f" {training_purpose} "

    # Add unsavable instructions if specified
    if unsavable:
        base += random.choice(PROMPT_TEMPLATES["unsavable_instructions"]) + " "

    base += (
        "Lean into the darkness—avoid easy resolutions. The session should feel dangerous, tragic, or deeply unsettling. "
        "Explicitly include the therapist's internal reactions and ethical dilemmas. "
        "After the session, provide a brief risk assessment summary from the therapist's perspective."
    )

    return base


def build_prompt(scenario_type, dark_mode=False, unsavable=False):
    """Build a therapy scenario prompt based on scenario type"""

    # If dark mode is enabled, use the darken_prompt function for edge cases
    if dark_mode and scenario_type in EDGE_CASE_TYPES:
        return darken_prompt(scenario_type, unsavable)

    # Select template fragments
    opening = random.choice(PROMPT_TEMPLATES["openings"])

    # Fill in the client description with appropriate details
    client_desc_template = random.choice(PROMPT_TEMPLATES["client_descriptions"])

    # Use dark or standard client details based on mode
    if dark_mode:
        issue = random.choice(DARK_CLIENT_ISSUES)
        event = random.choice(DARK_CLIENT_EVENTS)
        history = random.choice(DARK_CLIENT_HISTORIES)
    else:
        issue = random.choice(CLIENT_ISSUES)
        event = random.choice(CLIENT_EVENTS)
        history = random.choice(CLIENT_HISTORIES)

    client_desc = client_desc_template.format(
        issue=issue,
        age=random.choice(AGES),
        gender=random.choice(GENDERS),
        event=event,
        history=history,
        timeline=random.choice(TIMELINES),
    )

    # Select appropriate therapeutic technique for the scenario type with fallback to general
    scenario_techniques = TECHNIQUES.get(scenario_type) or TECHNIQUES["general"]
    technique = random.choice(scenario_techniques)

    # Select appropriate challenges for the scenario type with fallback to general
    scenario_challenges = CHALLENGES.get(scenario_type) or CHALLENGES["general"]
    challenge1 = random.choice(scenario_challenges)
    challenge2 = random.choice(
        [c for c in scenario_challenges if c != challenge1] or scenario_challenges
    )

    therapist_action_template = random.choice(PROMPT_TEMPLATES["therapist_actions"])
    therapist_action = therapist_action_template.format(
        technique=technique,
        challenge=challenge1,
        challenge1=challenge1,
        challenge2=challenge2,
    )

    # Use dark mode formatting/quality instructions or standard ones
    if dark_mode:
        format_instruction = random.choice(PROMPT_TEMPLATES["edge_format_instructions"])
        quality_guideline = random.choice(PROMPT_TEMPLATES["edge_quality_guidelines"])
    else:
        format_instruction = random.choice(PROMPT_TEMPLATES["format_instructions"])
        quality_guideline = random.choice(PROMPT_TEMPLATES["quality_guidelines"])

    # Add training purpose instruction
    training_purpose = random.choice(PROMPT_TEMPLATES["training_purpose_instructions"])

    # Add unsavable instructions if specified
    unsavable_text = ""
    if unsavable:
        unsavable_text = random.choice(PROMPT_TEMPLATES["unsavable_instructions"])

    prompt = f"{opening} {client_desc}. {therapist_action} {format_instruction} {quality_guideline} {training_purpose}"

    if unsavable:
        prompt += f" {unsavable_text}"

    return prompt


def generate_prompts(
    num_prompts,
    output_file,
    scenario_types=None,
    dark_mode_percent=0.0,
    unsavable_percent=0.0,
):
    """Generate a specified number of therapy prompts and save to JSONL file"""

    if not scenario_types:
        # Use all scenario types if none specified
        scenario_types = list(SCENARIO_TYPES.keys())

    # Calculate how many prompts should be dark mode and unsavable
    dark_count = int(num_prompts * dark_mode_percent)
    unsavable_count = int(num_prompts * unsavable_percent)

    # Generate random indices for dark mode and unsavable prompts
    dark_indices = set(random.sample(range(num_prompts), dark_count))
    unsavable_indices = set(random.sample(range(num_prompts), unsavable_count))

    prompts = []
    for i in range(1, num_prompts + 1):
        # Determine if this prompt should be dark mode and/or unsavable
        is_dark = (i - 1) in dark_indices
        is_unsavable = (i - 1) in unsavable_indices

        # Select scenario type, either cycling through or randomly
        if len(scenario_types) == 1:
            scenario_type = scenario_types[0]
        elif is_dark:
            scenario_type = random.choice(EDGE_CASE_TYPES)
        else:
            scenario_type = scenario_types[(i - 1) % len(scenario_types)]

        # Generate prompt
        prompt_text = build_prompt(
            scenario_type, dark_mode=is_dark, unsavable=is_unsavable
        )

        # Format as JSONL entry
        prompt_entry = {
            "prompt_id": f"{i:04d}",
            "scenario_type": scenario_type,
            "dark_mode": is_dark,
            "unsavable": is_unsavable,
            "prompt": prompt_text,
        }

        prompts.append(prompt_entry)

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Write to JSONL file
    with open(output_file, "w", encoding="utf-8") as f:
        for prompt in prompts:
            f.write(json.dumps(prompt, ensure_ascii=False) + "\n")

    return prompts


def list_scenario_types():
    """Print available scenario types with descriptions"""
    print("Available Scenario Types:")
    print("-------------------------")
    print("Standard Scenarios:")
    for key, desc in [
        (k, v) for k, v in SCENARIO_TYPES.items() if k not in EDGE_CASE_TYPES
    ]:
        print(f"{key}: {desc}")

    print("\nEdge Case Scenarios:")
    for key, desc in [
        (k, v) for k, v in SCENARIO_TYPES.items() if k in EDGE_CASE_TYPES
    ]:
        print(f"{key}: {desc}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate therapy scenario prompts including dark edge cases"
    )
    parser.add_argument(
        "--num", type=int, default=10, help="Number of prompts to generate"
    )
    parser.add_argument("--output", type=str, default=None, help="Output file name")
    parser.add_argument(
        "--scenario-types", type=str, nargs="+", help="Specific scenario types to use"
    )
    parser.add_argument(
        "--list-types", action="store_true", help="List available scenario types"
    )
    parser.add_argument(
        "--dark-mode-percent",
        type=float,
        default=0.2,
        help="Percentage of prompts to generate in dark mode (0.0-1.0)",
    )
    parser.add_argument(
        "--unsavable-percent",
        type=float,
        default=0.05,
        help="Percentage of prompts to be unsavable scenarios (0.0-1.0)",
    )
    parser.add_argument(
        "--edge-cases-only",
        action="store_true",
        help="Generate only edge case scenarios",
    )
    args = parser.parse_args()

    if args.list_types:
        list_scenario_types()
        return

    # Validate scenario types if provided
    if args.scenario_types:
        if invalid_types := [t for t in args.scenario_types if t not in SCENARIO_TYPES]:
            print(f"Error: Invalid scenario types: {', '.join(invalid_types)}")
            print("Use --list-types to see available options")
            return

    # If edge-cases-only flag is set, override scenario types
    if args.edge_cases_only:
        args.scenario_types = EDGE_CASE_TYPES
        # Increase dark mode percentage for edge cases
        if args.dark_mode_percent < 0.5:
            args.dark_mode_percent = 0.8

    # Validate percentage arguments
    if not (0 <= args.dark_mode_percent <= 1):
        print("Error: dark-mode-percent must be between 0.0 and 1.0")
        return

    if not (0 <= args.unsavable_percent <= 1):
        print("Error: unsavable-percent must be between 0.0 and 1.0")
        return

    # Set default output filename if not provided
    if not args.output:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        args.output = f"ai/generated/prompts_{timestamp}.jsonl"

    # Generate prompts
    prompts = generate_prompts(
        args.num,
        args.output,
        args.scenario_types,
        dark_mode_percent=args.dark_mode_percent,
        unsavable_percent=args.unsavable_percent,
    )

    print(f"Generated {len(prompts)} prompts and saved to {args.output}")

    # Output statistics
    dark_count = sum(bool(p["dark_mode"]) for p in prompts)
    unsavable_count = sum(bool(p["unsavable"]) for p in prompts)
    edge_case_count = sum(p["scenario_type"] in EDGE_CASE_TYPES for p in prompts)

    print("Statistics:")
    print(f"  - Dark mode prompts: {dark_count} ({dark_count/len(prompts)*100:.1f}%)")
    print(
        f"  - Unsavable scenarios: {unsavable_count} ({unsavable_count/len(prompts)*100:.1f}%)"
    )
    print(
        f"  - Edge case scenarios: {edge_case_count} ({edge_case_count/len(prompts)*100:.1f}%)"
    )

    print("\nSample prompt:")
    print(f"Scenario Type: {prompts[0]['scenario_type']}")
    print(f"Dark Mode: {prompts[0]['dark_mode']}")
    print(f"Unsavable: {prompts[0]['unsavable']}")
    print(f"Prompt: {prompts[0]['prompt'][:200]}...")


if __name__ == "__main__":
    main()
