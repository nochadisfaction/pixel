'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Brain, MessageCircle, Settings, TrendingUp } from 'lucide-react'
import { MentalHealthService } from '@/lib/mental-health'
import type { ChatMessage, MentalHealthAnalysis, AnalysisConfig } from '@/lib/mental-health'

function getRiskBadgeColor(riskLevel: string) {
  switch (riskLevel) {
    case 'critical': return 'destructive'
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'outline'
  }
}

interface MentalHealthChatDemoProps {
  conversationId?: string
  initialConfig?: Partial<AnalysisConfig>
}

export default function MentalHealthChatDemo({ 
  conversationId = 'demo-conversation',
  initialConfig = {}
}: MentalHealthChatDemoProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm here to listen and support you. How are you feeling today?",
      timestamp: Date.now()
    }
  ])
  
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [config, setConfig] = useState<AnalysisConfig>({
    enableAnalysis: true,
    confidenceThreshold: 0.6,
    interventionThreshold: 0.7,
    analysisMinLength: 10,
    enableCrisisDetection: true,
    ...initialConfig
  })
  
  const serviceRef = useRef<MentalHealthService>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize service
  useEffect(() => {
    serviceRef.current = new MentalHealthService(config)
  }, [config])

  // Update service config when config changes
  useEffect(() => {
    if (serviceRef.current) {
      serviceRef.current.updateConfig(config)
    }
  }, [config])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || !serviceRef.current || isProcessing) {
      return
    }

    const userMessage: Omit<ChatMessage, 'analysis'> = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    }

    setInput('')
    setIsProcessing(true)

    try {
      // Process user message
      const processedMessage = await serviceRef.current.processMessage(conversationId, userMessage)
      setMessages(prev => [...prev, processedMessage])

      // Generate therapeutic response
      const therapeuticResponse = await serviceRef.current.generateTherapeuticResponse(
        conversationId, 
        processedMessage.analysis
      )

      // Add assistant response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: therapeuticResponse.content,
          timestamp: Date.now()
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setIsProcessing(false)
      }, 1000 + Math.random() * 1000) // Simulate realistic response time

    } catch (error) {
      console.error('Error processing message:', error)
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getAnalysisHistory = (): MentalHealthAnalysis[] => {
    if (!serviceRef.current) {
      return []
    }
    return serviceRef.current.getAnalysisHistory(conversationId)
  }

  const needsIntervention = (): boolean => {
    if (!serviceRef.current) { return false }
    return serviceRef.current.needsIntervention(conversationId)
  }



  const getStats = () => {
    if (!serviceRef.current) {
      return null
    }
    return serviceRef.current.getStats(conversationId)
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Mental Health Support Chat</CardTitle>
                {needsIntervention() && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Intervention Needed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-lg px-4 py-3 max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        {message.analysis && (
                          <div className="mt-2 pt-2 border-t border-primary-foreground/20">
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={getRiskBadgeColor(message.analysis.riskLevel)} className="text-xs">
                                {message.analysis.riskLevel.toUpperCase()}
                              </Badge>
                              <span className="opacity-70">
                                {Math.round(message.analysis.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="rounded-lg px-4 py-3 max-w-[80%] bg-muted">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <span className="text-sm text-muted-foreground">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Share how you're feeling..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isProcessing}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!input.trim() || isProcessing}
                  size="sm"
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisPanel analysisHistory={getAnalysisHistory()} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsPanel stats={getStats()} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsPanel config={config} onConfigChange={setConfig} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AnalysisPanel({ analysisHistory }: { analysisHistory: MentalHealthAnalysis[] }) {
  if (analysisHistory.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No analysis data available yet. Start chatting to see mental health insights.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {analysisHistory.slice(-5).reverse().map((analysis) => (
        <Card key={analysis.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Analysis {new Date(analysis.timestamp).toLocaleTimeString()}
              </CardTitle>
              <Badge variant={getRiskBadgeColor(analysis.riskLevel)}>
                {analysis.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Confidence</Label>
                <div className="text-2xl font-bold">{Math.round(analysis.confidence * 100)}%</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Indicators</Label>
                <div className="text-2xl font-bold">{analysis.indicators.length}</div>
              </div>
            </div>
            
            {analysis.indicators.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Detected Issues</Label>
                <div className="space-y-2">
                  {analysis.indicators.map((indicator) => (
                    <div
                      key={`${indicator.type}-${indicator.severity}`}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="capitalize text-sm">{indicator.type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${indicator.severity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(indicator.severity * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.recommendations.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Recommendations</Label>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {analysis.recommendations.slice(0, 3).map((rec) => (
                    <li key={rec} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

interface InsightsStats {
  totalMessages: number
  analysisRate: number
  avgConfidence: number
  riskDistribution: Record<string, number>
  currentRiskTrend: 'improving' | 'stable' | 'worsening' | 'insufficient_data'
}

function InsightsPanel({ stats }: { stats: unknown }) {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No insights available yet.
        </CardContent>
      </Card>
    )
  }

  // Type guard to check if stats matches InsightsStats
  function isInsightsStats(obj: unknown): obj is InsightsStats {
    if (typeof obj !== 'object' || obj === null) {
      return false
    }
    const s = obj as InsightsStats
    return (
      typeof s.totalMessages === 'number' &&
      typeof s.analysisRate === 'number' &&
      typeof s.avgConfidence === 'number' &&
      typeof s.riskDistribution === 'object' &&
      s.riskDistribution !== null &&
      typeof s.currentRiskTrend === 'string'
    )
  }

  if (!isInsightsStats(stats)) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Invalid insights data.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Messages</span>
            <span className="font-medium">{stats.totalMessages}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Analysis Rate</span>
            <span className="font-medium">{Math.round(stats.analysisRate * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Avg Confidence</span>
            <span className="font-medium">{Math.round(stats.avgConfidence * 100)}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.riskDistribution).map(([level, count]) => (
            <div key={level} className="flex justify-between">
              <span className="text-sm text-muted-foreground capitalize">{level}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Current Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={
              stats.currentRiskTrend === 'improving' ? 'default' :
              stats.currentRiskTrend === 'worsening' ? 'destructive' : 'secondary'
            }>
              {stats.currentRiskTrend.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Based on recent analysis patterns
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingsPanel({ 
  config, 
  onConfigChange 
}: { 
  config: AnalysisConfig
  onConfigChange: (config: AnalysisConfig) => void 
}) {
  const updateConfig = (key: keyof AnalysisConfig, value: unknown) => {
    let typedValue: AnalysisConfig[keyof AnalysisConfig]
    switch (key) {
      case 'enableAnalysis':
      case 'enableCrisisDetection':
        typedValue = Boolean(value) as AnalysisConfig[keyof AnalysisConfig]
        break
      case 'confidenceThreshold':
      case 'interventionThreshold':
        typedValue = Number(value) as AnalysisConfig[keyof AnalysisConfig]
        break
      case 'analysisMinLength':
        typedValue = parseInt(String(value), 10) as AnalysisConfig[keyof AnalysisConfig]
        break
      default:
        typedValue = value as AnalysisConfig[keyof AnalysisConfig]
    }
    onConfigChange({ ...config, [key]: typedValue })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Enable Analysis</Label>
            <p className="text-xs text-muted-foreground">Analyze messages for mental health indicators</p>
          </div>
          <Switch
            checked={config.enableAnalysis}
            onCheckedChange={(checked) => updateConfig('enableAnalysis', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Crisis Detection</Label>
            <p className="text-xs text-muted-foreground">Enable detection of crisis situations</p>
          </div>
          <Switch
            checked={config.enableCrisisDetection}
            onCheckedChange={(checked) => updateConfig('enableCrisisDetection', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Confidence Threshold</Label>
          <p className="text-xs text-muted-foreground">Minimum confidence to show analysis results</p>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={config.confidenceThreshold}
            onChange={(e) => updateConfig('confidenceThreshold', parseFloat(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Intervention Threshold</Label>
          <p className="text-xs text-muted-foreground">Risk level that triggers intervention recommendations</p>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={config.interventionThreshold}
            onChange={(e) => updateConfig('interventionThreshold', parseFloat(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Minimum Analysis Length</Label>
          <p className="text-xs text-muted-foreground">Minimum message length to trigger analysis</p>
          <Input
            type="number"
            min="1"
            max="100"
            value={config.analysisMinLength}
            onChange={(e) => updateConfig('analysisMinLength', parseInt(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  )
}