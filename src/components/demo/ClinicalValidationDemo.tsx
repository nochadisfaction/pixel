import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Brain, 
  Heart,
  FileText,
  Users,
  Zap
} from 'lucide-react';

interface ValidationLayer {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'passed' | 'failed' | 'warning';
  score: number;
  details: ValidationDetail[];
  processingTime: number;
}

interface ValidationDetail {
  criterion: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ClinicalValidationDemoProps {
  _caseData?: unknown;
  onValidationComplete?: (results: ValidationLayer[]) => void;
}

const ClinicalValidationDemo: React.FC<ClinicalValidationDemoProps> = ({
  _caseData,
  onValidationComplete
}) => {
  const [validationLayers, setValidationLayers] = useState<ValidationLayer[]>([]);
  const [currentLayer, setCurrentLayer] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  // Initialize validation layers
  useEffect(() => {
    const initialLayers: ValidationLayer[] = [
      {
        id: 'diagnostic',
        name: 'Diagnostic Validation',
        description: 'Validates diagnostic accuracy against DSM-5 and ICD-11 criteria',
        icon: <Brain className="w-5 h-5" />,
        status: 'pending',
        score: 0,
        processingTime: 0,
        details: [
          {
            criterion: 'DSM-5 Criteria Alignment',
            status: 'passed',
            message: 'Diagnostic criteria properly matched',
            severity: 'high'
          },
          {
            criterion: 'Differential Diagnosis',
            status: 'passed',
            message: 'Alternative diagnoses considered',
            severity: 'medium'
          },
          {
            criterion: 'Severity Assessment',
            status: 'warning',
            message: 'Severity indicators need clarification',
            severity: 'medium'
          },
          {
            criterion: 'Comorbidity Analysis',
            status: 'passed',
            message: 'Comorbid conditions properly identified',
            severity: 'high'
          }
        ]
      },
      {
        id: 'therapeutic',
        name: 'Therapeutic Validation',
        description: 'Ensures therapeutic interventions follow evidence-based practices',
        icon: <Heart className="w-5 h-5" />,
        status: 'pending',
        score: 0,
        processingTime: 0,
        details: [
          {
            criterion: 'Evidence-Based Interventions',
            status: 'passed',
            message: 'Interventions supported by research',
            severity: 'critical'
          },
          {
            criterion: 'Treatment Modality Appropriateness',
            status: 'passed',
            message: 'CBT approach suitable for presenting problem',
            severity: 'high'
          },
          {
            criterion: 'Goal Setting Framework',
            status: 'passed',
            message: 'SMART goals properly structured',
            severity: 'medium'
          },
          {
            criterion: 'Cultural Competency',
            status: 'warning',
            message: 'Cultural factors require additional consideration',
            severity: 'high'
          }
        ]
      },
      {
        id: 'ethical',
        name: 'Ethical Validation',
        description: 'Reviews ethical considerations and professional standards compliance',
        icon: <Shield className="w-5 h-5" />,
        status: 'pending',
        score: 0,
        processingTime: 0,
        details: [
          {
            criterion: 'Informed Consent Elements',
            status: 'passed',
            message: 'All consent elements properly addressed',
            severity: 'critical'
          },
          {
            criterion: 'Confidentiality Protocols',
            status: 'passed',
            message: 'Privacy protections in place',
            severity: 'critical'
          },
          {
            criterion: 'Dual Relationship Avoidance',
            status: 'passed',
            message: 'No boundary violations identified',
            severity: 'high'
          },
          {
            criterion: 'Competency Boundaries',
            status: 'passed',
            message: 'Treatment within scope of practice',
            severity: 'high'
          }
        ]
      },
      {
        id: 'safety',
        name: 'Safety Assessment',
        description: 'Evaluates risk factors and safety protocols',
        icon: <AlertTriangle className="w-5 h-5" />,
        status: 'pending',
        score: 0,
        processingTime: 0,
        details: [
          {
            criterion: 'Suicide Risk Assessment',
            status: 'passed',
            message: 'Comprehensive risk evaluation completed',
            severity: 'critical'
          },
          {
            criterion: 'Self-Harm Indicators',
            status: 'passed',
            message: 'No immediate self-harm risk identified',
            severity: 'critical'
          },
          {
            criterion: 'Crisis Intervention Plan',
            status: 'warning',
            message: 'Crisis plan needs more specific details',
            severity: 'high'
          },
          {
            criterion: 'Support System Assessment',
            status: 'passed',
            message: 'Adequate support network identified',
            severity: 'medium'
          }
        ]
      }
    ];

    setValidationLayers(initialLayers);
  }, []);

  const runValidation = async () => {
    setIsValidating(true);
    setCurrentLayer('');

    for (let i = 0; i < validationLayers.length; i++) {
      const layer = validationLayers[i];
      setCurrentLayer(layer.id);

      // Update layer status to processing
      setValidationLayers(prev => prev.map(l => 
        l.id === layer.id ? { ...l, status: 'processing' as const } : l
      ));

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));

      // Calculate layer score based on details
      const passedCount = layer.details.filter(d => d.status === 'passed').length;
      const warningCount = layer.details.filter(d => d.status === 'warning').length;
      const failedCount = layer.details.filter(d => d.status === 'failed').length;
      
      const score = Math.round(
        (passedCount * 100 + warningCount * 70 + failedCount * 0) / layer.details.length
      );

      let status: ValidationLayer['status'] = 'passed';
      if (failedCount > 0) status = 'failed';
      else if (warningCount > 0) status = 'warning';

      // Update layer with results
      setValidationLayers(prev => prev.map(l => 
        l.id === layer.id ? { 
          ...l, 
          status, 
          score,
          processingTime: 2000 + Math.random() * 1000
        } : l
      ));
    }

    // Calculate overall score
    const totalScore = validationLayers.reduce((sum, layer) => {
      const passedCount = layer.details.filter(d => d.status === 'passed').length;
      const warningCount = layer.details.filter(d => d.status === 'warning').length;
      const failedCount = layer.details.filter(d => d.status === 'failed').length;
      
      return sum + (passedCount * 100 + warningCount * 70 + failedCount * 0) / layer.details.length;
    }, 0);

    setOverallScore(Math.round(totalScore / validationLayers.length));
    setIsValidating(false);
    setCurrentLayer('');

    if (onValidationComplete) {
      onValidationComplete(validationLayers);
    }
  };

  const getStatusIcon = (status: ValidationLayer['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ValidationLayer['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: ValidationDetail['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clinical Validation System</h2>
          <p className="text-gray-600 mt-1">
            Multi-layer validation ensuring clinical accuracy, therapeutic appropriateness, and ethical compliance
          </p>
        </div>
        <Button 
          onClick={runValidation} 
          disabled={isValidating}
          className="flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {isValidating ? 'Validating...' : 'Run Validation'}
        </Button>
      </div>

      {/* Overall Progress */}
      {isValidating && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Validation Progress</span>
              <span className="text-sm text-gray-500">
                {currentLayer ? `Processing ${validationLayers.find(l => l.id === currentLayer)?.name}...` : 'Initializing...'}
              </span>
            </div>
            <Progress 
              value={validationLayers.filter(l => l.status !== 'pending').length / validationLayers.length * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Overall Score */}
      {overallScore > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Overall Validation Score</h3>
                <p className="text-sm text-gray-600">Composite score across all validation layers</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{overallScore}%</div>
                <Badge variant={overallScore >= 90 ? 'default' : overallScore >= 70 ? 'secondary' : 'destructive'}>
                  {overallScore >= 90 ? 'Excellent' : overallScore >= 70 ? 'Good' : 'Needs Review'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Layers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {validationLayers.map((layer) => (
          <Card key={layer.id} className={`border-2 ${getStatusColor(layer.status)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {layer.icon}
                  <div>
                    <CardTitle className="text-lg">{layer.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{layer.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(layer.status)}
                  {layer.score > 0 && (
                    <Badge variant="outline">{layer.score}%</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {layer.details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(detail.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{detail.criterion}</span>
                          <div 
                            className={`w-2 h-2 rounded-full ${getSeverityColor(detail.severity)}`}
                            title={`${detail.severity} severity`}
                          />
                        </div>
                        <p className="text-xs text-gray-600">{detail.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {layer.processingTime > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Processing Time</span>
                    <span>{Math.round(layer.processingTime)}ms</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Results */}
      {overallScore > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Validation Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {validationLayers.map((layer) => {
                    const passedCount = layer.details.filter(d => d.status === 'passed').length;
                    const warningCount = layer.details.filter(d => d.status === 'warning').length;
                    const failedCount = layer.details.filter(d => d.status === 'failed').length;
                    
                    return (
                      <div key={layer.id} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          {layer.icon}
                        </div>
                        <h4 className="font-medium text-sm mb-2">{layer.name}</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Passed:</span>
                            <span className="text-green-600">{passedCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Warnings:</span>
                            <span className="text-yellow-600">{warningCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="text-red-600">{failedCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="space-y-4">
                <div className="space-y-3">
                  {validationLayers.flatMap(layer => 
                    layer.details
                      .filter(detail => detail.status === 'warning' || detail.status === 'failed')
                      .map((detail, index) => (
                        <div key={`${layer.id}-${index}`} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-yellow-800">
                                {layer.name}: {detail.criterion}
                              </h4>
                              <p className="text-sm text-yellow-700 mt-1">{detail.message}</p>
                              <Badge variant="outline" className="mt-2">
                                {detail.severity} priority
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Processing Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Time:</span>
                        <span>{Math.round(validationLayers.reduce((sum, l) => sum + l.processingTime, 0))}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg per Layer:</span>
                        <span>{Math.round(validationLayers.reduce((sum, l) => sum + l.processingTime, 0) / validationLayers.length)}ms</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Quality Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Overall Score:</span>
                        <span>{overallScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Criteria Passed:</span>
                        <span>{validationLayers.flatMap(l => l.details).filter(d => d.status === 'passed').length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Coverage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Layers Validated:</span>
                        <span>{validationLayers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Criteria:</span>
                        <span>{validationLayers.flatMap(l => l.details).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="export" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Export Validation Report (PDF)
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Share with Clinical Team
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicalValidationDemo;
