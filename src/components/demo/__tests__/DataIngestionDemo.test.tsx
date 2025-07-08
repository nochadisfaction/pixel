import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DataIngestionDemo from '../DataIngestionDemo';

// Mock file reading
const mockFileReader = {
  readAsText: vi.fn(),
  result: '',
  onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
  onerror: null as ((event: ProgressEvent<FileReader>) => void) | null,
};

// Mock FileReader constructor
global.FileReader = vi.fn(() => mockFileReader) as any;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('DataIngestionDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<DataIngestionDemo />);
    
    expect(screen.getByText('Data Ingestion Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Upload and process psychology training data with real-time validation')).toBeInTheDocument();
    expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument();
  });

  it('displays upload area correctly', () => {
    render(<DataIngestionDemo />);
    
    const uploadArea = screen.getByTestId('upload-area');
    expect(uploadArea).toBeInTheDocument();
    expect(uploadArea).toHaveClass('border-dashed');
  });

  it('shows supported file formats', () => {
    render(<DataIngestionDemo />);
    
    expect(screen.getByText('Supported Formats')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('TXT')).toBeInTheDocument();
    expect(screen.getByText('DOCX')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.json')).toBeInTheDocument();
    });
  });

  it('validates file types correctly', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
    });
  });

  it('processes files and shows progress', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['{"data": "test"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Simulate FileReader onload
    mockFileReader.result = '{"data": "test"}';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(screen.getByText('test.json')).toBeInTheDocument();
    });
  });

  it('handles processing errors gracefully', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Simulate FileReader error
    mockFileReader.result = 'invalid json';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Processing failed/)).toBeInTheDocument();
    });
  });

  it('allows removing uploaded files', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const removeButton = screen.getByTestId('remove-file-0');
      fireEvent.click(removeButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('test.json')).not.toBeInTheDocument();
    });
  });

  it('shows validation results', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['{"valid": "data"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    mockFileReader.result = '{"valid": "data"}';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });
  });

  it('displays processing statistics', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test data'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    mockFileReader.result = 'test data';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Processing Statistics')).toBeInTheDocument();
    });
  });

  it('handles drag and drop events', () => {
    render(<DataIngestionDemo />);
    
    const uploadArea = screen.getByTestId('upload-area');
    
    fireEvent.dragEnter(uploadArea);
    expect(uploadArea).toHaveClass('border-blue-500');
    
    fireEvent.dragLeave(uploadArea);
    expect(uploadArea).not.toHaveClass('border-blue-500');
  });

  it('calls onDataProcessed callback when provided', async () => {
    const mockCallback = vi.fn();
    render(<DataIngestionDemo onDataProcessed={mockCallback} />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['{"test": "data"}'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    mockFileReader.result = '{"test": "data"}';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('shows real-time validation feedback', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['valid content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    mockFileReader.result = 'valid content';
    if (mockFileReader.onload) {
      mockFileReader.onload({} as ProgressEvent<FileReader>);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/validation/i)).toBeInTheDocument();
    });
  });

  it('handles multiple file uploads', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const files = [
      new File(['content1'], 'test1.json', { type: 'application/json' }),
      new File(['content2'], 'test2.json', { type: 'application/json' })
    ];
    
    fireEvent.change(fileInput, { target: { files } });
    
    await waitFor(() => {
      expect(screen.getByText('test1.json')).toBeInTheDocument();
      expect(screen.getByText('test2.json')).toBeInTheDocument();
    });
  });

  it('displays file size information', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/bytes/)).toBeInTheDocument();
    });
  });

  it('shows upload progress for large files', async () => {
    render(<DataIngestionDemo />);
    
    const fileInput = screen.getByTestId('file-input');
    const largeContent = 'x'.repeat(10000);
    const file = new File([largeContent], 'large.json', { type: 'application/json' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });
});
