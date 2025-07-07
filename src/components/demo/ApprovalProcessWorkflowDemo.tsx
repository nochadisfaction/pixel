import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  XCircle,
  User,
  Users,
  FileText,
  Send,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface ApprovalStep {
  id: string;
  name: string;
  description: string;
  assignee: string;
  role: string;
  status: 'pending' | 'in-progress' | 'approved' | 'rejected' | 'on-hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTime: string;
  actualTime?: string;
  comments?: string;
  requirements: string[];
  completedAt?: string;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'intervention' | 'assessment' | 'treatment-plan' | 'documentation';
  submittedBy: string;
  submittedAt: string;
  currentStep: number;
  status: 'draft' | 'submitted' | 'in-review' | 'approved' | 'rejected' | 'revision-needed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  steps: ApprovalStep[];
  metadata: {
    clientId?: string;
    sessionId?: string;
    interventionType?: string;
    riskLevel?: string;
  };
}

interface ApprovalProcessWorkflowDemoProps {
  workflowData?: unknown;
  onWorkflowUpdate?: (workflow: ApprovalWorkflow) => void;
}

const ApprovalProcessWorkflowDemo: React.FC<ApprovalProcessWorkflowDemoProps> = ({
  // eslint-disable-next-line react/prop-types
  _workflowData,
  onWorkflowUpdate
}) => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize sample workflows
  useEffect(() => {
    const sampleWorkflows: ApprovalWorkflow[] = [
      {
        id: 'workflow-001',
        name: 'CBT Intervention for Anxiety',
        description: 'Cognitive Behavioral Therapy intervention plan for generalized anxiety disorder',
        type: 'intervention',
        submittedBy: 'Dr. Sarah Johnson',
        submittedAt: '2024-01-15T09:30:00Z',
        currentStep: 2,
        status: 'in-review',
        priority: 'high',
        metadata: {
          clientId: 'client-123',
          sessionId: 'session-456',
          interventionType: 'CBT',
          riskLevel: 'moderate'
        },
        steps: [
          {
            id: 'step-1',
            name: 'Initial Review',
            description: 'Basic compliance and completeness check',
            assignee: 'System Validator',
            role: 'Automated System',
            status: 'approved',
            priority: 'medium',
            estimatedTime: '5 minutes',
            actualTime: '3 minutes',
            requirements: ['Complete documentation', 'Required fields filled', 'Format compliance'],
            completedAt: '2024-01-15T09:35:00Z'
          },
          {
            id: 'step-2',
            name: 'Clinical Review',
            description: 'Clinical supervisor review for therapeutic appropriateness',
            assignee: 'Dr. Michael Chen',
            role: 'Clinical Supervisor',
            status: 'in-progress',
            priority: 'high',
            estimatedTime: '30 minutes',
            requirements: ['Evidence-based approach', 'Client appropriateness', 'Safety considerations'],
            comments: 'Reviewing intervention alignment with client presentation'
          },
          {
            id: 'step-3',
            name: 'Ethics Review',
            description: 'Ethical considerations and compliance review',
            assignee: 'Dr. Lisa Rodriguez',
            role: 'Ethics Committee',
            status: 'pending',
            priority: 'medium',
            estimatedTime: '20 minutes',
            requirements: ['Informed consent', 'Boundary considerations', 'Cultural sensitivity']
          },
          {
            id: 'step-4',
            name: 'Final Approval',
            description: 'Final sign-off and implementation authorization',
            assignee: 'Dr. Robert Kim',
            role: 'Department Head',
            status: 'pending',
            priority: 'high',
            estimatedTime: '15 minutes',
            requirements: ['All previous approvals', 'Risk assessment', 'Implementation plan']
          }
        ]
      },
      {
        id: 'workflow-002',
        name: 'Crisis Intervention Protocol',
        description: 'Emergency intervention protocol for suicidal ideation',
        type: 'intervention',
        submittedBy: 'Dr. Emily Davis',
        submittedAt: '2024-01-15T14:20:00Z',
        currentStep: 0,
        status: 'submitted',
        priority: 'urgent',
        metadata: {
          clientId: 'client-789',
          sessionId: 'session-012',
          interventionType: 'Crisis',
          riskLevel: 'high'
        },
        steps: [
          {
            id: 'step-1',
            name: 'Urgent Review',
            description: 'Immediate safety and protocol compliance check',
            assignee: 'Crisis Team Lead',
            role: 'Crisis Specialist',
            status: 'pending',
            priority: 'urgent',
            estimatedTime: '10 minutes',
            requirements: ['Safety assessment', 'Immediate risk factors', 'Protocol adherence']
          },
          {
            id: 'step-2',
            name: 'Supervisor Approval',
            description: 'Clinical supervisor emergency approval',
            assignee: 'Dr. Michael Chen',
            role: 'Clinical Supervisor',
            status: 'pending',
            priority: 'urgent',
            estimatedTime: '15 minutes',
            requirements: ['Risk mitigation', 'Safety plan', 'Follow-up protocol']
          }
        ]
      }
    ];

    setWorkflows(sampleWorkflows);
    setSelectedWorkflow(sampleWorkflows[0].id);
  }, []);

  const getStatusIcon = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'in-progress':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'on-hold':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ApprovalStep['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: ApprovalWorkflow['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
    }
  };

  const processNextStep = async (workflowId: string) => {
    setIsProcessing(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setWorkflows(prev => prev.map(workflow => {
      if (workflow.id === workflowId) {
        const currentStep = workflow.steps[workflow.currentStep];
        if (currentStep && currentStep.status === 'pending') {
          const updatedSteps = [...workflow.steps];
          updatedSteps[workflow.currentStep] = {
            ...currentStep,
            status: 'in-progress'
          };
          
          return {
            ...workflow,
            steps: updatedSteps,
            status: 'in-review' as const
          };
        }
      }
      return workflow;
    }));
    
    setIsProcessing(false);
    
    if (onWorkflowUpdate) {
      const updatedWorkflow = workflows.find(w => w.id === workflowId);
      if (updatedWorkflow) {
        onWorkflowUpdate(updatedWorkflow);
      }
    }
  };

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Approval Process Workflow</h2>
          <p className="text-gray-600 mt-1">
            Clinical validation approval workflow with multi-stage review process
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Submission
          </Button>
          <Button className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Process Queue
          </Button>
        </div>
      </div>

      {/* Workflow Queue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">3</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">2</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-green-600">5</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
                <p className="text-2xl font-bold text-purple-600">2.3h</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Active Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div 
                  key={workflow.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedWorkflow === workflow.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-sm">{workflow.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        by {workflow.submittedBy}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(workflow.priority)}>
                      {workflow.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Step {workflow.currentStep + 1}/{workflow.steps.length}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(workflow.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <Progress 
                    value={(workflow.currentStep / workflow.steps.length) * 100} 
                    className="h-1 mt-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {selectedWorkflowData?.name || 'Select Workflow'}
              </CardTitle>
              {selectedWorkflowData && (
                <Button 
                  onClick={() => processNextStep(selectedWorkflow)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Process Next
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedWorkflowData ? (
              <div className="space-y-6">
                {/* Workflow Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-sm text-gray-700">Type</h5>
                    <p className="text-sm capitalize">{selectedWorkflowData.type.replace('-', ' ')}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-700">Status</h5>
                    <Badge variant="outline" className="text-xs">
                      {selectedWorkflowData.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-700">Risk Level</h5>
                    <p className="text-sm capitalize">{selectedWorkflowData.metadata.riskLevel}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-700">Progress</h5>
                    <p className="text-sm">
                      {selectedWorkflowData.currentStep + 1} of {selectedWorkflowData.steps.length} steps
                    </p>
                  </div>
                </div>

                {/* Workflow Steps */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Approval Steps</h4>
                  {selectedWorkflowData.steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-4">
                      {/* Step Number */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index < selectedWorkflowData.currentStep 
                          ? 'bg-green-500 text-white'
                          : index === selectedWorkflowData.currentStep
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-medium text-sm">{step.name}</h5>
                              <p className="text-xs opacity-80 mt-1">{step.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(step.status)}
                              <Badge variant="outline" className="text-xs">
                                {step.status.replace('-', ' ')}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-medium opacity-90">Assignee:</span>
                              <div className="flex items-center gap-1 mt-1">
                                <User className="w-3 h-3" />
                                <span>{step.assignee}</span>
                              </div>
                              <span className="opacity-75">({step.role})</span>
                            </div>
                            <div>
                              <span className="font-medium opacity-90">Time:</span>
                              <p className="mt-1">
                                Est: {step.estimatedTime}
                                {step.actualTime && (
                                  <span className="block">Actual: {step.actualTime}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {step.requirements.length > 0 && (
                            <div className="mt-3">
                              <span className="font-medium text-xs opacity-90">Requirements:</span>
                              <ul className="mt-1 space-y-1">
                                {step.requirements.map((req, reqIndex) => (
                                  <li key={reqIndex} className="text-xs opacity-75 flex items-start gap-1">
                                    <span className="text-blue-500">•</span>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {step.comments && (
                            <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
                              <span className="font-medium opacity-90">Comments:</span>
                              <p className="mt-1 opacity-75">{step.comments}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      {index < selectedWorkflowData.steps.length - 1 && (
                        <div className="flex-shrink-0 mt-4">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Select a workflow to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow Analytics */}
      {selectedWorkflowData && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="timeline" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600 mt-1" />
                    <div>
                      <div className="font-medium text-sm">Workflow submitted</div>
                      <div className="text-xs text-gray-600">
                        {new Date(selectedWorkflowData.submittedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {selectedWorkflowData.steps
                    .filter(step => step.completedAt)
                    .map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                        <div>
                          <div className="font-medium text-sm">{step.name} completed</div>
                          <div className="text-xs text-gray-600">
                            by {step.assignee} • {step.completedAt && new Date(step.completedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
              
              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Processing Time</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Estimated:</span>
                        <span>
                          {selectedWorkflowData.steps.reduce((sum, step) => {
                            const time = parseInt(step.estimatedTime);
                            return sum + (isNaN(time) ? 0 : time);
                          }, 0)} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span>
                          {selectedWorkflowData.steps
                            .filter(step => step.actualTime)
                            .reduce((sum, step) => {
                              const time = parseInt(step.actualTime || '0');
                              return sum + (isNaN(time) ? 0 : time);
                            }, 0)} min
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Completion Rate</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Steps Completed:</span>
                        <span>
                          {selectedWorkflowData.steps.filter(s => s.status === 'approved').length}/
                          {selectedWorkflowData.steps.length}
                        </span>
                      </div>
                      <Progress 
                        value={(selectedWorkflowData.steps.filter(s => s.status === 'approved').length / selectedWorkflowData.steps.length) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Priority Impact</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Priority Level:</span>
                        <Badge className={getPriorityColor(selectedWorkflowData.priority)}>
                          {selectedWorkflowData.priority}
                        </Badge>
                      </div>
                      <div className="text-xs text-purple-700">
                        {selectedWorkflowData.priority === 'urgent' 
                          ? 'Fast-tracked processing'
                          : 'Standard processing time'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Workflow history and audit trail would be displayed here, including:</p>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>• All status changes and timestamps</li>
                    <li>• Reviewer comments and feedback</li>
                    <li>• System notifications and alerts</li>
                    <li>• Document versions and revisions</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApprovalProcessWorkflowDemo;
