import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Star,
  Award,
  FileText,
  Search,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';

interface EvidenceSource {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  type: 'rct' | 'meta-analysis' | 'systematic-review' | 'clinical-trial' | 'guideline';
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  relevanceScore: number;
  summary: string;
  url?: string;
}

interface BestPractice {
  id: string;
  name: string;
  category: 'assessment' | 'intervention' | 'treatment-planning' | 'documentation' | 'ethics';
  description: string;
  organization: string;
  lastUpdated: string;
  complianceLevel: 'full' | 'partial' | 'non-compliant';
  requirements: string[];
  recommendations: string[];
}

interface InterventionVerification {
  interventionId: string;
  interventionName: string;
  targetCondition: string;
  evidenceScore: number;
  practiceAlignment: number;
  supportingEvidence: EvidenceSource[];
  alignedPractices: BestPractice[];
  gaps: string[];
  recommendations: string[];
  status: 'verified' | 'needs-review' | 'not-supported';
}

interface EvidenceBasedVerificationDemoProps {
  interventionData?: unknown;
  onVerificationComplete?: (results: InterventionVerification[]) => void;
}

const EvidenceBasedVerificationDemo: React.FC<EvidenceBasedVerificationDemoProps> = ({
  // eslint-disable-next-line react/prop-types
  _interventionData,
  onVerificationComplete
}) => {
  const [verifications, setVerifications] = useState<InterventionVerification[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [selectedVerification, setSelectedVerification] = useState<string>('');

  // Initialize sample data
  useEffect(() => {
    const sampleEvidenceSources: EvidenceSource[] = [
      {
        id: 'cbt-depression-meta',
        title: 'Cognitive Behavioral Therapy for Depression: A Meta-Analysis',
        authors: ['Butler, A.C.', 'Chapman, J.E.', 'Forman, E.M.', 'Beck, A.T.'],
        journal: 'Clinical Psychology Review',
        year: 2006,
        type: 'meta-analysis',
        evidenceLevel: 'A',
        relevanceScore: 95,
        summary: 'Large effect sizes for CBT in treating depression across multiple studies.',
        url: 'https://doi.org/10.1016/j.cpr.2005.07.003'
      },
      {
        id: 'exposure-therapy-anxiety',
        title: 'Exposure Therapy for Anxiety Disorders: A Systematic Review',
        authors: ['Wolitzky-Taylor, K.B.', 'Horowitz, J.D.', 'Powers, M.B.', 'Telch, M.J.'],
        journal: 'Clinical Psychology Review',
        year: 2008,
        type: 'systematic-review',
        evidenceLevel: 'A',
        relevanceScore: 92,
        summary: 'Strong evidence for exposure therapy effectiveness across anxiety disorders.',
        url: 'https://doi.org/10.1016/j.cpr.2008.05.003'
      },
      {
        id: 'mindfulness-ptsd-rct',
        title: 'Mindfulness-Based Stress Reduction for PTSD: A Randomized Controlled Trial',
        authors: ['Kearney, D.J.', 'McDermott, K.', 'Malte, C.', 'Martinez, M.'],
        journal: 'Journal of Clinical Psychology',
        year: 2012,
        type: 'rct',
        evidenceLevel: 'B',
        relevanceScore: 78,
        summary: 'Moderate evidence for MBSR reducing PTSD symptoms.',
        url: 'https://doi.org/10.1002/jclp.21845'
      }
    ];

    const sampleBestPractices: BestPractice[] = [
      {
        id: 'apa-depression-guidelines',
        name: 'APA Clinical Practice Guideline for Depression',
        category: 'treatment-planning',
        description: 'Evidence-based recommendations for treating major depressive disorder',
        organization: 'American Psychological Association',
        lastUpdated: '2019-02-01',
        complianceLevel: 'full',
        requirements: [
          'Use validated assessment tools',
          'Implement evidence-based interventions',
          'Monitor treatment progress',
          'Consider cultural factors'
        ],
        recommendations: [
          'CBT as first-line treatment',
          'Regular outcome measurement',
          'Collaborative treatment planning'
        ]
      },
      {
        id: 'nice-anxiety-guidelines',
        name: 'NICE Guidelines for Anxiety Disorders',
        category: 'intervention',
        description: 'UK National Institute guidelines for anxiety treatment',
        organization: 'National Institute for Health and Care Excellence',
        lastUpdated: '2020-05-15',
        complianceLevel: 'partial',
        requirements: [
          'Stepped care approach',
          'Patient preference consideration',
          'Regular review sessions'
        ],
        recommendations: [
          'Exposure therapy for specific phobias',
          'CBT for generalized anxiety',
          'Mindfulness as adjunct treatment'
        ]
      }
    ];

    const sampleVerifications: InterventionVerification[] = [
      {
        interventionId: 'cbt-depression',
        interventionName: 'Cognitive Behavioral Therapy for Depression',
        targetCondition: 'Major Depressive Disorder',
        evidenceScore: 95,
        practiceAlignment: 92,
        supportingEvidence: [sampleEvidenceSources[0]],
        alignedPractices: [sampleBestPractices[0]],
        gaps: [],
        recommendations: [
          'Continue with current approach',
          'Consider adding behavioral activation components'
        ],
        status: 'verified'
      },
      {
        interventionId: 'exposure-anxiety',
        interventionName: 'Exposure Therapy for Social Anxiety',
        targetCondition: 'Social Anxiety Disorder',
        evidenceScore: 88,
        practiceAlignment: 85,
        supportingEvidence: [sampleEvidenceSources[1]],
        alignedPractices: [sampleBestPractices[1]],
        gaps: [
          'Missing systematic desensitization component',
          'Limited cultural adaptation'
        ],
        recommendations: [
          'Add gradual exposure hierarchy',
          'Include cultural considerations',
          'Implement progress monitoring'
        ],
        status: 'needs-review'
      },
      {
        interventionId: 'mindfulness-ptsd',
        interventionName: 'Mindfulness-Based Intervention for PTSD',
        targetCondition: 'Post-Traumatic Stress Disorder',
        evidenceScore: 72,
        practiceAlignment: 68,
        supportingEvidence: [sampleEvidenceSources[2]],
        alignedPractices: [],
        gaps: [
          'Limited evidence for PTSD specifically',
          'No trauma-informed modifications',
          'Missing safety protocols'
        ],
        recommendations: [
          'Consider trauma-focused CBT instead',
          'Add trauma-informed modifications if continuing',
          'Implement safety monitoring protocols'
        ],
        status: 'needs-review'
      }
    ];

    setVerifications(sampleVerifications);
  }, []);

  const runVerification = async () => {
    setIsVerifying(true);
    setVerificationProgress(0);

    // Simulate verification process
    const steps = [
      'Searching evidence databases...',
      'Analyzing research quality...',
      'Checking practice guidelines...',
      'Calculating alignment scores...',
      'Generating recommendations...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setVerificationProgress((i + 1) / steps.length * 100);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Update verification results
    const updatedVerifications = verifications.map(v => ({
      ...v,
      evidenceScore: Math.min(100, v.evidenceScore + Math.random() * 10 - 5),
      practiceAlignment: Math.min(100, v.practiceAlignment + Math.random() * 10 - 5)
    }));

    setVerifications(updatedVerifications);
    setIsVerifying(false);

    if (onVerificationComplete) {
      onVerificationComplete(updatedVerifications);
    }
  };

  const getStatusIcon = (status: InterventionVerification['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-review':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'not-supported':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: InterventionVerification['status']) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'needs-review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'not-supported':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getEvidenceLevelColor = (level: EvidenceSource['evidenceLevel']) => {
    switch (level) {
      case 'A':
        return 'bg-green-500 text-white';
      case 'B':
        return 'bg-blue-500 text-white';
      case 'C':
        return 'bg-yellow-500 text-white';
      case 'D':
        return 'bg-gray-500 text-white';
    }
  };

  const getComplianceColor = (level: BestPractice['complianceLevel']) => {
    switch (level) {
      case 'full':
        return 'bg-green-500 text-white';
      case 'partial':
        return 'bg-yellow-500 text-white';
      case 'non-compliant':
        return 'bg-red-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Evidence-Based Verification</h2>
          <p className="text-gray-600 mt-1">
            Automated verification of interventions against research evidence and clinical practice guidelines
          </p>
        </div>
        <Button 
          onClick={runVerification} 
          disabled={isVerifying}
          className="flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          {isVerifying ? 'Verifying...' : 'Run Verification'}
        </Button>
      </div>

      {/* Verification Progress */}
      {isVerifying && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Evidence Verification in Progress</span>
              <span className="text-sm text-gray-500">{Math.round(verificationProgress)}%</span>
            </div>
            <Progress value={verificationProgress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              Searching databases and analyzing evidence quality...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Verification Results Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Interventions</p>
                <p className="text-2xl font-bold text-green-600">
                  {verifications.filter(v => v.status === 'verified').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Need Review</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {verifications.filter(v => v.status === 'needs-review').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Evidence Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(verifications.reduce((sum, v) => sum + v.evidenceScore, 0) / verifications.length)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intervention Verifications */}
      <div className="space-y-4">
        {verifications.map((verification) => (
          <Card key={verification.interventionId} className={`border-2 ${getStatusColor(verification.status)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(verification.status)}
                  <div>
                    <CardTitle className="text-lg">{verification.interventionName}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Target: {verification.targetCondition}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Evidence: {verification.evidenceScore}%
                  </Badge>
                  <Badge variant="outline">
                    Alignment: {verification.practiceAlignment}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Evidence Score */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Evidence Quality
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Research Support</span>
                      <span>{verification.evidenceScore}%</span>
                    </div>
                    <Progress value={verification.evidenceScore} className="h-2" />
                    <div className="text-xs text-gray-600">
                      Based on {verification.supportingEvidence.length} high-quality studies
                    </div>
                  </div>
                </div>

                {/* Practice Alignment */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Practice Alignment
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Guideline Compliance</span>
                      <span>{verification.practiceAlignment}%</span>
                    </div>
                    <Progress value={verification.practiceAlignment} className="h-2" />
                    <div className="text-xs text-gray-600">
                      Aligned with {verification.alignedPractices.length} practice guidelines
                    </div>
                  </div>
                </div>
              </div>

              {/* Gaps and Recommendations */}
              {verification.gaps.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="font-medium text-sm text-yellow-800 mb-2">Identified Gaps:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {verification.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-500">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {verification.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-sm text-blue-800 mb-2">Recommendations:</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {verification.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedVerification(verification.interventionId)}
                >
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Evidence View */}
      {selectedVerification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Evidence Details: {verifications.find(v => v.interventionId === selectedVerification)?.interventionName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="evidence" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="evidence">Supporting Evidence</TabsTrigger>
                <TabsTrigger value="guidelines">Practice Guidelines</TabsTrigger>
                <TabsTrigger value="analysis">Quality Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="evidence" className="space-y-4">
                {verifications.find(v => v.interventionId === selectedVerification)?.supportingEvidence.map((evidence) => (
                  <div key={evidence.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-sm">{evidence.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {evidence.authors.join(', ')} ({evidence.year})
                        </p>
                        <p className="text-xs text-gray-600">{evidence.journal}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEvidenceLevelColor(evidence.evidenceLevel)}>
                          Level {evidence.evidenceLevel}
                        </Badge>
                        <Badge variant="outline">
                          {evidence.relevanceScore}% relevant
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{evidence.summary}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {evidence.type.replace('-', ' ').toUpperCase()}
                      </Badge>
                      {evidence.url && (
                        <Button variant="link" size="sm" className="text-xs p-0 h-auto">
                          View Study
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="guidelines" className="space-y-4">
                {verifications.find(v => v.interventionId === selectedVerification)?.alignedPractices.map((practice) => (
                  <div key={practice.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-sm">{practice.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{practice.organization}</p>
                        <p className="text-xs text-gray-600">Last updated: {practice.lastUpdated}</p>
                      </div>
                      <Badge className={getComplianceColor(practice.complianceLevel)}>
                        {practice.complianceLevel.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{practice.description}</p>
                    
                    <div className="space-y-2">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Requirements:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {practice.requirements.map((req, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-blue-500">•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Recommendations:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {practice.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-green-500">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="analysis" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Evidence Quality Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Study Quality:</span>
                        <span>High</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sample Size:</span>
                        <span>Large (n&gt;1000)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Effect Size:</span>
                        <span>Large (d=0.8)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Practice Alignment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Guidelines Met:</span>
                        <span>8/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Best Practices:</span>
                        <span>Fully Aligned</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cultural Adaptation:</span>
                        <span>Partial</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Summary Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Verification Summary Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {verifications.length}
              </div>
              <div className="text-sm text-gray-600">Total Interventions</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {verifications.reduce((sum, v) => sum + v.supportingEvidence.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Evidence Sources</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {verifications.reduce((sum, v) => sum + v.alignedPractices.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Practice Guidelines</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((verifications.filter(v => v.status === 'verified').length / verifications.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Verification Rate</div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Export Full Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Share with Team
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Schedule Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvidenceBasedVerificationDemo;
