import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ResultsExportDemo from '../ResultsExportDemo';

// Mock URL methods
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ResultsExportDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('Results Export & Integration')).toBeInTheDocument();
    expect(screen.getByText(/Export pipeline results in multiple formats/)).toBeInTheDocument();
  });

  it('displays all export format options', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('JSON Dataset')).toBeInTheDocument();
    expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('Training-Ready Dataset')).toBeInTheDocument();
    expect(screen.getByText('Parquet Format')).toBeInTheDocument();
    expect(screen.getByText('XML Document')).toBeInTheDocument();
    expect(screen.getByText('YAML Configuration')).toBeInTheDocument();
  });

  it('allows selecting export formats', async () => {
    render(<ResultsExportDemo />);
    
    const jsonFormat = screen.getByText('JSON Dataset').closest('div');
    if (jsonFormat) {
      fireEvent.click(jsonFormat);
      
      await waitFor(() => {
        expect(jsonFormat).toHaveClass('border-blue-500');
      });
    }
  });

  it('shows export buttons with correct states', () => {
    render(<ResultsExportDemo />);
    
    const exportSelectedButton = screen.getByText(/Export Selected \(0\)/);
    expect(exportSelectedButton).toBeDisabled();
    
    const exportAllButton = screen.getByText('Export All');
    expect(exportAllButton).toBeEnabled();
  });

  it('enables export selected button when formats are selected', async () => {
    render(<ResultsExportDemo />);
    
    const jsonFormat = screen.getByText('JSON Dataset').closest('div');
    if (jsonFormat) {
      fireEvent.click(jsonFormat);
      
      await waitFor(() => {
        const exportSelectedButton = screen.getByText(/Export Selected \(1\)/);
        expect(exportSelectedButton).toBeEnabled();
      });
    }
  });

  it('starts export process when export all is clicked', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export Jobs Status')).toBeInTheDocument();
    });
  });

  it('shows export job progress', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText('PROCESSING')).toBeInTheDocument();
    });
  });

  it('displays export stages during processing', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText('Data Validation')).toBeInTheDocument();
      expect(screen.getByText('Data Processing')).toBeInTheDocument();
    });
  });

  it('shows completed exports with download options', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    await waitFor(() => {
      expect(screen.getByText('Download')).toBeInTheDocument();
    });
  });

  it('generates quality reports', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Executive Summary Report')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays balance analysis summary', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Balance Analysis Summary')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows API integration status', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('Training Pipeline Integrations')).toBeInTheDocument();
    expect(screen.getByText('Hugging Face Hub')).toBeInTheDocument();
    expect(screen.getByText('MLflow Tracking')).toBeInTheDocument();
  });

  it('displays integration connection counts', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('allows testing API connections', async () => {
    render(<ResultsExportDemo />);
    
    const testButtons = screen.getAllByText('Test Connection');
    fireEvent.click(testButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('Testing...')).toBeInTheDocument();
    });
  });

  it('enables send data for connected integrations', () => {
    render(<ResultsExportDemo />);
    
    const sendDataButtons = screen.getAllByText('Send Data');
    expect(sendDataButtons.length).toBeGreaterThan(0);
  });

  it('shows export data previews', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('Export Data Preview')).toBeInTheDocument();
    
    // Check for tab options
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('XML')).toBeInTheDocument();
  });

  it('switches between preview tabs', async () => {
    render(<ResultsExportDemo />);
    
    const csvTab = screen.getByRole('tab', { name: 'CSV' });
    fireEvent.click(csvTab);
    
    await waitFor(() => {
      expect(screen.getByText(/category_id,category_name/)).toBeInTheDocument();
    });
  });

  it('displays format features and use cases', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText(/Complete dataset structure/)).toBeInTheDocument();
    expect(screen.getByText(/API integration, web applications/)).toBeInTheDocument();
  });

  it('shows file size estimates', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('~2.5 MB')).toBeInTheDocument();
    expect(screen.getByText('~1.8 MB')).toBeInTheDocument();
  });

  it('handles download file action', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      const downloadButton = screen.getByText('Download');
      fireEvent.click(downloadButton);
    }, { timeout: 10000 });
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('handles copy link action', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      const copyButton = screen.getByText('Copy Link');
      fireEvent.click(copyButton);
    }, { timeout: 10000 });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('shows integration workflow steps', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText('Integration Workflow')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('API Connection')).toBeInTheDocument();
    expect(screen.getByText('Data Transfer')).toBeInTheDocument();
    expect(screen.getByText('Training Start')).toBeInTheDocument();
  });

  it('displays quality metrics in reports', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Validation Score/)).toBeInTheDocument();
      expect(screen.getByText(/Consistency Score/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('shows category balance status', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Category Balance Status')).toBeInTheDocument();
      expect(screen.getByText('EXCELLENT')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays recommendations', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('handles report download', async () => {
    render(<ResultsExportDemo />);
    
    const generateButton = screen.getByText('Generate Reports');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      const downloadReportButton = screen.getByText('Download Report');
      fireEvent.click(downloadReportButton);
    }, { timeout: 5000 });
    
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('calls onExportComplete callback when provided', async () => {
    const mockCallback = vi.fn();
    render(<ResultsExportDemo onExportComplete={mockCallback} />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    }, { timeout: 10000 });
  });

  it('shows authentication methods for integrations', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText(/api-key/i)).toBeInTheDocument();
    expect(screen.getByText(/oauth/i)).toBeInTheDocument();
    expect(screen.getByText(/basic/i)).toBeInTheDocument();
  });

  it('displays integration features', () => {
    render(<ResultsExportDemo />);
    
    expect(screen.getByText(/Automatic dataset versioning/)).toBeInTheDocument();
    expect(screen.getByText(/Experiment tracking/)).toBeInTheDocument();
    expect(screen.getByText(/Real-time monitoring/)).toBeInTheDocument();
  });

  it('shows processing statistics in exports', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Data Processed:/)).toBeInTheDocument();
      expect(screen.getByText(/Time Remaining:/)).toBeInTheDocument();
    });
  });

  it('displays completion summary', async () => {
    render(<ResultsExportDemo />);
    
    const exportAllButton = screen.getByText('Export All');
    fireEvent.click(exportAllButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Total Duration:/)).toBeInTheDocument();
      expect(screen.getByText(/Stages Completed:/)).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});
