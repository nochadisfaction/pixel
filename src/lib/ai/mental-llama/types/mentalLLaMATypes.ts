// Defines the core data structures for MentalLLaMA integration

/**
 * Contextual information for routing a text analysis request.
 */
export interface RoutingContext {
  userId?: string;
  sessionId?: string;
  sessionType?: string; // e.g., 'chat', 'journal_entry', 'crisis_intervention_follow_up'
  explicitTaskHint?: string; // e.g., 'depression_check', 'safety_screen'
  previousConversationState?: any; // For more advanced contextual routing
}

/**
 * Input for the MentalHealthTaskRouter.
 */
export interface RoutingInput {
  text: string;
  context?: RoutingContext;
}

/**
 * Decision made by the MentalHealthTaskRouter.
 */
export interface RoutingDecision {
  targetAnalyzer: string; // e.g., 'crisis', 'depression', 'anxiety', 'general_mental_health', 'unknown'
  confidence: number; // Confidence score (0.0 - 1.0) for the routing decision
  isCritical: boolean; // True if the routing decision indicates a critical situation (e.g., crisis)
  method: 'keyword' | 'llm' | 'contextual_rule' | 'explicit_hint' | 'default' | 'llm_stub'; // How was this decision made?
  insights?: Record<string, any>; // Additional details, e.g., matched keywords, LLM reasoning
}

/**
 * Represents the result of a mental health analysis.
 */
export interface MentalHealthAnalysisResult {
  hasMentalHealthIssue: boolean;
  mentalHealthCategory: string; // e.g., 'crisis', 'depression', 'anxiety', 'none', 'unknown'
  confidence: number; // Overall confidence in the primary category
  explanation: string; // Textual explanation of the findings
  supportingEvidence?: string[]; // Snippets from the input text that support the findings
  isCrisis: boolean; // True if a crisis was detected
  timestamp: string; // ISO string of when the analysis was performed
  _routingDecision?: RoutingDecision; // Optional: The routing decision that led to this analysis
  _rawModelOutput?: any; // Optional: Raw output from the underlying LLM for debugging/logging
}

/**
 * Context for sending a crisis alert.
 * This should align with what ICrisisNotificationHandler expects.
 */
export interface CrisisContext {
  userId?: string;
  sessionId?: string;
  textSample: string; // A snippet of the text that triggered the crisis alert
  timestamp: string; // ISO string of when the crisis was detected
  decisionDetails: Partial<RoutingDecision>; // Information from the routing decision
  analysisResult?: Partial<MentalHealthAnalysisResult>; // Relevant parts of the analysis
  sessionType?: string; // from RoutingContext
  explicitTaskHint?: string; // from RoutingContext
}

/**
 * Defines the signature for a function that can invoke an LLM.
 * Takes a list of messages (e.g., in OpenAI chat format) and returns a promise
 * that resolves to the LLM's response (expected to be parsed JSON or string).
 */
export type LLMInvoker = (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; max_tokens?: number; [key: string]: any }
) => Promise<any>;


/**
 * Options for constructing the MentalLLaMAAdapter.
 */
export interface MentalLLaMAAdapterOptions {
  modelProvider?: any; // Placeholder for actual model provider interface/class
  pythonBridge?: any; // Placeholder for actual Python bridge interface/class
  crisisNotifier?: ICrisisNotificationHandler;
  taskRouter?: any; // Placeholder for MentalHealthTaskRouter interface/class
}

/**
 * Interface for a crisis notification handler.
 * This is often defined in a NotificationService file, but duplicated here for visibility
 * if the actual NotificationService interfaces are not directly accessible or to ensure alignment.
 * If a central ICrisisNotificationHandler exists, prefer importing that.
 */
export interface ICrisisNotificationHandler {
  sendCrisisAlert(alertContext: CrisisContext): Promise<void>;
}

// Example of a more specific analysis result if needed in the future
export interface DepressionAnalysisResult extends MentalHealthAnalysisResult {
  beckDepressionInventoryScore?: number; // Example specific field
}

// General purpose LLM Response for router if it needs to parse structured JSON
export interface LLMRoutingResponse {
  category: string;
  confidence: number;
  reasoning?: string;
  sub_categories?: string[];
  is_critical_intent?: boolean;
}
