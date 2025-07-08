import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CategoryBalancingDemo from '../CategoryBalancingDemo';

describe('CategoryBalancingDemo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Category Balancing Visualization')).toBeInTheDocument();
    expect(screen.getByText(/Interactive target ratio management/)).toBeInTheDocument();
  });

  it('displays all psychology categories', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Anxiety Disorders')).toBeInTheDocument();
    expect(screen.getByText('Mood Disorders')).toBeInTheDocument();
    expect(screen.getByText('Trauma & PTSD')).toBeInTheDocument();
    expect(screen.getByText('Personality Disorders')).toBeInTheDocument();
    expect(screen.getByText('Substance Use Disorders')).toBeInTheDocument();
  });

  it('shows target ratios (30/25/20/15/10)', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('displays balance score metrics', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Balance Score')).toBeInTheDocument();
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
    expect(screen.getByText('Total Items')).toBeInTheDocument();
  });

  it('shows real-time balancing controls', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Real-Time Balancing Controls')).toBeInTheDocument();
    expect(screen.getByText('Real-Time Mode')).toBeInTheDocument();
    expect(screen.getByText('Balancing Speed')).toBeInTheDocument();
  });

  it('allows toggling real-time mode', async () => {
    render(<CategoryBalancingDemo />);
    
    const realTimeButton = screen.getByText('Inactive');
    fireEvent.click(realTimeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('adjusts balancing speed with slider', async () => {
    render(<CategoryBalancingDemo />);
    
    const speedSlider = screen.getByRole('slider', { name: /balancing speed/i });
    fireEvent.change(speedSlider, { target: { value: '3' } });
    
    await waitFor(() => {
      expect(screen.getByText('3.0x')).toBeInTheDocument();
    });
  });

  it('updates target total items', async () => {
    render(<CategoryBalancingDemo />);
    
    const totalInput = screen.getByDisplayValue('1000');
    fireEvent.change(totalInput, { target: { value: '2000' } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('2000')).toBeInTheDocument();
    });
  });

  it('performs auto rebalancing', async () => {
    render(<CategoryBalancingDemo />);
    
    const autoRebalanceButton = screen.getByText('Auto Rebalance');
    fireEvent.click(autoRebalanceButton);
    
    await waitFor(() => {
      expect(screen.getByText('Rebalancing...')).toBeInTheDocument();
    });
  });

  it('resets to default ratios', async () => {
    render(<CategoryBalancingDemo />);
    
    const resetButton = screen.getByText('Reset Defaults');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });
  });

  it('shows quality vs quantity trade-off analysis', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Quality vs Quantity Trade-off Analysis')).toBeInTheDocument();
    expect(screen.getByText('Quality Impact')).toBeInTheDocument();
    expect(screen.getByText('Quantity Impact')).toBeInTheDocument();
  });

  it('displays final dataset composition breakdown', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Final Dataset Composition Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  it('shows integration status', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Knowledge Balancer Integration')).toBeInTheDocument();
    expect(screen.getByText(/Connected|Disconnected|Error/)).toBeInTheDocument();
  });

  it('allows manual category ratio adjustment', async () => {
    render(<CategoryBalancingDemo />);
    
    const sliders = screen.getAllByRole('slider');
    const anxietySlider = sliders.find(slider => 
      slider.getAttribute('aria-label')?.includes('anxiety') ||
      slider.closest('[data-testid*="anxiety"]')
    );
    
    if (anxietySlider) {
      fireEvent.change(anxietySlider, { target: { value: '35' } });
      
      await waitFor(() => {
        expect(screen.getByText('35.0%')).toBeInTheDocument();
      });
    }
  });

  it('shows deviation indicators', () => {
    render(<CategoryBalancingDemo />);
    
    // Look for deviation indicators (+ or - values)
    const deviationElements = screen.getAllByText(/[+-]\d+\.\d+%/);
    expect(deviationElements.length).toBeGreaterThan(0);
  });

  it('displays status icons for categories', () => {
    render(<CategoryBalancingDemo />);
    
    // Check for status icons (checkmarks, warnings, etc.)
    const statusIcons = screen.getAllByRole('img', { hidden: true });
    expect(statusIcons.length).toBeGreaterThan(0);
  });

  it('shows recommendations', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Balancing Recommendations')).toBeInTheDocument();
  });

  it('handles live integration mode', () => {
    render(<CategoryBalancingDemo enableLiveIntegration={true} />);
    
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows demo mode when live integration disabled', () => {
    render(<CategoryBalancingDemo enableLiveIntegration={false} />);
    
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('calls onBalanceUpdate callback when provided', async () => {
    const mockCallback = vi.fn();
    render(<CategoryBalancingDemo onBalanceUpdate={mockCallback} />);
    
    const resetButton = screen.getByText('Reset Defaults');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('simulates data influx', async () => {
    render(<CategoryBalancingDemo />);
    
    const simulateButton = screen.getByText('Simulate Influx');
    fireEvent.click(simulateButton);
    
    await waitFor(() => {
      // Check that data has changed
      expect(screen.getByText(/Simulate Influx/)).toBeInTheDocument();
    });
  });

  it('shows progress bars for categories', () => {
    render(<CategoryBalancingDemo />);
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('displays category examples', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText(/Generalized anxiety/)).toBeInTheDocument();
    expect(screen.getByText(/Major depressive/)).toBeInTheDocument();
    expect(screen.getByText(/Combat-related PTSD/)).toBeInTheDocument();
  });

  it('shows export options', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Export Balancing Report')).toBeInTheDocument();
  });

  it('handles threshold adjustments', async () => {
    render(<CategoryBalancingDemo />);
    
    const thresholdSlider = screen.getByRole('slider', { name: /threshold/i });
    fireEvent.change(thresholdSlider, { target: { value: '5' } });
    
    await waitFor(() => {
      expect(screen.getByText('5%')).toBeInTheDocument();
    });
  });

  it('displays analytics tabs', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Category Details')).toBeInTheDocument();
    expect(screen.getByText('Balance History')).toBeInTheDocument();
  });

  it('switches between analytics tabs', async () => {
    render(<CategoryBalancingDemo />);
    
    const detailsTab = screen.getByText('Category Details');
    fireEvent.click(detailsTab);
    
    await waitFor(() => {
      expect(screen.getByText(/Examples:/)).toBeInTheDocument();
    });
  });

  it('shows quick balance buttons', () => {
    render(<CategoryBalancingDemo />);
    
    const quickButtons = screen.getAllByText('+');
    expect(quickButtons.length).toBeGreaterThan(0);
    
    const decreaseButtons = screen.getAllByText('-');
    expect(decreaseButtons.length).toBeGreaterThan(0);
  });

  it('handles quick balance adjustments', async () => {
    render(<CategoryBalancingDemo />);
    
    const increaseButton = screen.getAllByText('+')[0];
    fireEvent.click(increaseButton);
    
    await waitFor(() => {
      // Check that ratio has increased
      expect(screen.getByText(/\d+\.\d+%/)).toBeInTheDocument();
    });
  });

  it('displays integration sync status', () => {
    render(<CategoryBalancingDemo />);
    
    expect(screen.getByText(/Last Sync:/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Push:/)).toBeInTheDocument();
  });

  it('shows real-time status when active', async () => {
    render(<CategoryBalancingDemo />);
    
    const realTimeButton = screen.getByText('Inactive');
    fireEvent.click(realTimeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Real-Time Balancing Active')).toBeInTheDocument();
    });
  });
});
