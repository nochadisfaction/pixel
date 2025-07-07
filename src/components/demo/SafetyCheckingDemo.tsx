import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Shield, 
  Heart, 
  Phone,
  Clock,
  CheckCircle,
  Eye,
  Brain,
  Users,
  FileText,
  Zap
} from 'lucide-react';

interface RiskFactor {
  id: string;
  category: 'suicide' | 'self-harm' | 'violence' | 'substance' | 'psychosis' | 'neglect';
  name: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  indicators: string[];
  interventions: string[];
  status: 'detected' | 'not-detected' | 'monitoring';
  confidence: number;
}

interface SafetyProtocol {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  actions: string[];
  timeframe: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'inactive' | 'monitoring' | 'active' | 'escalated';
}

interface SafetyCheckingDemoProps {
  sessionData?: unknown;
  onRiskDetected?: (risk: RiskFactor) => void;
  onProtocolActivated?: (protocol: SafetyProtocol) => void;
}

const SafetyCheckingDemo: React.FC<SafetyCheckingDemoProps> = ({
  // eslint-disable-next-line react/prop-types
  _sessionData,
  onRiskDetected,
  onProtocolActivated
}) => {
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [safetyProtocols, setSafetyProtocols] = useState<SafetyProtocol[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [overallRiskLevel, setOverallRiskLevel] = useState<'low' | 'moderate' | 'high' | 'critical'>('low');
  const [scanProgress, setScanProgress] = useState(0);

  // Initialize risk factors and safety protocols
  useEffect(() => {
    const initialRiskFactors: RiskFactor[] = [
      {
        id: 'suicide-ideation',
        category: 'suicide',
        name: 'Suicidal Ideation',
        description: 'Thoughts or expressions of wanting to end one\'s life',
        severity: 'critical',
        indicators: [
          'Direct statements about wanting to die',
          'Hopelessness expressions',
          'Previous suicide attempts',
          'Detailed suicide plans',
          'Access to means'
        ],
        interventions: [
          'Immediate safety assessment',
          'Remove access to means',
          'Crisis intervention protocol',
          'Emergency contact notification',
          'Continuous monitoring'
        ],
        status: 'not-detected',
        confidence: 0
      },
      {
        id: 'self-harm',
        category: 'self-harm',
        name: 'Self-Harm Behaviors',
        description: 'Intentional self-injury without suicidal intent',
        severity: 'high',
        indicators: [
          'Cutting or burning behaviors',
          'Hitting or scratching self',
          'Substance abuse as self-harm',
          'Risky behaviors',
          'Emotional dysregulation'
        ],
        interventions: [
          'Safety planning',
          'Coping skills training',
          'Emotional regulation techniques',
          'Support system activation',
          'Regular check-ins'
        ],
        status: 'monitoring',
        confidence: 65
      },
      {
        id: 'violence-risk',
        category: 'violence',
        name: 'Violence Risk',
        description: 'Risk of harm to others',
        severity: 'high',
        indicators: [
          'Threats toward others',
          'History of violence',
          'Paranoid ideation',
          'Substance use',
          'Access to weapons'
        ],
        interventions: [
          'Threat assessment',
          'Duty to warn protocols',
          'Law enforcement contact',
          'Protective measures',
          'Treatment intensification'
        ],
        status: 'not-detected',
        confidence: 0
      },
      {
        id: 'substance-abuse',
        category: 'substance',
        name: 'Substance Abuse Risk',
        description: 'Problematic substance use patterns',
        severity: 'moderate',
        indicators: [
          'Increased tolerance',
          'Withdrawal symptoms',
          'Failed quit attempts',
          'Social/occupational impairment',
          'Continued use despite consequences'
        ],
        interventions: [
          'Substance abuse assessment',
          'Referral to addiction services',
          'Harm reduction strategies',
          'Support group referral',
          'Medical evaluation'
        ],
        status: 'detected',
        confidence: 78
      },
      {
        id: 'psychosis-risk',
        category: 'psychosis',
        name: 'Psychotic Symptoms',
        description: 'Loss of contact with reality',
        severity: 'high',
        indicators: [
          'Hallucinations',
          'Delusions',
          'Disorganized thinking',
          'Bizarre behavior',
          'Social withdrawal'
        ],
        interventions: [
          'Psychiatric evaluation',
          'Medication assessment',
          'Reality testing',
          'Family involvement',
          'Hospitalization consideration'
        ],
        status: 'not-detected',
        confidence: 0
      }
    ];

    const initialProtocols: SafetyProtocol[] = [
      {
        id: 'crisis-intervention',
        name: 'Crisis Intervention Protocol',
        description: 'Immediate response to acute safety risks',
        triggers: ['Suicidal ideation', 'Imminent self-harm', 'Violence threats'],
        actions: [
          'Immediate safety assessment',
          'Contact emergency services if needed',
          'Notify supervisor/crisis team',
          'Implement safety plan',
          'Arrange follow-up within 24 hours'
        ],
        timeframe: 'Immediate (0-15 minutes)',
        priority: 'emergency',
        status: 'inactive'
      },
      {
        id: 'safety-planning',
        name: 'Safety Planning Protocol',
        description: 'Collaborative safety plan development',
        triggers: ['Moderate risk factors', 'History of self-harm', 'Chronic suicidal ideation'],
        actions: [
          'Identify warning signs',
          'Develop coping strategies',
          'Create support network list',
          'Remove access to means',
          'Schedule regular check-ins'
        ],
        timeframe: 'Within session (30-60 minutes)',
        priority: 'high',
        status: 'monitoring'
      },
      {
        id: 'duty-to-warn',
        name: 'Duty to Warn Protocol',
        description: 'Legal obligation to warn potential victims',
        triggers: ['Specific threats to identifiable persons', 'Credible violence risk'],
        actions: [
          'Document threat assessment',
          'Contact potential victim',
          'Notify law enforcement',
          'Inform supervisor',
          'Continue treatment planning'
        ],
        timeframe: 'Immediate (0-30 minutes)',
        priority: 'emergency',
        status: 'inactive'
      },
      {
        id: 'monitoring-protocol',
        name: 'Enhanced Monitoring Protocol',
        description: 'Increased surveillance for at-risk clients',
        triggers: ['Elevated risk factors', 'Recent stressors', 'Treatment non-compliance'],
        actions: [
          'Increase session frequency',
          'Daily check-in calls',
          'Coordinate with support system',
          'Monitor medication compliance',
          'Weekly risk reassessment'
        ],
        timeframe: 'Ongoing (1-4 weeks)',
        priority: 'medium',
        status: 'active'
      }
    ];

    setRiskFactors(initialRiskFactors);
    setSafetyProtocols(initialProtocols);

    // Calculate overall risk level
    const detectedRisks = initialRiskFactors.filter(rf => rf.status === 'detected' || rf.status === 'monitoring');
    const criticalRisks = detectedRisks.filter(rf => rf.severity === 'critical');
    const highRisks = detectedRisks.filter(rf => rf.severity === 'high');
    
    if (criticalRisks.length > 0) {
      setOverallRiskLevel('critical');
    } else if (highRisks.length > 1) {
      setOverallRiskLevel('high');
    } else if (highRisks.length > 0 || detectedRisks.length > 2) {
      setOverallRiskLevel('moderate');
    } else {
      setOverallRiskLevel('low');
    }
  }, []);

  const runSafetyCheck = async () => {
    setIsScanning(true);
    setScanProgress(0);

    // Simulate scanning process
    for (let i = 0; i <= 100; i += 10) {
      setScanProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Simulate risk detection updates
    const updatedRiskFactors = riskFactors.map(rf => {
      if (rf.id === 'suicide-ideation') {
        return { ...rf, status: 'monitoring' as const, confidence: 45 };
      }
      if (rf.id === 'self-harm') {
        return { ...rf, confidence: Math.min(85, rf.confidence + 20) };
      }
      return rf;
    });

    setRiskFactors(updatedRiskFactors);

    // Activate relevant protocols
    const updatedProtocols = safetyProtocols.map(sp => {
      if (sp.id === 'safety-planning') {
        return { ...sp, status: 'active' as const };
      }
      return sp;
    });

    setSafetyProtocols(updatedProtocols);
    setIsScanning(false);

    // Trigger callbacks
    const detectedRisk = updatedRiskFactors.find(rf => rf.id === 'suicide-ideation');
    if (detectedRisk && onRiskDetected) {
      onRiskDetected(detectedRisk);
    }

    const activatedProtocol = updatedProtocols.find(sp => sp.id === 'safety-planning');
    if (activatedProtocol && onProtocolActivated) {
      onProtocolActivated(activatedProtocol);
    }
  };

  const getSeverityColor = (severity: RiskFactor['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'moderate':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
    }
  };

  const getStatusIcon = (status: RiskFactor['status']) => {
    switch (status) {
      case 'detected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'monitoring':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'not-detected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: SafetyProtocol['priority']) => {
    switch (priority) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getProtocolStatusIcon = (status: SafetyProtocol['status']) => {
    switch (status) {
      case 'active':
        return <Zap className="w-4 h-4 text-blue-500" />;
      case 'monitoring':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Safety Checking & Risk Assessment</h2>
          <p className="text-gray-600 mt-1">
            Real-time safety monitoring and risk assessment with automated protocol activation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge 
            variant={overallRiskLevel === 'critical' ? 'destructive' : 
                    overallRiskLevel === 'high' ? 'secondary' : 'default'}
            className="text-sm"
          >
            {overallRiskLevel.toUpperCase()} RISK
          </Badge>
          <Button 
            onClick={runSafetyCheck} 
            disabled={isScanning}
            className="flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            {isScanning ? 'Scanning...' : 'Run Safety Check'}
          </Button>
        </div>
      </div>

      {/* Scanning Progress */}
      {isScanning && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Safety Scan in Progress</span>
              <span className="text-sm text-gray-500">{scanProgress}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              Analyzing session content for risk indicators and safety concerns...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Factors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Risk Factor Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskFactors.map((risk) => (
                <div key={risk.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(risk.status)}
                      <div>
                        <h4 className="font-medium text-sm">{risk.name}</h4>
                        <p className="text-xs text-gray-600">{risk.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(risk.severity)}>
                        {risk.severity}
                      </Badge>
                      {risk.confidence > 0 && (
                        <Badge variant="outline">
                          {risk.confidence}% confidence
                        </Badge>
                      )}
                    </div>
                  </div>

                  {risk.status !== 'not-detected' && (
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Key Indicators:</h5>
                        <div className="flex flex-wrap gap-1">
                          {risk.indicators.slice(0, 3).map((indicator, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                          {risk.indicators.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{risk.indicators.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Recommended Interventions:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {risk.interventions.slice(0, 2).map((intervention, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-blue-500">•</span>
                              {intervention}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Safety Protocols */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Safety Protocols
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {safetyProtocols.map((protocol) => (
                <div key={protocol.id} className={`border-2 rounded-lg p-4 ${getPriorityColor(protocol.priority)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getProtocolStatusIcon(protocol.status)}
                      <div>
                        <h4 className="font-medium text-sm">{protocol.name}</h4>
                        <p className="text-xs opacity-80">{protocol.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {protocol.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {protocol.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h5 className="text-xs font-medium opacity-90 mb-1">Triggers:</h5>
                      <div className="flex flex-wrap gap-1">
                        {protocol.triggers.map((trigger, index) => (
                          <Badge key={index} variant="outline" className="text-xs opacity-75">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-medium opacity-90 mb-1">Timeframe:</h5>
                      <p className="text-xs opacity-75">{protocol.timeframe}</p>
                    </div>

                    {protocol.status === 'active' && (
                      <div>
                        <h5 className="text-xs font-medium opacity-90 mb-1">Active Actions:</h5>
                        <ul className="text-xs opacity-75 space-y-1">
                          {protocol.actions.slice(0, 3).map((action, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span>•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contacts & Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Emergency Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Crisis Hotlines</h4>
              <div className="space-y-2 text-sm text-red-700">
                <div>National Suicide Prevention: 988</div>
                <div>Crisis Text Line: Text HOME to 741741</div>
                <div>Emergency Services: 911</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Professional Support</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div>Clinical Supervisor: (555) 123-4567</div>
                <div>Crisis Team: (555) 987-6543</div>
                <div>On-call Psychiatrist: (555) 456-7890</div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Documentation</h4>
              <div className="space-y-2 text-sm text-green-700">
                <div>Risk Assessment Forms</div>
                <div>Safety Plan Templates</div>
                <div>Incident Report System</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Safety Assessment Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="documentation">Documentation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {riskFactors.filter(rf => rf.status === 'detected').length}
                  </div>
                  <div className="text-sm text-gray-600">Active Risks</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {riskFactors.filter(rf => rf.status === 'monitoring').length}
                  </div>
                  <div className="text-sm text-gray-600">Monitoring</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {safetyProtocols.filter(sp => sp.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-600">Active Protocols</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(riskFactors.reduce((sum, rf) => sum + rf.confidence, 0) / riskFactors.length)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 mt-1" />
                  <div>
                    <div className="font-medium text-sm">Safety scan initiated</div>
                    <div className="text-xs text-gray-600">Comprehensive risk assessment started</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Eye className="w-4 h-4 text-yellow-600 mt-1" />
                  <div>
                    <div className="font-medium text-sm">Self-harm indicators detected</div>
                    <div className="text-xs text-gray-600">Monitoring protocol activated</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <Shield className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <div className="font-medium text-sm">Safety planning protocol activated</div>
                    <div className="text-xs text-gray-600">Collaborative safety plan development initiated</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="interventions" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Recommended Immediate Actions:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Complete comprehensive safety assessment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Develop collaborative safety plan with client</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <span className="text-sm">Schedule follow-up within 48 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-sm">Engage support system (family/friends)</span>
                  </li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="documentation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Generate Risk Assessment Report
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Export Safety Plan Template
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Share with Clinical Team
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Schedule Follow-up
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SafetyCheckingDemo;
