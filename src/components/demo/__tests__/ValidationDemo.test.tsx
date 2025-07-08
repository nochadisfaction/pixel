import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ValidationDemo from '../ValidationDemo';

describe('ValidationDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<ValidationDemo />);
    
    expect(screen.getByText('Real-time Content Validation')).toBeInTheDocument();
    expect(screen.getByText('Advanced validation pipeline with psychology-specific checks')).toBeInTheDocument();
  });

  it('displays validation categories', () => {
    render(<ValidationDemo />);
    
    expect(screen.getByText('Content Quality')).toBeInTheDocument();
    expect(screen.getByText('Clinical Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Ethical Compliance')).toBeInTheDocument();
    expect(screen.getByText('Format Validation')).toBeInTheDocument();
  });

  it('shows validation rules for each category', () => {
    render(<ValidationDemo />);
    
    // Check for some validation rules
    expect(screen.getByText(/Grammar and spelling/)).toBeInTheDocument();
    expect(screen.getByText(/Clinical terminology/)).toBeInTheDocument();
    expect(screen.getByText(/Privacy protection/)).toBeInTheDocument();
  });

  it('validates text input in real-time', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { target: { value: 'Test psychology content for validation' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Validation Results/)).toBeInTheDocument();
    });
  });

  it('shows validation scores', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'The patient exhibits symptoms of anxiety disorder requiring CBT intervention.' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Overall Score/)).toBeInTheDocument();
    });
  });

  it('displays validation issues when found', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'bad grammar and spelling erors' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Issues Found/)).toBeInTheDocument();
    });
  });

  it('shows suggestions for improvement', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Patient is crazy and needs help' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Suggestions/)).toBeInTheDocument();
    });
  });

  it('validates clinical terminology usage', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Client presents with major depressive disorder symptoms' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Clinical Accuracy/)).toBeInTheDocument();
    });
  });

  it('checks for ethical compliance', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'John Smith from 123 Main St has depression' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Privacy/)).toBeInTheDocument();
    });
  });

  it('validates content format and structure', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Proper clinical documentation with appropriate structure and formatting.' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Format/)).toBeInTheDocument();
    });
  });

  it('shows real-time character and word count', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { target: { value: 'Test content' } });
    
    await waitFor(() => {
      expect(screen.getByText(/characters/)).toBeInTheDocument();
      expect(screen.getByText(/words/)).toBeInTheDocument();
    });
  });

  it('displays validation progress indicators', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Clinical assessment shows positive therapeutic outcomes' } 
    });
    
    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  it('handles empty input gracefully', () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { target: { value: '' } });
    
    expect(screen.getByText(/Enter content to see validation results/)).toBeInTheDocument();
  });

  it('validates content length requirements', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { target: { value: 'Short' } });
    
    await waitFor(() => {
      expect(screen.getByText(/too short/i)).toBeInTheDocument();
    });
  });

  it('detects inappropriate language', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Patient is completely insane and hopeless' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/inappropriate/i)).toBeInTheDocument();
    });
  });

  it('validates professional tone', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'The client demonstrates significant improvement in therapeutic outcomes' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Professional/)).toBeInTheDocument();
    });
  });

  it('shows validation history', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    
    // Validate multiple texts
    fireEvent.change(textInput, { target: { value: 'First validation text' } });
    await waitFor(() => {});
    
    fireEvent.change(textInput, { target: { value: 'Second validation text' } });
    await waitFor(() => {});
    
    expect(screen.getByText(/Validation History/)).toBeInTheDocument();
  });

  it('allows clearing validation results', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { target: { value: 'Test content' } });
    
    await waitFor(() => {
      const clearButton = screen.getByText(/Clear/);
      fireEvent.click(clearButton);
    });
    
    expect(textInput).toHaveValue('');
  });

  it('exports validation results', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Clinical assessment with therapeutic recommendations' } 
    });
    
    await waitFor(() => {
      const exportButton = screen.getByText(/Export/);
      expect(exportButton).toBeInTheDocument();
    });
  });

  it('calls onValidationComplete callback when provided', async () => {
    const mockCallback = vi.fn();
    render(<ValidationDemo onValidationComplete={mockCallback} />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Test validation content' } 
    });
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('handles validation errors gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Content that might cause validation error' } 
    });
    
    await waitFor(() => {
      // Component should handle errors gracefully
      expect(screen.getByText(/Validation/)).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('shows detailed validation breakdown', async () => {
    render(<ValidationDemo />);
    
    const textInput = screen.getByPlaceholderText(/Enter psychology content/);
    fireEvent.change(textInput, { 
      target: { value: 'Comprehensive clinical assessment demonstrates positive therapeutic outcomes with evidence-based interventions' } 
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Detailed Breakdown/)).toBeInTheDocument();
    });
  });
});
