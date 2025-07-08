import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  content?: string;
  error?: string;
}

interface ProcessingStats {
  totalFiles: number;
  processedFiles: number;
  totalItems: number;
  validItems: number;
  errors: number;
}

interface DataIngestionDemoProps {
  onDataProcessed?: (data: unknown) => void;
}

const DataIngestionDemo: React.FC<DataIngestionDemoProps> = ({ onDataProcessed }) => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalItems: 0,
    validItems: 0,
    errors: 0
  });

  const supportedFormats = [
    { name: 'JSON', ext: '.json', icon: '📄' },
    { name: 'CSV', ext: '.csv', icon: '📊' },
    { name: 'TXT', ext: '.txt', icon: '📝' },
    { name: 'DOCX', ext: '.docx', icon: '📋' }
  ];

  const handleFileUpload = useCallback((uploadedFiles: FileList) => {
    const newFiles: FileData[] = Array.from(uploadedFiles).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    // Process each file
    newFiles.forEach(fileData => {
      const file = Array.from(uploadedFiles).find(f => f.name === fileData.name);
      if (file) {
        processFile(file, fileData.id);
      }
    });
  }, []);

  const processFile = async (file: File, fileId: string) => {
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        // Simulate processing with progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, progress } : f
          ));
        }

        // Validate and process content
        let processedData;
        let itemCount = 0;
        let validCount = 0;

        try {
          if (file.type === 'application/json' || file.name.endsWith('.json')) {
            processedData = JSON.parse(content);
            itemCount = Array.isArray(processedData) ? processedData.length : 
                       processedData.items ? processedData.items.length : 1;
            validCount = itemCount;
          } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const lines = content.split('\n').filter(line => line.trim());
            itemCount = lines.length - 1; // Exclude header
            validCount = itemCount;
            processedData = { type: 'csv', rows: itemCount };
          } else {
            itemCount = content.split('\n').length;
            validCount = itemCount;
            processedData = { type: 'text', content };
          }

          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              content: JSON.stringify(processedData)
            } : f
          ));

          setStats(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
            totalItems: prev.totalItems + itemCount,
            validItems: prev.validItems + validCount
          }));

          if (onDataProcessed) {
            onDataProcessed(processedData);
          }

        } catch {
          setFiles(prev => prev.map(f => 
            f.id === fileId ? { 
              ...f, 
              status: 'error', 
              error: 'Processing failed: Invalid file format'
            } : f
          ));

          setStats(prev => ({
            ...prev,
            processedFiles: prev.processedFiles + 1,
            errors: prev.errors + 1
          }));
        }
      };

      reader.onerror = () => {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'error', 
            error: 'Failed to read file'
          } : f
        ));
      };

      reader.readAsText(file);
    } catch {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { 
          ...f, 
          status: 'error', 
          error: 'Unexpected error occurred'
        } : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-6" data-testid="data-ingestion-section">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Data Ingestion Pipeline
          </CardTitle>
          <p className="text-sm text-gray-600">
            Upload and process psychology training data with real-time validation
          </p>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-testid="upload-area"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload psychology training data in JSON, CSV, TXT, or DOCX format
            </p>
            
            <input
              type="file"
              multiple
              accept=".json,.csv,.txt,.docx"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              data-testid="file-input"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer">
                Select Files
              </Button>
            </label>
          </div>

          {/* Supported Formats */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Supported Formats</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {supportedFormats.map((format) => (
                <div key={format.name} className="flex items-center gap-2 p-2 border rounded" data-testid="format-card">
                  <span className="text-lg">{format.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{format.name}</div>
                    <div className="text-xs text-gray-500">{format.ext}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Statistics */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Statistics</CardTitle>
          </CardHeader>
          <CardContent data-testid="processing-stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalFiles}</div>
                <div className="text-sm text-blue-700">Total Files</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.processedFiles}</div>
                <div className="text-sm text-green-700">Processed</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalItems}</div>
                <div className="text-sm text-purple-700">Items processed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-sm text-red-700">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {file.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {file.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {file.status === 'processing' && <FileText className="w-5 h-5 text-blue-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{file.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          file.status === 'completed' ? 'default' :
                          file.status === 'error' ? 'destructive' : 'secondary'
                        }>
                          {file.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          data-testid={`remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
                    </div>
                    
                    {file.status === 'processing' && (
                      <Progress value={file.progress} className="h-2" />
                    )}
                    
                    {file.error && (
                      <div className="text-xs text-red-600 mt-1">{file.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataIngestionDemo;
