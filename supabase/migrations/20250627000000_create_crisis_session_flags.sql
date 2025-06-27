-- Migration: Create crisis session flagging system
-- This migration creates tables and functions for flagging user sessions during crisis events

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for crisis session flagging
CREATE TYPE crisis_flag_status AS ENUM (
  'pending',
  'under_review',
  'reviewed',
  'resolved',
  'escalated',
  'dismissed'
);

CREATE TYPE crisis_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Create crisis_session_flags table
CREATE TABLE public.crisis_session_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL, -- Can be external session ID or internal
  crisis_id UUID NOT NULL UNIQUE, -- Unique identifier for this crisis event
  
  -- Crisis details
  reason TEXT NOT NULL,
  severity crisis_severity NOT NULL DEFAULT 'medium',
  confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  detected_risks TEXT[] NOT NULL DEFAULT '{}',
  text_sample TEXT,
  
  -- Status and workflow
  status crisis_flag_status NOT NULL DEFAULT 'pending',
  flagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Staff assignment and notes
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  resolution_notes TEXT,
  
  -- Metadata and context
  routing_decision JSONB, -- Store the routing decision that led to flagging
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_session_status table for tracking overall user status
CREATE TABLE public.user_session_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Current status
  is_flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  current_risk_level crisis_severity DEFAULT 'low',
  last_crisis_event_at TIMESTAMPTZ,
  
  -- Counters
  total_crisis_flags INTEGER NOT NULL DEFAULT 0,
  active_crisis_flags INTEGER NOT NULL DEFAULT 0,
  resolved_crisis_flags INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.crisis_session_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_status ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp (reuse existing if available)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Create triggers for updated_at timestamps
CREATE TRIGGER set_crisis_session_flags_updated_at
BEFORE UPDATE ON public.crisis_session_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_user_session_status_updated_at
BEFORE UPDATE ON public.user_session_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update user session status when crisis flags change
CREATE OR REPLACE FUNCTION public.update_user_session_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user session status
  INSERT INTO public.user_session_status (user_id, is_flagged_for_review, current_risk_level, last_crisis_event_at, total_crisis_flags, active_crisis_flags)
  VALUES (
    NEW.user_id,
    TRUE,
    NEW.severity,
    NEW.flagged_at,
    1,
    1
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_flagged_for_review = CASE 
      WHEN NEW.status IN ('pending', 'under_review', 'escalated') THEN TRUE
      ELSE (SELECT COUNT(*) > 0 FROM public.crisis_session_flags 
            WHERE user_id = NEW.user_id AND status IN ('pending', 'under_review', 'escalated'))
    END,
    current_risk_level = GREATEST(user_session_status.current_risk_level, NEW.severity),
    last_crisis_event_at = GREATEST(user_session_status.last_crisis_event_at, NEW.flagged_at),
    total_crisis_flags = user_session_status.total_crisis_flags + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
    active_crisis_flags = (
      SELECT COUNT(*) FROM public.crisis_session_flags 
      WHERE user_id = NEW.user_id AND status IN ('pending', 'under_review', 'escalated')
    ),
    resolved_crisis_flags = (
      SELECT COUNT(*) FROM public.crisis_session_flags 
      WHERE user_id = NEW.user_id AND status IN ('reviewed', 'resolved', 'dismissed')
    ),
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Create trigger to update user session status
CREATE TRIGGER update_user_session_status_trigger
AFTER INSERT OR UPDATE ON public.crisis_session_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_user_session_status();

-- Create indexes for performance
CREATE INDEX idx_crisis_session_flags_user_id ON public.crisis_session_flags(user_id);
CREATE INDEX idx_crisis_session_flags_session_id ON public.crisis_session_flags(session_id);
CREATE INDEX idx_crisis_session_flags_crisis_id ON public.crisis_session_flags(crisis_id);
CREATE INDEX idx_crisis_session_flags_status ON public.crisis_session_flags(status);
CREATE INDEX idx_crisis_session_flags_severity ON public.crisis_session_flags(severity);
CREATE INDEX idx_crisis_session_flags_flagged_at ON public.crisis_session_flags(flagged_at);
CREATE INDEX idx_crisis_session_flags_assigned_to ON public.crisis_session_flags(assigned_to);

CREATE INDEX idx_user_session_status_user_id ON public.user_session_status(user_id);
CREATE INDEX idx_user_session_status_flagged ON public.user_session_status(is_flagged_for_review);
CREATE INDEX idx_user_session_status_risk_level ON public.user_session_status(current_risk_level);

-- RLS Policies

-- Crisis session flags policies
-- Admins and therapists can view all crisis flags
CREATE POLICY "Admins and therapists can view all crisis flags" ON public.crisis_session_flags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'therapist')
    )
  );

-- Users can view their own crisis flags
CREATE POLICY "Users can view their own crisis flags" ON public.crisis_session_flags
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins and therapists can insert/update crisis flags
CREATE POLICY "Admins and therapists can manage crisis flags" ON public.crisis_session_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'therapist')
    )
  );

-- User session status policies
-- Admins and therapists can view all user session statuses
CREATE POLICY "Admins and therapists can view all user session statuses" ON public.user_session_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'therapist')
    )
  );

-- Users can view their own session status
CREATE POLICY "Users can view their own session status" ON public.user_session_status
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert/update user session status (via triggers)
CREATE POLICY "System can manage user session status" ON public.user_session_status
  FOR ALL
  USING (TRUE); -- This will be restricted by application logic

-- Comments for documentation
COMMENT ON TABLE public.crisis_session_flags IS 'Tracks crisis events and session flagging for immediate review';
COMMENT ON TABLE public.user_session_status IS 'Tracks overall user status and crisis flag summaries';
COMMENT ON COLUMN public.crisis_session_flags.crisis_id IS 'Unique identifier for this specific crisis event';
COMMENT ON COLUMN public.crisis_session_flags.routing_decision IS 'JSON data about the AI routing decision that triggered the flag';
COMMENT ON COLUMN public.user_session_status.is_flagged_for_review IS 'Whether user currently has active crisis flags requiring review';
