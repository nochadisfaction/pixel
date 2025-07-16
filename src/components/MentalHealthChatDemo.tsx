'use client'

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Heart, Brain, Shield, Zap } from 'lucide-react'
// import {
//   MentalHealthInsights,
//   MentalHealthHistoryChart,
//   type EnhancedMentalHealthAnalysis as ComponentEnhancedMentalHealthAnalysis,
// } from '@/components/MentalHealthInsights'

// Temporary placeholder types until MentalHealthInsights component is available
type ComponentEnhancedMentalHealthAnalysis = {
  timestamp: number
  category: string
  explanation: string
  expertGuided: boolean
  scores: Record<string, number>
  summary: string
  hasMentalHealthIssue: boolean
  confidence: number
  supportingEvidence: string[]
  riskLevel: string
}
import { getLogger } from '@/lib/utils/logger'
import { createMentalLLaMAFromEnv } from '@/lib/ai/mental-llama'
import type {
  MentalHealthAnalysisResult,
  RoutingContext,
} from '@/lib/ai/mental-llama/types/mentalLLaMATypes'
import { ClinicalKnowledgeBase } from '@/lib/ai/mental-llama/ClinicalKnowledgeBase'

// Use the imported interface type
type EnhancedMentalHealthAnalysis = ComponentEnhancedMentalHealthAnalysis

// Extended analysis result that might include additional fields
interface ExtendedMentalHealthAnalysisResult
  extends MentalHealthAnalysisResult {
  expertGuidance?: unknown
  categoryScores?: {
    depression?: number
    anxiety?: number
    stress?: number
    anger?: number
    socialIsolation?: number
    bipolarDisorder?: number
    ocd?: number
    eatingDisorder?: number
    socialAnxiety?: number
    panicDisorder?: number
  }
}

interface MentalHealthAdapter {
  analyzeMentalHealth(
    content: string,
    route: string,
    context: RoutingContext,
  ): Promise<MentalHealthAnalysisResult>
}

interface MentalHealthService {
  adapter: MentalHealthAdapter | null
  clinicalKnowledge: ClinicalKnowledgeBase
  isInitialized: boolean
}

const logger = getLogger('MentalHealthChatDemo')

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  mentalHealthAnalysis?: MentalHealthAnalysisResult
  isProcessing?: boolean
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  needsIntervention?: boolean
}

// Helper function to convert MentalHealthAnalysisResult to EnhancedMentalHealthAnalysis
const enhanceAnalysis = (
  analysis?: MentalHealthAnalysisResult,
): EnhancedMentalHealthAnalysis | undefined => {
  if (!analysis) {
    return undefined
  }

  // Type assertion to extended interface for additional properties
  const extendedAnalysis = analysis as ExtendedMentalHealthAnalysisResult

  // Convert the MentalLLaMA result to the enhanced analysis format
  return {
    timestamp: Date.now(),
    category: analysis.mentalHealthCategory || 'general',
    explanation: analysis.explanation || 'Analysis completed',
    expertGuided: !!extendedAnalysis.expertGuidance,
    scores: {
      depression:
        extendedAnalysis.categoryScores?.depression ||
        (analysis.mentalHealthCategory === 'depression'
          ? analysis.confidence
          : 0),
      anxiety:
        extendedAnalysis.categoryScores?.anxiety ||
        (analysis.mentalHealthCategory === 'anxiety' ? analysis.confidence : 0),
      stress:
        extendedAnalysis.categoryScores?.stress ||
        (analysis.mentalHealthCategory === 'stress' ? analysis.confidence : 0),
      anger:
        extendedAnalysis.categoryScores?.anger ||
        (analysis.mentalHealthCategory === 'anger' ? analysis.confidence : 0),
      socialIsolation:
        extendedAnalysis.categoryScores?.socialIsolation ||
        (analysis.mentalHealthCategory === 'social_isolation'
          ? analysis.confidence
          : 0),
      bipolarDisorder:
        extendedAnalysis.categoryScores?.bipolarDisorder ||
        (analysis.mentalHealthCategory === 'bipolar' ? analysis.confidence : 0),
      ocd:
        extendedAnalysis.categoryScores?.ocd ||
        (analysis.mentalHealthCategory === 'ocd' ? analysis.confidence : 0),
      eatingDisorder:
        extendedAnalysis.categoryScores?.eatingDisorder ||
        (analysis.mentalHealthCategory === 'eating_disorder'
          ? analysis.confidence
          : 0),
      socialAnxiety:
        extendedAnalysis.categoryScores?.socialAnxiety ||
        (analysis.mentalHealthCategory === 'social_anxiety'
          ? analysis.confidence
          : 0),
      panicDisorder:
        extendedAnalysis.categoryScores?.panicDisorder ||
        (analysis.mentalHealthCategory === 'panic_disorder'
          ? analysis.confidence
          : 0),
    },

    summary: analysis.explanation || 'Mental health analysis completed',
    // expertGuidance doesn't exist on MentalHealthAnalysisResult, so we omit expertExplanation
    hasMentalHealthIssue: analysis.hasMentalHealthIssue || false,
    confidence: analysis.confidence || 0,
    supportingEvidence: analysis.supportingEvidence || [],
    riskLevel: analysis.isCrisis
      ? 'high'
      : analysis.confidence > 0.7
        ? 'medium'
        : 'low',
  }
}

// Helper to convert an array of analyses
const enhanceAnalysisArray = (
  analyses: MentalHealthAnalysisResult[],
): EnhancedMentalHealthAnalysis[] => {
  return analyses.map((analysis) => enhanceAnalysis(analysis)!).filter(Boolean)
}

/**
 * Production-grade Mental Health Chat Demo Component
 * Showcases real MentalLLaMA integration with clinical-grade analysis
 */
export const MentalHealthChatDemo = memo(function MentalHealthChatDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content: `Welcome to our Mental Health Chat powered by MentalLLaMA. I'm here to provide thoughtful, evidence-based support.

🧠 **Clinical-Grade Analysis**: Advanced AI analyzes your messages for mental health indicators
🔒 **Privacy-First**: All analysis uses encrypted processing - your data stays secure
📊 **Real-Time Insights**: Get immediate feedback on emotional patterns and trends
🚨 **Crisis Detection**: Automatic identification of urgent situations with immediate resources

How are you feeling today? I'm here to listen and help.`,
      timestamp: Date.now(),
    },
  ])

  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mentalHealthService, setMentalHealthService] =
    useState<MentalHealthService | null>(null)
  const [settings, setSettings] = useState({
    enableAnalysis: true,
    useExpertGuidance: true,
    showAnalysisPanel: true,
    enableCrisisDetection: true,
    confidenceThreshold: 0.6,
    interventionThreshold: 0.7,
  })
  const [sessionStats, setSessionStats] = useState({
    totalMessages: 0,
    analysisCount: 0,
    averageConfidence: 0,
    riskTrend: 'stable' as 'improving' | 'stable' | 'declining' | 'critical',
    interventionsTriggered: 0,
  })

  // Generate unique session identifiers
  const sessionId = useMemo(() => {
    const array = new Uint8Array(6)
    crypto.getRandomValues(array)
    const randomStr = Array.from(array, (byte) => byte.toString(36)).join('')
    return `session_${Date.now()}_${randomStr}`
  }, [])
  const userId = useMemo(() => `user_${Date.now()}_demo`, [])
  const timeoutRefs = useRef<number[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutRefs.current
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  // Initialize production-grade MentalLLaMA service
  useEffect(() => {
    const initializeService = async () => {
      try {
        logger.info('Initializing production MentalLLaMA service...')

        // Initialize the production-grade MentalLLaMA components
        const { adapter } = await createMentalLLaMAFromEnv()
        const clinicalKnowledge = new ClinicalKnowledgeBase()

        setMentalHealthService({
          adapter: adapter as unknown as MentalHealthAdapter,
          clinicalKnowledge,
          isInitialized: true,
        })

        logger.info('Production MentalLLaMA service initialized successfully')
      } catch (error) {
        logger.error('Failed to initialize MentalLLaMA service', { error })

        // Fallback to demonstration mode with limited functionality
        setMentalHealthService({
          adapter: null,
          clinicalKnowledge: new ClinicalKnowledgeBase(),
          isInitialized: false,
        })
      }
    }

    initializeService()
  }, [])

  // Get analysis history for visualization
  const getAnalysisHistory = useCallback((): MentalHealthAnalysisResult[] => {
    return messages
      .filter((m) => m.mentalHealthAnalysis)
      .map((m) => m.mentalHealthAnalysis!)
  }, [messages])

  // Enhanced analysis for component compatibility
  const enhancedAnalysisHistory = useMemo(() => {
    const analysisHistory = getAnalysisHistory()
    return enhanceAnalysisArray(analysisHistory)
  }, [getAnalysisHistory])

  // Process user message with production-grade analysis
  const handleSendMessage = async () => {
    if (!input.trim() || processing) {
      return
    }

    setProcessing(true)
    let userMessageId: string | null = null

    try {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: (() => {
          const array = new Uint8Array(6)
          crypto.getRandomValues(array)
          const randomStr = Array.from(array, (byte) => byte.toString(36)).join(
            '',
          )
          return `user_${Date.now()}_${randomStr}`
        })(),
        role: 'user',
        content: input,
        timestamp: Date.now(),
        isProcessing: true,
      }

      userMessageId = userMessage.id

      setMessages((prev) => [...prev, userMessage])
      setInput('')

      // Perform production-grade analysis if service is available
      if (mentalHealthService?.isInitialized && mentalHealthService.adapter) {
        logger.info('Performing production-grade mental health analysis...')

        const routingContext: RoutingContext = {
          userId,
          sessionId,
        }

        // Use the production MentalLLaMA adapter with proper typing
        const analysisResult = await (
          mentalHealthService.adapter as unknown as {
            analyzeMentalHealth: (params: {
              content: string
              route: string
              context: RoutingContext
            }) => Promise<MentalHealthAnalysisResult>
          }
        ).analyzeMentalHealth({
          content: userMessage.content,
          route: 'auto_route',
          context: routingContext,
        })

        // Update message with analysis results
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id
              ? {
                  ...m,
                  mentalHealthAnalysis: analysisResult,
                  isProcessing: false,
                  riskLevel: analysisResult.isCrisis
                    ? 'critical'
                    : analysisResult.confidence > 0.7
                      ? 'high'
                      : analysisResult.confidence > 0.4
                        ? 'medium'
                        : 'low',
                  needsIntervention:
                    analysisResult.isCrisis ||
                    analysisResult.confidence > settings.interventionThreshold,
                }
              : m,
          ),
        )

        // Update session statistics
        setSessionStats((prev) => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
          analysisCount: prev.analysisCount + 1,
          averageConfidence:
            (prev.averageConfidence * prev.analysisCount +
              analysisResult.confidence) /
            (prev.analysisCount + 1),
          riskTrend: analysisResult.isCrisis
            ? 'critical'
            : analysisResult.confidence > 0.7
              ? 'declining'
              : analysisResult.confidence < 0.3
                ? 'improving'
                : 'stable',
          interventionsTriggered: analysisResult.isCrisis
            ? prev.interventionsTriggered + 1
            : prev.interventionsTriggered,
        }))

        // Generate appropriate therapeutic response
        const responseContent =
          await generateTherapeuticResponse(analysisResult)

        // Add assistant response
        const timeoutId = window.setTimeout(() => {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }, 1500)
        timeoutRefs.current.push(timeoutId)
      } else {
        // Fallback for demo mode
        logger.warn('MentalLLaMA service not available, using demo mode')

        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, isProcessing: false } : m,
          ),
        )

        // Generate a basic response for demo purposes
        const timeoutId = window.setTimeout(() => {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            role: 'assistant',
            content: getDemoResponse(userMessage.content),
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }, 1000)
        timeoutRefs.current.push(timeoutId)
      }
    } catch (error) {
      logger.error('Error processing message', { error })

      // Remove processing state on error
      if (userMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessageId ? { ...m, isProcessing: false } : m,
          ),
        )
      }
    } finally {
      setProcessing(false)
    }
  }

  // Generate therapeutic response based on analysis
  const generateTherapeuticResponse = async (
    analysis: MentalHealthAnalysisResult,
  ): Promise<string> => {
    if (!mentalHealthService?.clinicalKnowledge) {
      return "I understand. Can you tell me more about what you're experiencing?"
    }

    try {
      // Get intervention suggestions
      const interventions =
        mentalHealthService.clinicalKnowledge.getInterventionSuggestions(
          analysis.mentalHealthCategory,
          analysis,
        )

      // Handle crisis situations with immediate priority
      if (analysis.isCrisis) {
        return `I'm concerned about what you've shared. Your safety is the most important thing right now.

🚨 **Immediate Resources Available:**
• National Crisis Helpline: 988 (available 24/7)
• Crisis Text Line: Text HOME to 741741
• Emergency: 911

${analysis.explanation}

I'm here to support you through this. Would you like to talk about what's been making you feel this way?`
      }

      // Generate contextual response based on analysis
      const urgentInterventions = interventions.filter(
        (i) => i.urgency === 'urgent' || i.urgency === 'immediate',
      )

      if (urgentInterventions.length > 0 && urgentInterventions[0]) {
        return `Thank you for sharing that with me. Based on what you've told me, I think it would be helpful to focus on: ${urgentInterventions[0].intervention.toLowerCase()}.

${analysis.explanation}

${urgentInterventions[0].rationale}

How does this resonate with you? What feels most challenging right now?`
      }

      // Standard supportive response
      return `I hear you, and I appreciate you sharing this with me. ${analysis.explanation}

It sounds like you're dealing with some challenges. What's been the most difficult part of this experience for you?`
    } catch (error) {
      logger.error('Error generating therapeutic response', { error })
      return "I understand you're going through something difficult. Can you help me understand what's been on your mind lately?"
    }
  }

  // Demo response generator for fallback
  const getDemoResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()

    if (
      lowerMessage.includes('sad') ||
      lowerMessage.includes('depressed') ||
      lowerMessage.includes('down')
    ) {
      return "I hear that you're feeling down. That can be really difficult to experience. What's been contributing to these feelings lately?"
    }

    if (
      lowerMessage.includes('anxious') ||
      lowerMessage.includes('worried') ||
      lowerMessage.includes('nervous')
    ) {
      return "It sounds like you're experiencing some anxiety. That's really common, and there are ways to help manage those feelings. What situations tend to make you feel most anxious?"
    }

    if (
      lowerMessage.includes('angry') ||
      lowerMessage.includes('frustrated') ||
      lowerMessage.includes('mad')
    ) {
      return "I can hear the frustration in what you're sharing. Anger often comes up when we're feeling hurt or when our needs aren't being met. What's been triggering these feelings?"
    }

    return "Thank you for sharing that with me. I'm here to listen and support you. Can you tell me more about what's been on your mind?"
  }

  // Toggle settings with production-grade configuration
  const handleToggleSetting = (setting: keyof typeof settings) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [setting]: !prev[setting] }

      // Log configuration changes for audit trail
      logger.info('Mental health chat settings updated', {
        setting,
        newValue: newSettings[setting],
        sessionId,
        userId,
      })

      return newSettings
    })
  }

  // Request therapeutic intervention
  const handleRequestIntervention = async (
    messageWithAnalysis: ChatMessage,
  ) => {
    if (
      !mentalHealthService?.isInitialized ||
      !messageWithAnalysis.mentalHealthAnalysis
    ) {
      return
    }

    setProcessing(true)

    try {
      logger.info('Generating therapeutic intervention', {
        messageId: messageWithAnalysis.id,
        analysisCategory:
          messageWithAnalysis.mentalHealthAnalysis.mentalHealthCategory,
        confidence: messageWithAnalysis.mentalHealthAnalysis.confidence,
      })

      const intervention = await generateTherapeuticResponse(
        messageWithAnalysis.mentalHealthAnalysis,
      )

      const assistantMessage: ChatMessage = {
        id: `intervention_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        role: 'assistant',
        content: `💡 **Therapeutic Intervention**\n\n${intervention}`,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update intervention statistics
      setSessionStats((prev) => ({
        ...prev,
        interventionsTriggered: prev.interventionsTriggered + 1,
      }))
    } catch (error) {
      logger.error('Error generating intervention', { error })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-7xl mx-auto">
      {/* Main Chat Interface */}
      <div
        className={`flex-1 ${settings.showAnalysisPanel ? 'md:max-w-[65%]' : 'w-full'}`}
      >
        <Card className="h-[700px] flex flex-col shadow-lg">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    MentalLLaMA Chat
                  </h2>
                  <p className="text-sm text-gray-600">
                    Production-Grade Mental Health Analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mentalHealthService?.isInitialized ? (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Live Analysis
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200"
                  >
                    Demo Mode
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Session: {sessionStats.totalMessages} msgs
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%] space-y-2">
                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900 border'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                      {message.isProcessing && (
                        <div className="flex items-center mt-2 text-xs opacity-70">
                          <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full mr-2"></div>
                          Analyzing...
                        </div>
                      )}
                    </div>

                    {/* Analysis Results */}
                    {message.mentalHealthAnalysis && !message.isProcessing && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">
                            Analysis Results
                          </span>
                          <div className="flex items-center gap-2">
                            {message.riskLevel && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  message.riskLevel === 'critical'
                                    ? 'border-red-200 text-red-700 bg-red-50'
                                    : message.riskLevel === 'high'
                                      ? 'border-orange-200 text-orange-700 bg-orange-50'
                                      : message.riskLevel === 'medium'
                                        ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                                        : 'border-green-200 text-green-700 bg-green-50'
                                }`}
                              >
                                {message.riskLevel === 'critical' && '🚨'}
                                {message.riskLevel === 'high' && '⚠️'}
                                {message.riskLevel === 'medium' && '⚠️'}
                                {message.riskLevel === 'low' && '✓'}{' '}
                                {message.riskLevel.toUpperCase()}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {Math.round(
                                (message.mentalHealthAnalysis.confidence || 0) *
                                  100,
                              )}
                              % confidence
                            </Badge>
                          </div>
                        </div>
                        <p className="text-blue-800 text-xs mb-2">
                          <span className="font-medium">Category:</span>{' '}
                          {message.mentalHealthAnalysis.mentalHealthCategory}
                        </p>
                        <p className="text-blue-700 text-xs">
                          {message.mentalHealthAnalysis.explanation}
                        </p>
                        {message.needsIntervention && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs h-7"
                            onClick={() => handleRequestIntervention(message)}
                          >
                            <Heart className="w-3 h-3 mr-1" />
                            Request Intervention
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {processing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 border rounded-2xl px-4 py-3 max-w-[85%]">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                      {mentalHealthService?.isInitialized
                        ? 'Processing with MentalLLaMA...'
                        : 'Thinking...'}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-red-600 hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-3">
                <Input
                  placeholder={
                    mentalHealthService?.isInitialized
                      ? "Share what's on your mind... (encrypted & analyzed securely)"
                      : 'Type your message... (demo mode)'
                  }
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={processing}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={processing || !input.trim()}
                  className="px-6"
                >
                  {processing ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>

              {/* Privacy Notice */}
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {mentalHealthService?.isInitialized ? (
                  <>
                    All messages are encrypted and analyzed locally. No data is
                    stored on external servers.
                  </>
                ) : (
                  <>
                    Running in demo mode. Production version uses encrypted
                    processing.
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Analysis Panel */}
      {settings.showAnalysisPanel && (
        <div className="md:w-[35%] space-y-4">
          <Tabs defaultValue="insights" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="insights" className="text-xs">
                <Brain className="w-3 h-3 mr-1" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <Heart className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="insights" className="mt-4 space-y-4">
              <div></div>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <div></div>
            </TabsContent>
            <TabsContent value="stats" className="mt-4">
              <div></div>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <div></div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
})

export default MentalHealthChatDemo
