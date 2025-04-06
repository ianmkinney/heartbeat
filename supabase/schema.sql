-- Heartbeat Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Simple user storage
CREATE TABLE heartbeat_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Default user for development (ID will be 1)
INSERT INTO heartbeat_users (email, name, created_at) 
VALUES ('default@example.com', 'Default User', now())
ON CONFLICT (email) DO NOTHING;

-- Pulses table - Stores the pulse surveys
CREATE TABLE pulses (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES heartbeat_users(id) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  emails JSONB NOT NULL, -- Array of email addresses
  response_count INTEGER DEFAULT 0,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  has_analysis BOOLEAN DEFAULT false
);

-- Responses table - Stores anonymous responses to pulses
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id TEXT REFERENCES pulses(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  respondent_id TEXT -- For preventing duplicate responses, but kept anonymous
);

-- Analyses table - Stores AI analyses of pulse responses
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pulse_id TEXT REFERENCES pulses(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- HTML content of the analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX responses_pulse_id_idx ON responses(pulse_id);
CREATE INDEX analyses_pulse_id_idx ON analyses(pulse_id);
CREATE INDEX pulses_user_id_idx ON pulses(user_id);

-- Create Row Level Security policies
ALTER TABLE heartbeat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulses ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Public access policies (since we're using anon key)
CREATE POLICY "Public read access to heartbeat_users" 
  ON heartbeat_users FOR SELECT USING (true);

CREATE POLICY "Public read access to pulses" 
  ON pulses FOR SELECT USING (true);

CREATE POLICY "Public read access to responses" 
  ON responses FOR SELECT USING (true);

CREATE POLICY "Public read access to analyses" 
  ON analyses FOR SELECT USING (true);

CREATE POLICY "Public insert access to heartbeat_users" 
  ON heartbeat_users FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access to pulses" 
  ON pulses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access to responses" 
  ON responses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access to analyses" 
  ON analyses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update access to heartbeat_users" 
  ON heartbeat_users FOR UPDATE USING (true);

CREATE POLICY "Public update access to pulses" 
  ON pulses FOR UPDATE USING (true);

CREATE POLICY "Public update access to analyses" 
  ON analyses FOR UPDATE USING (true); 