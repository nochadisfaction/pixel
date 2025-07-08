import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle, FileText, Brain, Shield, Zap } from 'lucide-react';

interface ValidationResult {
  category: string;
  score: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  issues: string[];
  suggestions: string[];
}

interface ValidationDemoProps {
  onValidationComplete?: (results: ValidationResult[]) => void;
}

const ValidationDemo: React.FC<ValidationDemoProps> = ({ onValidationComplete }) => {
  const [content, setContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const validationCategories = [
    {
      id: 'content-quality',
      name: 'Content Quality',
      icon: <FileText className="w-5 h-5" />,
      description: 'Grammar, spelling, and readability assessment',
      rules: [
        'Grammar and spelling accuracy',
        'Professional terminology usage',
        'Sentence structure and clarity',
        'Appropriate content length'
      ]
    },
    {
      id: 'clinical-accuracy',
      name: 'Clinical Accuracy',
      icon: <Brain className="w-5 h-5" />,
      description: 'Psychological and clinical content validation',
      rules: [
        'Clinical terminology correctness',
        'Diagnostic criteria alignment',
        'Evidence-based practices',
        'Therapeutic approach validity'
      ]
    },
    {
      id: 'ethical-compliance',
      name: 'Ethical Compliance',
      icon: <Shield className="w-5 h-5" />,
      description: 'Privacy and ethical standards verification',
      rules: [
        'Privacy protection (no PII)',
        'Respectful language usage',
        'Cultural sensitivity',
        'Professional boundaries'
      ]
    },
    {
      id: 'format-validation',
      name: 'Format Validation',
      icon: <Zap className="w-5 h-5" />,
      description: 'Structure and formatting compliance',
      rules: [
        'Consistent formatting',
        'Proper structure organization',
        'Required field completion',
        'Training data compatibility'
      ]
    }
  ];

  useEffect(() => {
    setWordCount(content.trim().split(/\s+/).filter(word => word.length > 0).length);
    setCharCount(content.length);
  }, [content]);

  useEffect(() => {
    if (content.trim().length > 10) {
      const timeoutId = setTimeout(() => {
        validateContent();
      }, 1000);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
      setOverallScore(0);
    }
  }, [content]);

  const validateContent = async () => {
    if (!content.trim()) return;

    setIsValidating(true);

    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 1500));

    const validationResults: ValidationResult[] = [
      {
        category: 'Content Quality',
        score: calculateContentQualityScore(content),
        status: getScoreStatus(calculateContentQualityScore(content)),
        issues: getContentQualityIssues(content),
        suggestions: getContentQualitySuggestions(content)
      },
      {
        category: 'Clinical Accuracy',
        score: calculateClinicalAccuracyScore(content),
        status: getScoreStatus(calculateClinicalAccuracyScore(content)),
        issues: getClinicalAccuracyIssues(content),
        suggestions: getClinicalAccuracySuggestions(content)
      },
      {
        category: 'Ethical Compliance',
        score: calculateEthicalComplianceScore(content),
        status: getScoreStatus(calculateEthicalComplianceScore(content)),
        issues: getEthicalComplianceIssues(content),
        suggestions: getEthicalComplianceSuggestions(content)
      },
      {
        category: 'Format Validation',
        score: calculateFormatValidationScore(content),
        status: getScoreStatus(calculateFormatValidationScore(content)),
        issues: getFormatValidationIssues(content),
        suggestions: getFormatValidationSuggestions(content)
      }
    ];

    const overall = Math.round(
      validationResults.reduce((sum, result) => sum + result.score, 0) / validationResults.length
    );

    setResults(validationResults);
    setOverallScore(overall);
    setIsValidating(false);

    if (onValidationComplete) {
      onValidationComplete(validationResults);
    }
  };

  const calculateContentQualityScore = (text: string): number => {
    let score = 85;
    
    // Check for common issues
    if (text.length < 50) score -= 20;
    if (!/[.!?]$/.test(text.trim())) score -= 10;
    if ((text.match(/\b(very|really|quite|pretty)\b/gi) || []).length > 2) score -= 5;
    if (text.includes('  ')) score -= 5; // Double spaces
    
    // Positive indicators
    if (text.length > 100 && text.length < 500) score += 5;
    if ((text.match(/\b(therapeutic|clinical|assessment|intervention)\b/gi) || []).length > 0) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateClinicalAccuracyScore = (text: string): number => {
    let score = 80;
    
    const clinicalTerms = ['therapy', 'therapeutic', 'clinical', 'assessment', 'diagnosis', 'treatment', 'intervention', 'CBT', 'psychodynamic'];
    const foundTerms = clinicalTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    score += foundTerms * 3;
    
    // Check for inappropriate language
    const inappropriateTerms = ['crazy', 'insane', 'nuts', 'psycho'];
    const inappropriateFound = inappropriateTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    score -= inappropriateFound * 15;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateEthicalComplianceScore = (text: string): number => {
    let score = 90;
    
    // Check for potential PII
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(text)) score -= 20; // Potential names
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) score -= 30; // SSN pattern
    if (/\b\d{3} [A-Za-z]+ (St|Ave|Rd|Dr)\b/.test(text)) score -= 25; // Address pattern
    
    // Check for respectful language
    const respectfulIndicators = ['client', 'patient', 'individual', 'person'];
    const foundRespectful = respectfulIndicators.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    if (foundRespectful > 0) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const calculateFormatValidationScore = (text: string): number => {
    let score = 75;
    
    // Check structure
    if (text.includes('\n')) score += 10; // Has paragraphs
    if (text.match(/^\s*-|\*|\d+\./m)) score += 10; // Has lists
    if (text.length > 200) score += 10; // Adequate length
    
    return Math.max(0, Math.min(100, score));
  };

  const getScoreStatus = (score: number): 'excellent' | 'good' | 'needs-improvement' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'needs-improvement';
    return 'poor';
  };

  const getContentQualityIssues = (text: string): string[] => {
    const issues = [];
    if (text.length < 50) issues.push('Content too short for meaningful analysis');
    if (!/[.!?]$/.test(text.trim())) issues.push('Missing proper sentence ending');
    if (text.includes('  ')) issues.push('Contains double spaces');
    return issues;
  };

  const getContentQualitySuggestions = (_text: string): string[] => {
    const suggestions = [];
    if (text.length < 100) suggestions.push('Consider expanding content for better analysis');
    suggestions.push('Use professional terminology where appropriate');
    suggestions.push('Ensure proper grammar and punctuation');
    return suggestions;
  };

  const getClinicalAccuracyIssues = (text: string): string[] => {
    const issues = [];
    const inappropriateTerms = ['crazy', 'insane', 'nuts', 'psycho'];
    const found = inappropriateTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );
    if (found.length > 0) {
      issues.push(`Inappropriate terminology found: ${found.join(', ')}`);
    }
    return issues;
  };

  const getClinicalAccuracySuggestions = (_text: string): string[] => {
    return [
      'Use evidence-based clinical terminology',
      'Reference established therapeutic approaches',
      'Ensure diagnostic accuracy where applicable'
    ];
  };

  const getEthicalComplianceIssues = (text: string): string[] => {
    const issues = [];
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(text)) {
      issues.push('Potential personal names detected');
    }
    return issues;
  };

  const getEthicalComplianceSuggestions = (_text: string): string[] => {
    return [
      'Remove any personally identifiable information',
      'Use respectful, person-first language',
      'Maintain professional boundaries in content'
    ];
  };

  const getFormatValidationIssues = (text: string): string[] => {
    const issues = [];
    if (text.length < 100) issues.push('Content may be too brief for training purposes');
    return issues;
  };

  const getFormatValidationSuggestions = (_text: string): string[] => {
    return [
      'Structure content with clear paragraphs',
      'Use consistent formatting throughout',
      'Include relevant clinical details'
    ];
  };

  const clearContent = () => {
    setContent('');
    setResults([]);
    setOverallScore(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs-improvement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6" data-testid="validation-section">
      {/* Validation Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Content Validation</CardTitle>
          <p className="text-sm text-gray-600">
            Advanced validation pipeline with psychology-specific checks
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {validationCategories.map((category) => (
              <div key={category.id} className="p-4 border rounded-lg" data-testid="validation-card">
                <div className="flex items-center gap-3 mb-3">
                  {category.icon}
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {category.rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Content Input</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
                <Button variant="outline" size="sm" onClick={clearContent}>
                  Clear
                </Button>
              </div>
            </div>
            
            <Textarea
              placeholder="Enter psychology content for validation (e.g., case studies, therapeutic notes, training scenarios)..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {content.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isValidating ? (
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {content.trim().length <= 10 ? (
              <p className="text-gray-500 text-center py-8">
                Enter content to see validation results
              </p>
            ) : isValidating ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Validating content...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="text-4xl font-bold text-blue-600 mb-2" data-testid="overall-score">
                    {overallScore}
                  </div>
                  <div className="text-lg font-medium text-gray-700">Overall Score</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {overallScore >= 90 ? 'Excellent' :
                     overallScore >= 75 ? 'Good' :
                     overallScore >= 60 ? 'Needs Improvement' : 'Poor'}
                  </div>
                </div>

                {/* Category Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{result.category}</h4>
                        <Badge className={getStatusColor(result.status)}>
                          {result.score}%
                        </Badge>
                      </div>
                      
                      <Progress value={result.score} className="mb-3" />
                      
                      {result.issues.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-red-700 mb-1">Issues Found</h5>
                          <ul className="text-sm text-red-600 space-y-1">
                            {result.issues.map((issue, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div>
                        <h5 className="text-sm font-medium text-blue-700 mb-1">Suggestions</h5>
                        <ul className="text-sm text-blue-600 space-y-1">
                          {result.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-blue-500 mt-0.5">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detailed Breakdown */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Detailed Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Word Count:</span>
                      <div className="font-medium">{wordCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Character Count:</span>
                      <div className="font-medium">{charCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Issues Found:</span>
                      <div className="font-medium text-red-600">
                        {results.reduce((sum, r) => sum + r.issues.length, 0)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="font-medium text-green-600">
                        {overallScore >= 75 ? 'Approved' : 'Needs Review'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidationDemo;
