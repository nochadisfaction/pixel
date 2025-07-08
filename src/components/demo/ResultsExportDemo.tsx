import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  FileText, 
  Database,
  Code,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
  Share2
} from 'lucide-react';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  fileExtension: string;
  mimeType: string;
  icon: React.ReactNode;
  size: string;
  features: string[];
  useCase: string;
}

interface ExportJob {
  id: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  completedTime?: Date;
  downloadUrl?: string;
  fileSize?: string;
  error?: string;
  stages: ExportStage[];
  currentStage?: string;
  estimatedTimeRemaining?: number;
  bytesProcessed?: number;
  totalBytes?: number;
}

interface ExportStage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  completedTime?: Date;
  duration?: number;
}

interface QualityReport {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  generatedAt: Date;
  fileSize: string;
  format: 'pdf' | 'html' | 'docx';
}

interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'chart' | 'table' | 'analysis';
  data: unknown;
  insights: string[];
}

interface BalanceReport {
  categoryBalance: {
    target: number;
    actual: number;
    deviation: number;
    status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  }[];
  overallBalance: {
    score: number;
    grade: string;
    recommendations: string[];
  };
  qualityMetrics: {
    validationScore: number;
    consistencyScore: number;
    completenessScore: number;
    accuracyScore: number;
  };
}

interface PipelineData {
  totalItems: number;
  categories: {
    id: string;
    name: string;
    count: number;
    percentage: number;
  }[];
  qualityMetrics: {
    overallScore: number;
    validationScore: number;
    balanceScore: number;
  };
  processingStats: {
    totalProcessingTime: number;
    averageItemTime: number;
    successRate: number;
  };
}

interface APIIntegration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastSync: Date | null;
  dataFormat: string;
  authentication: 'api-key' | 'oauth' | 'basic' | 'none';
  features: string[];
}

interface ResultsExportDemoProps {
  pipelineData?: PipelineData;
  onExportComplete?: (job: ExportJob) => void;
}

const ResultsExportDemo: React.FC<ResultsExportDemoProps> = ({
  pipelineData,
  onExportComplete
}) => {
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [balanceReport, setBalanceReport] = useState<BalanceReport | null>(null);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);
  const [apiIntegrations, setApiIntegrations] = useState<APIIntegration[]>([]);
  const [isTestingConnections, setIsTestingConnections] = useState(false);

  // Initialize export formats
  useEffect(() => {
    const formats: ExportFormat[] = [
      {
        id: 'json',
        name: 'JSON Dataset',
        description: 'Structured JSON format with complete metadata',
        fileExtension: 'json',
        mimeType: 'application/json',
        icon: <Code className="w-5 h-5" />,
        size: '~2.5 MB',
        features: [
          'Complete dataset structure',
          'Nested category hierarchies',
          'Metadata preservation',
          'Human-readable format'
        ],
        useCase: 'API integration, web applications, data analysis'
      },
      {
        id: 'csv',
        name: 'CSV Spreadsheet',
        description: 'Comma-separated values for spreadsheet applications',
        fileExtension: 'csv',
        mimeType: 'text/csv',
        icon: <FileText className="w-5 h-5" />,
        size: '~1.8 MB',
        features: [
          'Spreadsheet compatibility',
          'Flat data structure',
          'Easy data manipulation',
          'Universal format support'
        ],
        useCase: 'Excel analysis, data visualization, reporting'
      },
      {
        id: 'training-ready',
        name: 'Training-Ready Dataset',
        description: 'Optimized format for machine learning training',
        fileExtension: 'jsonl',
        mimeType: 'application/jsonlines',
        icon: <Database className="w-5 h-5" />,
        size: '~3.2 MB',
        features: [
          'ML-optimized structure',
          'Balanced sampling',
          'Feature engineering',
          'Train/validation splits'
        ],
        useCase: 'Machine learning, model training, AI development'
      },
      {
        id: 'parquet',
        name: 'Parquet Format',
        description: 'Columnar storage format for big data analytics',
        fileExtension: 'parquet',
        mimeType: 'application/octet-stream',
        icon: <BarChart3 className="w-5 h-5" />,
        size: '~1.2 MB',
        features: [
          'Columnar compression',
          'Schema evolution',
          'Fast query performance',
          'Big data compatibility'
        ],
        useCase: 'Data warehousing, analytics, Spark/Hadoop processing'
      },
      {
        id: 'xml',
        name: 'XML Document',
        description: 'Structured XML format with schema validation',
        fileExtension: 'xml',
        mimeType: 'application/xml',
        icon: <FileText className="w-5 h-5" />,
        size: '~4.1 MB',
        features: [
          'Schema validation',
          'Hierarchical structure',
          'Namespace support',
          'Enterprise compatibility'
        ],
        useCase: 'Enterprise systems, data interchange, legacy integration'
      },
      {
        id: 'yaml',
        name: 'YAML Configuration',
        description: 'Human-readable configuration format',
        fileExtension: 'yaml',
        mimeType: 'application/x-yaml',
        icon: <Settings className="w-5 h-5" />,
        size: '~2.1 MB',
        features: [
          'Human-readable syntax',
          'Configuration management',
          'Comment support',
          'Multi-document format'
        ],
        useCase: 'Configuration files, DevOps, documentation'
      }
    ];

    setExportFormats(formats);
  }, []);

  // Initialize sample pipeline data if not provided
  useEffect(() => {
    if (!pipelineData) {
      // Use sample data for demo
    }

    // Initialize API integrations
    const integrations: APIIntegration[] = [
      {
        id: 'huggingface-hub',
        name: 'Hugging Face Hub',
        description: 'Upload datasets directly to Hugging Face for model training',
        endpoint: 'https://huggingface.co/api/datasets',
        method: 'POST',
        status: 'connected',
        lastSync: new Date(Date.now() - 3600000), // 1 hour ago
        dataFormat: 'JSON/Parquet',
        authentication: 'api-key',
        features: [
          'Automatic dataset versioning',
          'Model card generation',
          'Community sharing',
          'Integration with Transformers'
        ]
      },
      {
        id: 'mlflow-tracking',
        name: 'MLflow Tracking',
        description: 'Track experiments and model performance metrics',
        endpoint: 'http://mlflow.company.com/api/2.0/mlflow',
        method: 'POST',
        status: 'connected',
        lastSync: new Date(Date.now() - 1800000), // 30 minutes ago
        dataFormat: 'JSON',
        authentication: 'basic',
        features: [
          'Experiment tracking',
          'Model registry',
          'Performance metrics',
          'Artifact storage'
        ]
      },
      {
        id: 'wandb-integration',
        name: 'Weights & Biases',
        description: 'Monitor training runs and visualize model performance',
        endpoint: 'https://api.wandb.ai/graphql',
        method: 'POST',
        status: 'testing',
        lastSync: null,
        dataFormat: 'JSON',
        authentication: 'api-key',
        features: [
          'Real-time monitoring',
          'Hyperparameter tuning',
          'Model comparison',
          'Team collaboration'
        ]
      },
      {
        id: 'azure-ml',
        name: 'Azure Machine Learning',
        description: 'Deploy to Azure ML workspace for enterprise training',
        endpoint: 'https://ml.azure.com/api/workspaces',
        method: 'PUT',
        status: 'disconnected',
        lastSync: null,
        dataFormat: 'Parquet/CSV',
        authentication: 'oauth',
        features: [
          'Scalable compute',
          'AutoML capabilities',
          'Model deployment',
          'Enterprise security'
        ]
      },
      {
        id: 'custom-pipeline',
        name: 'Custom Training Pipeline',
        description: 'Internal training infrastructure with custom workflows',
        endpoint: 'https://api.internal.com/v1/training',
        method: 'POST',
        status: 'error',
        lastSync: new Date(Date.now() - 86400000), // 1 day ago
        dataFormat: 'JSON/JSONL',
        authentication: 'api-key',
        features: [
          'Custom model architectures',
          'Distributed training',
          'A/B testing framework',
          'Production deployment'
        ]
      }
    ];

    setApiIntegrations(integrations);
  }, [pipelineData]);

  const toggleFormatSelection = (formatId: string) => {
    setSelectedFormats(prev => 
      prev.includes(formatId) 
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const startExport = async (formatIds: string[]) => {
    setIsExporting(true);

    for (const formatId of formatIds) {
      const format = exportFormats.find(f => f.id === formatId);
      if (!format) continue;

      const job: ExportJob = {
        id: `export-${Date.now()}-${formatId}`,
        format: formatId,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
        stages: [
          { name: 'Data Validation', status: 'pending', progress: 0 },
          { name: 'Data Processing', status: 'pending', progress: 0 },
          { name: 'Format Conversion', status: 'pending', progress: 0 },
          { name: 'Quality Check', status: 'pending', progress: 0 },
          { name: 'File Generation', status: 'pending', progress: 0 }
        ]
      };

      setExportJobs(prev => [...prev, job]);

      // Simulate export process
      await simulateExport(job);
    }

    setIsExporting(false);
  };

  const simulateExport = async (job: ExportJob) => {
    const stages: ExportStage[] = [
      {
        id: 'validation',
        name: 'Data Validation',
        description: 'Validating data integrity and format compliance',
        status: 'pending',
        progress: 0
      },
      {
        id: 'processing',
        name: 'Data Processing',
        description: 'Transforming data to target format',
        status: 'pending',
        progress: 0
      },
      {
        id: 'compression',
        name: 'Compression',
        description: 'Optimizing file size and structure',
        status: 'pending',
        progress: 0
      },
      {
        id: 'upload',
        name: 'Upload',
        description: 'Transferring file to storage',
        status: 'pending',
        progress: 0
      },
      {
        id: 'finalization',
        name: 'Finalization',
        description: 'Generating download links and metadata',
        status: 'pending',
        progress: 0
      }
    ];

    // Initialize job with stages
    const initialJob = {
      ...job,
      status: 'processing' as const,
      stages,
      currentStage: 'validation',
      totalBytes: 2500000, // 2.5MB
      bytesProcessed: 0
    };

    setExportJobs(prev => prev.map(j => 
      j.id === job.id ? initialJob : j
    ));

    // Process each stage
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex++) {
      const stage = stages[stageIndex];
      const stageStartTime = new Date();
      
      // Update current stage
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          currentStage: stage.id,
          stages: j.stages?.map((s, idx) => 
            idx === stageIndex 
              ? { ...s, status: 'processing', startTime: stageStartTime }
              : s
          ) || []
        } : j
      ));

      // Simulate stage progress
      const stageSteps = 10;
      for (let step = 0; step <= stageSteps; step++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const stageProgress = (step / stageSteps) * 100;
        const overallProgress = ((stageIndex * 100) + stageProgress) / stages.length;
        const bytesProcessed = Math.round((overallProgress / 100) * 2500000);
        const timeElapsed = Date.now() - job.startTime.getTime();
        const estimatedTotal = timeElapsed / (overallProgress / 100);
        const estimatedRemaining = Math.max(0, estimatedTotal - timeElapsed);

        setExportJobs(prev => prev.map(j => 
          j.id === job.id ? { 
            ...j, 
            progress: Math.round(overallProgress),
            bytesProcessed,
            estimatedTimeRemaining: Math.round(estimatedRemaining / 1000), // in seconds
            stages: j.stages?.map((s, idx) => 
              idx === stageIndex 
                ? { ...s, progress: Math.round(stageProgress) }
                : s
            ) || []
          } : j
        ));
      }

      // Complete current stage
      const stageEndTime = new Date();
      const stageDuration = stageEndTime.getTime() - stageStartTime.getTime();
      
      setExportJobs(prev => prev.map(j => 
        j.id === job.id ? { 
          ...j, 
          stages: j.stages?.map((s, idx) => 
            idx === stageIndex 
              ? { 
                  ...s, 
                  status: 'completed', 
                  progress: 100,
                  completedTime: stageEndTime,
                  duration: stageDuration
                }
              : s
          ) || []
        } : j
      ));
    }

    // Complete the job
    const completedJob: ExportJob = {
      ...initialJob,
      status: 'completed',
      progress: 100,
      completedTime: new Date(),
      downloadUrl: `/api/exports/${job.id}/download`,
      fileSize: exportFormats.find(f => f.id === job.format)?.size || '~2 MB',
      currentStage: undefined,
      estimatedTimeRemaining: 0,
      bytesProcessed: 2500000
    };

    setExportJobs(prev => prev.map(j => 
      j.id === job.id ? completedJob : j
    ));

    if (onExportComplete) {
      onExportComplete(completedJob);
    }
  };

  const downloadFile = (job: ExportJob) => {
    // Simulate file download
    const format = exportFormats.find(f => f.id === job.format);
    if (format) {
      const blob = new Blob(['Sample export data'], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `psychology-pipeline-export.${format.fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const copyDownloadLink = (job: ExportJob) => {
    if (job.downloadUrl) {
      navigator.clipboard.writeText(`${window.location.origin}${job.downloadUrl}`);
    }
  };

  const generateQualityReports = async () => {
    setIsGeneratingReports(true);

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const reports: QualityReport[] = [
      {
        id: 'executive-summary',
        name: 'Executive Summary Report',
        description: 'High-level overview of pipeline performance and quality metrics',
        format: 'pdf',
        fileSize: '2.3 MB',
        generatedAt: new Date(),
        sections: [
          {
            id: 'overview',
            title: 'Pipeline Overview',
            type: 'summary',
            data: {
              totalItems: 1000,
              categories: 5,
              processingTime: '2.5 hours',
              successRate: '98.5%'
            },
            insights: [
              'Processing completed successfully with high success rate',
              'All categories met minimum quality thresholds',
              'Balance targets achieved within acceptable ranges'
            ]
          },
          {
            id: 'quality-metrics',
            title: 'Quality Metrics',
            type: 'chart',
            data: {
              validation: 92,
              consistency: 89,
              completeness: 95,
              accuracy: 91
            },
            insights: [
              'Validation scores exceed industry benchmarks',
              'Consistency improved by 12% from previous run',
              'Completeness remains at excellent levels'
            ]
          }
        ]
      },
      {
        id: 'detailed-analysis',
        name: 'Detailed Quality Analysis',
        description: 'In-depth analysis of quality metrics and validation results',
        format: 'html',
        fileSize: '5.7 MB',
        generatedAt: new Date(),
        sections: [
          {
            id: 'category-breakdown',
            title: 'Category-by-Category Analysis',
            type: 'table',
            data: [
              { category: 'Anxiety Disorders', quality: 94, balance: 98, items: 300 },
              { category: 'Mood Disorders', quality: 91, balance: 95, items: 250 },
              { category: 'Trauma & PTSD', quality: 89, balance: 92, items: 200 },
              { category: 'Personality Disorders', quality: 87, balance: 89, items: 150 },
              { category: 'Substance Use', quality: 93, balance: 96, items: 100 }
            ],
            insights: [
              'Anxiety Disorders category shows highest quality scores',
              'Personality Disorders may need additional validation',
              'All categories within acceptable balance ranges'
            ]
          }
        ]
      },
      {
        id: 'balance-report',
        name: 'Category Balance Report',
        description: 'Comprehensive analysis of category distribution and balance',
        format: 'docx',
        fileSize: '3.1 MB',
        generatedAt: new Date(),
        sections: [
          {
            id: 'balance-analysis',
            title: 'Balance Analysis',
            type: 'analysis',
            data: {
              targetDistribution: [30, 25, 20, 15, 10],
              actualDistribution: [30.2, 24.8, 19.9, 15.1, 10.0],
              deviations: [0.2, -0.2, -0.1, 0.1, 0.0]
            },
            insights: [
              'Distribution closely matches target ratios',
              'Maximum deviation is only 0.2%',
              'Balance score: 98/100 (Excellent)'
            ]
          }
        ]
      }
    ];

    setQualityReports(reports);

    // Generate balance report
    const balance: BalanceReport = {
      categoryBalance: [
        { target: 30, actual: 30.2, deviation: 0.2, status: 'excellent' },
        { target: 25, actual: 24.8, deviation: -0.2, status: 'excellent' },
        { target: 20, actual: 19.9, deviation: -0.1, status: 'excellent' },
        { target: 15, actual: 15.1, deviation: 0.1, status: 'excellent' },
        { target: 10, actual: 10.0, deviation: 0.0, status: 'excellent' }
      ],
      overallBalance: {
        score: 98,
        grade: 'A+',
        recommendations: [
          'Maintain current balancing approach',
          'Monitor for drift in future iterations',
          'Consider slight adjustment to Mood Disorders category'
        ]
      },
      qualityMetrics: {
        validationScore: 92,
        consistencyScore: 89,
        completenessScore: 95,
        accuracyScore: 91
      }
    };

    setBalanceReport(balance);
    setIsGeneratingReports(false);
  };

  const downloadReport = (report: QualityReport) => {
    // Simulate report download with actual file generation
    const mimeTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    // Generate report content based on type
    let reportContent = '';
    let fileName = '';

    switch (report.format) {
      case 'pdf':
        // Generate PDF-like content (in real implementation, use PDF library)
        reportContent = generatePDFContent(report);
        fileName = `${report.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        break;
      case 'html':
        reportContent = generateHTMLContent(report);
        fileName = `${report.name.toLowerCase().replace(/\s+/g, '-')}.html`;
        break;
      case 'docx':
        reportContent = generateDOCXContent(report);
        fileName = `${report.name.toLowerCase().replace(/\s+/g, '-')}.docx`;
        break;
    }

    const blob = new Blob([reportContent], { type: mimeTypes[report.format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = (report: QualityReport): string => {
    // Generate PDF-like content (simplified for demo)
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(${report.name}) Tj
0 -20 Td
(Generated: ${report.generatedAt.toLocaleString()}) Tj
0 -20 Td
(Sections: ${report.sections.length}) Tj
${report.sections.map(section => `
0 -20 Td
(${section.title}) Tj
${section.insights.map(insight => `
0 -15 Td
(- ${insight}) Tj`).join('')}`).join('')}
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
456
%%EOF`;
  };

  const generateHTMLContent = (report: QualityReport): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-left: 4px solid #007acc; padding-left: 15px; }
        .insights { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .insights li { margin-bottom: 8px; }
        .metadata { background: #e8f4f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.name}</h1>
        <div class="metadata">
            <p><strong>Generated:</strong> ${report.generatedAt.toLocaleString()}</p>
            <p><strong>File Size:</strong> ${report.fileSize}</p>
            <p><strong>Sections:</strong> ${report.sections.length}</p>
        </div>
    </div>
    
    ${report.sections.map(section => `
    <div class="section">
        <h2>${section.title}</h2>
        ${section.type === 'table' && Array.isArray(section.data) ? `
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Quality Score</th>
                    <th>Balance Score</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>
                ${section.data.map((row: { category: string; quality: number; balance: number; items: number }) => `
                <tr>
                    <td>${row.category}</td>
                    <td>${row.quality}%</td>
                    <td>${row.balance}%</td>
                    <td>${row.items}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : `
        <p>Section data: ${JSON.stringify(section.data, null, 2)}</p>
        `}
        
        <div class="insights">
            <h3>Key Insights:</h3>
            <ul>
                ${section.insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
    </div>
    `).join('')}
    
    <div class="footer" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666;">
        <p>Generated by Psychology Pipeline Demo - ${new Date().getFullYear()}</p>
    </div>
</body>
</html>`;
  };

  const generateDOCXContent = (report: QualityReport): string => {
    // Generate DOCX-like content (simplified XML structure)
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:pPr>
                <w:pStyle w:val="Title"/>
            </w:pPr>
            <w:r>
                <w:t>${report.name}</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:r>
                <w:t>Generated: ${report.generatedAt.toLocaleString()}</w:t>
            </w:r>
        </w:p>
        
        <w:p>
            <w:r>
                <w:t>File Size: ${report.fileSize}</w:t>
            </w:r>
        </w:p>
        
        ${report.sections.map(section => `
        <w:p>
            <w:pPr>
                <w:pStyle w:val="Heading1"/>
            </w:pPr>
            <w:r>
                <w:t>${section.title}</w:t>
            </w:r>
        </w:p>
        
        ${section.insights.map(insight => `
        <w:p>
            <w:r>
                <w:t>• ${insight}</w:t>
            </w:r>
        </w:p>
        `).join('')}
        `).join('')}
    </w:body>
</w:document>`;
  };

  const downloadAllReports = async () => {
    if (qualityReports.length === 0) {
      await generateQualityReports();
    }

    // Create a simple archive by downloading each file individually
    // In a real implementation, you would use a proper ZIP library
    for (const report of qualityReports) {
      downloadReport(report);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Download balance report as JSON
    if (balanceReport) {
      const reportData = {
        ...balanceReport,
        generatedAt: new Date().toISOString(),
        exportFormat: 'JSON',
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Download summary report
    const summaryReport = {
      generatedAt: new Date().toISOString(),
      totalReports: qualityReports.length,
      reportTypes: qualityReports.map(r => r.format),
      balanceScore: balanceReport?.overallBalance.score || 0,
      qualityMetrics: balanceReport?.qualityMetrics || {}
    };
    
    const summaryBlob = new Blob([JSON.stringify(summaryReport, null, 2)], { 
      type: 'application/json' 
    });
    const summaryUrl = URL.createObjectURL(summaryBlob);
    const summaryLink = document.createElement('a');
    summaryLink.href = summaryUrl;
    summaryLink.download = `summary-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(summaryLink);
    summaryLink.click();
    document.body.removeChild(summaryLink);
    URL.revokeObjectURL(summaryUrl);
  };

  const downloadBalanceReport = () => {
    if (!balanceReport) return;

    const reportData = {
      ...balanceReport,
      generatedAt: new Date().toISOString(),
      exportFormat: 'JSON',
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadConfigurationBackup = () => {
    const config = {
      exportFormats: exportFormats.map(f => ({
        id: f.id,
        name: f.name,
        enabled: selectedFormats.includes(f.id)
      })),
      apiIntegrations: apiIntegrations.map(i => ({
        id: i.id,
        name: i.name,
        endpoint: i.endpoint,
        status: i.status,
        enabled: i.status === 'connected'
      })),
      settings: {
        enableLiveIntegration: true,
        autoExport: false,
        compressionEnabled: true,
        metadataIncluded: true
      },
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-configuration-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const testAPIConnection = async (integrationId: string) => {
    setIsTestingConnections(true);
    
    // Simulate API connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setApiIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { 
            ...integration, 
            status: Math.random() > 0.3 ? 'connected' : 'error',
            lastSync: Math.random() > 0.3 ? new Date() : integration.lastSync
          }
        : integration
    ));
    
    setIsTestingConnections(false);
  };

  const sendToTrainingPipeline = async (integrationId: string, format: string) => {
    const integration = apiIntegrations.find(i => i.id === integrationId);
    if (!integration) return;

    // Simulate sending data to training pipeline
    const exportJob: ExportJob = {
      id: `pipeline-${Date.now()}-${integrationId}`,
      format: `${format}-${integrationId}`,
      status: 'processing',
      progress: 0,
      startTime: new Date(),
      stages: [
        { name: 'Authentication', status: 'completed', progress: 100 },
        { name: 'Data Transfer', status: 'processing', progress: 45 },
        { name: 'Validation', status: 'pending', progress: 0 },
        { name: 'Integration', status: 'pending', progress: 0 }
      ]
    };

    setExportJobs(prev => [...prev, exportJob]);

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setExportJobs(prev => prev.map(j => 
        j.id === exportJob.id ? { ...j, progress } : j
      ));
    }

    // Complete the job
    setExportJobs(prev => prev.map(j => 
      j.id === exportJob.id ? { 
        ...j, 
        status: 'completed',
        progress: 100,
        completedTime: new Date(),
        downloadUrl: `${integration.endpoint}/datasets/${exportJob.id}`
      } : j
    ));

    // Update integration last sync
    setApiIntegrations(prev => prev.map(i => 
      i.id === integrationId ? { ...i, lastSync: new Date() } : i
    ));
  };

  const getStatusColor = (status: APIIntegration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'testing':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: APIIntegration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'testing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getJobStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getJobStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Results Export & Integration</h2>
          <p className="text-gray-600 mt-1">
            Export pipeline results in multiple formats for various use cases and integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={selectedFormats.length === 0 || isExporting}
            onClick={() => startExport(selectedFormats)}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Selected ({selectedFormats.length})
          </Button>
          <Button
            disabled={isExporting}
            onClick={() => startExport(exportFormats.map(f => f.id))}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Export Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Export Format Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exportFormats.map((format) => (
              <div
                key={format.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedFormats.includes(format.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleFormatSelection(format.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {format.icon}
                    <div>
                      <h4 className="font-medium text-sm">{format.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {format.fileExtension.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">{format.size}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Features:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {format.features.slice(0, 2).map((feature, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-500">•</span>
                          {feature}
                        </li>
                      ))}
                      {format.features.length > 2 && (
                        <li className="text-gray-500">+{format.features.length - 2} more</li>
                      )}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Use Case:</h5>
                    <p className="text-xs text-gray-600">{format.useCase}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Jobs Status */}
      {exportJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Export Jobs Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {exportJobs.map((job) => {
                const format = exportFormats.find(f => f.id === job.format);
                return (
                  <div key={job.id} className={`border rounded-lg p-4 ${getJobStatusColor(job.status)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getJobStatusIcon(job.status)}
                        <div>
                          <h4 className="font-medium text-sm">{format?.name}</h4>
                          <p className="text-xs opacity-80">
                            Started: {job.startTime.toLocaleTimeString()}
                            {job.completedTime && (
                              <span> • Completed: {job.completedTime.toLocaleTimeString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.status.toUpperCase()}
                        </Badge>
                        {job.fileSize && (
                          <Badge variant="outline" className="text-xs">
                            {job.fileSize}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {job.status === 'processing' && (
                      <div className="space-y-3 mb-3">
                        {/* Overall Progress */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs opacity-80">Overall Progress</span>
                            <span className="text-xs opacity-80">{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-2" />
                        </div>

                        {/* Current Stage */}
                        {job.currentStage && job.stages && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium opacity-90">
                              Current Stage: {job.stages.find(s => s.id === job.currentStage)?.name}
                            </div>
                            
                            {/* Stage Progress */}
                            {job.stages.map((stage, index) => (
                              <div key={stage.id} className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  stage.status === 'completed' ? 'bg-green-500 text-white' :
                                  stage.status === 'processing' ? 'bg-blue-500 text-white' :
                                  'bg-gray-300 text-gray-600'
                                }`}>
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium truncate">{stage.name}</span>
                                    <span className="text-xs opacity-70">{stage.progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                    <div 
                                      className={`h-1 rounded-full transition-all duration-300 ${
                                        stage.status === 'completed' ? 'bg-green-500' :
                                        stage.status === 'processing' ? 'bg-blue-500' :
                                        'bg-gray-300'
                                      }`}
                                      style={{ width: `${stage.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Additional Progress Info */}
                        <div className="grid grid-cols-2 gap-4 text-xs opacity-80">
                          {job.bytesProcessed && job.totalBytes && (
                            <div>
                              <span className="font-medium">Data Processed:</span>
                              <div>{(job.bytesProcessed / 1024 / 1024).toFixed(1)} MB / {(job.totalBytes / 1024 / 1024).toFixed(1)} MB</div>
                            </div>
                          )}
                          {job.estimatedTimeRemaining && job.estimatedTimeRemaining > 0 && (
                            <div>
                              <span className="font-medium">Time Remaining:</span>
                              <div>{job.estimatedTimeRemaining}s</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {job.status === 'completed' && (
                      <div className="space-y-3">
                        {/* Completion Summary */}
                        {job.stages && (
                          <div className="text-xs opacity-80">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="font-medium">Total Duration:</span>
                                <div>
                                  {job.completedTime && 
                                    Math.round((job.completedTime.getTime() - job.startTime.getTime()) / 1000)
                                  }s
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Stages Completed:</span>
                                <div>{job.stages.filter(s => s.status === 'completed').length}/{job.stages.length}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(job)}
                            className="flex items-center gap-2"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyDownloadLink(job)}
                            className="flex items-center gap-2"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <Share2 className="w-3 h-3" />
                            Share
                          </Button>
                        </div>
                      </div>
                    )}

                    {job.error && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <strong>Error:</strong> {job.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality and Balance Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quality & Balance Reports
            </CardTitle>
            <Button
              onClick={generateQualityReports}
              disabled={isGeneratingReports}
              className="flex items-center gap-2"
            >
              {isGeneratingReports ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Reports
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {qualityReports.length === 0 && !isGeneratingReports ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Reports Generated</p>
              <p className="text-sm">Click &quot;Generate Reports&quot; to create comprehensive quality and balance reports</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Available Reports */}
              {qualityReports.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Available Reports</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {qualityReports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-sm">{report.name}</h5>
                            <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {report.format.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Generated:</span>
                            <span>{report.generatedAt.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>File Size:</span>
                            <span>{report.fileSize}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Sections:</span>
                            <span>{report.sections.length}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h6 className="text-xs font-medium text-gray-700">Key Insights:</h6>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {report.sections[0]?.insights.slice(0, 2).map((insight, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="text-blue-500">•</span>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReport(report)}
                            className="w-full flex items-center gap-2"
                          >
                            <Download className="w-3 h-3" />
                            Download Report
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Balance Report Summary */}
              {balanceReport && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Balance Analysis Summary</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Balance Score */}
                    <div className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="text-4xl font-bold text-blue-600 mb-2">
                          {balanceReport.overallBalance.score}
                        </div>
                        <div className="text-lg font-medium text-blue-800 mb-1">
                          Grade: {balanceReport.overallBalance.grade}
                        </div>
                        <div className="text-sm text-blue-600">Overall Balance Score</div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-medium text-sm text-gray-700">Quality Metrics</h5>
                        {Object.entries(balanceReport.qualityMetrics).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={value} className="w-20 h-2" />
                              <span className="text-sm font-medium">{value}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Category Balance Details */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-gray-700">Category Balance Status</h5>
                      <div className="space-y-3">
                        {balanceReport.categoryBalance.map((category, index) => {
                          const categoryNames = ['Anxiety Disorders', 'Mood Disorders', 'Trauma & PTSD', 'Personality Disorders', 'Substance Use'];
                          const statusColors = {
                            excellent: 'bg-green-100 text-green-800 border-green-200',
                            good: 'bg-blue-100 text-blue-800 border-blue-200',
                            'needs-improvement': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            critical: 'bg-red-100 text-red-800 border-red-200'
                          };

                          return (
                            <div key={index} className={`p-3 rounded-lg border ${statusColors[category.status]}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{categoryNames[index]}</span>
                                <Badge variant="outline" className="text-xs">
                                  {category.status.replace('-', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-600">Target:</span>
                                  <div className="font-medium">{category.target}%</div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Actual:</span>
                                  <div className="font-medium">{category.actual}%</div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Deviation:</span>
                                  <div className={`font-medium ${
                                    Math.abs(category.deviation) <= 0.5 ? 'text-green-600' : 'text-yellow-600'
                                  }`}>
                                    {category.deviation > 0 ? '+' : ''}{category.deviation}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h6 className="font-medium text-sm text-blue-800 mb-2">Recommendations</h6>
                        <ul className="text-xs text-blue-700 space-y-1">
                          {balanceReport.overallBalance.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-blue-500">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="json" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="xml">XML</TabsTrigger>
            </TabsList>
            
            <TabsContent value="json" className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`{
  "metadata": {
    "exportDate": "${new Date().toISOString()}",
    "version": "1.0.0",
    "totalItems": 1000,
    "categories": 5
  },
  "categories": [
    {
      "id": "anxiety-disorders",
      "name": "Anxiety Disorders",
      "count": 300,
      "percentage": 30.0,
      "items": [...]
    },
    {
      "id": "mood-disorders", 
      "name": "Mood Disorders",
      "count": 250,
      "percentage": 25.0,
      "items": [...]
    }
  ],
  "qualityMetrics": {
    "overallScore": 92,
    "validationScore": 89,
    "balanceScore": 95
  }
}`}</pre>
              </div>
            </TabsContent>
            
            <TabsContent value="csv" className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`category_id,category_name,item_id,content,validation_score,quality_score
anxiety-disorders,Anxiety Disorders,item_001,"Client presents with...",0.92,0.88
anxiety-disorders,Anxiety Disorders,item_002,"Therapeutic intervention...",0.89,0.91
mood-disorders,Mood Disorders,item_003,"Depression assessment...",0.94,0.87
mood-disorders,Mood Disorders,item_004,"CBT approach for...",0.91,0.93`}</pre>
              </div>
            </TabsContent>
            
            <TabsContent value="training" className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`{"input": "Client presents with generalized anxiety...", "output": "CBT intervention recommended", "category": "anxiety", "confidence": 0.92}
{"input": "Patient shows signs of major depression...", "output": "Assessment and treatment planning", "category": "mood", "confidence": 0.89}
{"input": "Trauma-related symptoms observed...", "output": "EMDR therapy consideration", "category": "trauma", "confidence": 0.94}`}</pre>
              </div>
            </TabsContent>
            
            <TabsContent value="xml" className="space-y-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`<?xml version="1.0" encoding="UTF-8"?>
<PsychologyPipelineExport>
  <Metadata>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <Version>1.0.0</Version>
    <TotalItems>1000</TotalItems>
  </Metadata>
  <Categories>
    <Category id="anxiety-disorders">
      <Name>Anxiety Disorders</Name>
      <Count>300</Count>
      <Percentage>30.0</Percentage>
    </Category>
  </Categories>
</PsychologyPipelineExport>`}</pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Comprehensive Download Center */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Downloads */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Quick Downloads</h4>
              
              <div className="space-y-3">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Training-Ready Format</h5>
                  <p className="text-xs text-gray-600 mb-3">
                    Optimized for machine learning training with balanced categories
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      JSON
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Analysis Reports</h5>
                  <p className="text-xs text-gray-600 mb-3">
                    Comprehensive breakdown with metrics and recommendations
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      PDF Report
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Excel
                    </Button>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Configuration Backup</h5>
                  <p className="text-xs text-gray-600 mb-3">
                    Save current pipeline settings for future use
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center gap-2"
                    onClick={downloadConfigurationBackup}
                  >
                    <Download className="w-4 h-4" />
                    Export Configuration
                  </Button>
                </div>
              </div>
            </div>

            {/* Bulk Downloads */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Bulk Downloads</h4>
              
              <div className="space-y-3">
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2 text-blue-800">All Reports Package</h5>
                  <p className="text-xs text-blue-600 mb-3">
                    Download all generated reports in a single ZIP file
                  </p>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full flex items-center gap-2"
                      onClick={downloadAllReports}
                      disabled={qualityReports.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      Download All Reports (ZIP)
                    </Button>
                    
                    {balanceReport && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex items-center gap-2"
                        onClick={downloadBalanceReport}
                      >
                        <Download className="w-4 h-4" />
                        Download Balance Report (JSON)
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-sm mb-2">Download History</h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {exportJobs.filter(job => job.status === 'completed').map(job => (
                      <div key={job.id} className="flex items-center justify-between text-xs">
                        <span className="truncate">{job.format.toUpperCase()} Export</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            {job.completedTime?.toLocaleTimeString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => downloadFile(job)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {exportJobs.filter(job => job.status === 'completed').length === 0 && (
                      <p className="text-xs text-gray-500 italic">No completed exports yet</p>
                    )}
                  </div>
                </div>

                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <h5 className="font-medium text-sm mb-2 text-green-800">Download Statistics</h5>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-green-600">Total Downloads:</span>
                      <div className="font-medium">{exportJobs.filter(j => j.status === 'completed').length}</div>
                    </div>
                    <div>
                      <span className="text-green-600">Total Size:</span>
                      <div className="font-medium">
                        {exportJobs.filter(j => j.status === 'completed').reduce((total, job) => {
                          const size = parseFloat(job.fileSize?.replace(/[^\d.]/g, '') || '0');
                          return total + size;
                        }, 0).toFixed(1)} MB
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600">Success Rate:</span>
                      <div className="font-medium">
                        {exportJobs.length > 0 
                          ? Math.round((exportJobs.filter(j => j.status === 'completed').length / exportJobs.length) * 100)
                          : 0
                        }%
                      </div>
                    </div>
                    <div>
                      <span className="text-green-600">Avg. Time:</span>
                      <div className="font-medium">
                        {exportJobs.filter(j => j.completedTime).length > 0
                          ? Math.round(exportJobs.filter(j => j.completedTime).reduce((total, job) => {
                              const duration = job.completedTime!.getTime() - job.startTime.getTime();
                              return total + duration;
                            }, 0) / exportJobs.filter(j => j.completedTime).length / 1000)
                          : 0
                        }s
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Integration Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Training Pipeline Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Integration Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {apiIntegrations.filter(i => i.status === 'connected').length}
                </div>
                <div className="text-sm text-green-700">Connected</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {apiIntegrations.filter(i => i.status === 'testing').length}
                </div>
                <div className="text-sm text-blue-700">Testing</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600 mb-1">
                  {apiIntegrations.filter(i => i.status === 'error').length}
                </div>
                <div className="text-sm text-red-700">Error</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-2xl font-bold text-gray-600 mb-1">
                  {apiIntegrations.filter(i => i.status === 'disconnected').length}
                </div>
                <div className="text-sm text-gray-700">Disconnected</div>
              </div>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {apiIntegrations.map((integration) => (
                <div key={integration.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(integration.status)}
                      <div>
                        <h4 className="font-medium text-lg">{integration.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${getStatusColor(integration.status)}`}>
                      {integration.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Endpoint:</span>
                        <div className="font-mono text-xs text-blue-600 truncate">
                          {integration.endpoint}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Method:</span>
                        <div className="font-medium">{integration.method}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Format:</span>
                        <div className="font-medium">{integration.dataFormat}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Auth:</span>
                        <div className="font-medium capitalize">{integration.authentication}</div>
                      </div>
                    </div>

                    {integration.lastSync && (
                      <div className="text-sm">
                        <span className="text-gray-600">Last Sync:</span>
                        <span className="font-medium ml-2">
                          {integration.lastSync.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-4">
                    <h5 className="text-sm font-medium text-gray-700">Features:</h5>
                    <div className="grid grid-cols-2 gap-1">
                      {integration.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testAPIConnection(integration.id)}
                      disabled={isTestingConnections}
                      className="flex items-center gap-2"
                    >
                      {isTestingConnections ? (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Settings className="w-3 h-3" />
                          Test Connection
                        </>
                      )}
                    </Button>

                    {integration.status === 'connected' && (
                      <Button
                        size="sm"
                        onClick={() => sendToTrainingPipeline(integration.id, 'training-ready')}
                        className="flex items-center gap-2"
                      >
                        <Database className="w-3 h-3" />
                        Send Data
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Integration Workflow */}
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-4">Integration Workflow</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    1
                  </div>
                  <h5 className="font-medium text-sm text-blue-800">Export Data</h5>
                  <p className="text-xs text-blue-600 mt-1">
                    Select format and export processed dataset
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    2
                  </div>
                  <h5 className="font-medium text-sm text-blue-800">API Connection</h5>
                  <p className="text-xs text-blue-600 mt-1">
                    Authenticate and connect to training platform
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    3
                  </div>
                  <h5 className="font-medium text-sm text-blue-800">Data Transfer</h5>
                  <p className="text-xs text-blue-600 mt-1">
                    Upload dataset with metadata and configuration
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                    4
                  </div>
                  <h5 className="font-medium text-sm text-blue-800">Training Start</h5>
                  <p className="text-xs text-blue-600 mt-1">
                    Initiate model training with optimized parameters
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsExportDemo;
