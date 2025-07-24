```sql
-- This script sets up the entire database schema, including tables, indexes,
-- Row Level Security (RLS) policies, and initial data for the Incentivar ATS system.
-- It is designed to be run on a fresh Supabase project.

-- Drop existing tables and policies to ensure a clean slate (use with caution in production!)
DROP TABLE IF EXISTS supervisions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS supervision_rates CASCADE;

-- Disable RLS temporarily for schema creation
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE supervisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_rates DISABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "ATs can view other ATs in their sector" ON users;
DROP POLICY IF EXISTS "Financeiro can view all users" ON users;

DROP POLICY IF EXISTS "Parents can view their children" ON patients;
DROP POLICY IF EXISTS "ATs can view sector patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage all patients" ON patients;

DROP POLICY IF EXISTS "Parents can view confirmed sessions of their children" ON sessions;
DROP POLICY IF EXISTS "ATs can view their own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins/Coordinators/Financeiro can manage sessions in their sector" ON sessions;

DROP POLICY IF EXISTS "ATs can view their own supervisions" ON supervisions;
DROP POLICY IF EXISTS "Coordinators can view supervisions in their sector" ON supervisions;
DROP POLICY IF EXISTS "Admins/Financeiro can manage all supervisions" ON supervisions;

DROP POLICY IF EXISTS "Financeiro can manage supervision rates" ON supervision_rates;
DROP POLICY IF EXISTS "All authenticated users can read supervision rates" ON supervision_rates;


-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    sector VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    hourly_rate DECIMAL(10,2) -- Added for ATs and Coordinators
);

-- Create patients table
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES users(id), -- Made optional, will be filled by backend
    at_id UUID REFERENCES users(id),
    sector VARCHAR(50),
    weekly_hours DECIMAL(5,2),
    hourly_rate DECIMAL(10,2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    parent_email VARCHAR(100) NOT NULL, -- New field for parent email
    parent_name VARCHAR(100),           -- New field for parent name
    parent_email2 VARCHAR(100),         -- New field for second parent email
    parent_name2 VARCHAR(100)           -- New field for second parent name
);

-- Add constraint to ensure at least parent_email is provided
ALTER TABLE patients ADD CONSTRAINT patients_parent_email_required
CHECK (parent_email IS NOT NULL AND parent_email != '');

-- Create sessions table
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id),
    at_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours DECIMAL(4,2),
    observations TEXT,
    is_substitution BOOLEAN DEFAULT FALSE,
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    is_launched BOOLEAN DEFAULT FALSE,
    launched_at TIMESTAMP,
    launched_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create supervisions table
CREATE TABLE supervisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    at_id UUID NOT NULL REFERENCES users(id),
    coordinator_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    hours DECIMAL(4,2),
    sector VARCHAR(50),
    observations TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create supervision_rates table
CREATE TABLE supervision_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aba DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    denver DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    grupo DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    escolar DECIMAL(10,2) NOT NULL DEFAULT 35.00,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_sector ON users(sector);

CREATE INDEX idx_patients_parent_email ON patients(parent_email);
CREATE INDEX idx_patients_parent_email2 ON patients(parent_email2);
CREATE INDEX idx_patients_sector ON patients(sector);
CREATE INDEX idx_patients_at_id ON patients(at_id);

CREATE INDEX idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX idx_sessions_at_id ON sessions(at_id);
CREATE INDEX idx_sessions_date ON sessions(date);

CREATE INDEX idx_supervisions_at_id ON supervisions(at_id);
CREATE INDEX idx_supervisions_coordinator_id ON supervisions(coordinator_id);
CREATE INDEX idx_supervisions_date ON supervisions(date);


-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for 'users' table
CREATE POLICY "Users can view themselves" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'type' LIKE 'adm-%');

CREATE POLICY "ATs can view other ATs in their sector" ON users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'type' LIKE 'at-%' AND auth.jwt() ->> 'sector' = sector);

CREATE POLICY "Financeiro can view all users" ON users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'type' LIKE 'financeiro-%');

-- RLS Policies for 'patients' table
CREATE POLICY "Parents can view their children"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = parent_email OR
    auth.jwt() ->> 'email' = parent_email2
  );

CREATE POLICY "ATs can view sector patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'type' LIKE 'at-%' AND
     auth.jwt() ->> 'sector' = sector) OR
    (auth.uid() = at_id)
  );

CREATE POLICY "Admins can manage all patients"
  ON patients
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'type' LIKE 'adm-%' OR
    auth.jwt() ->> 'type' LIKE 'coordenacao-%' OR
    auth.jwt() ->> 'type' LIKE 'financeiro-%'
  );

-- RLS Policies for 'sessions' table
CREATE POLICY "Parents can view confirmed sessions of their children" ON sessions
  FOR SELECT
  TO authenticated
  USING (
    is_confirmed = TRUE AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_id AND (patients.parent_email = auth.jwt() ->> 'email' OR patients.parent_email2 = auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "ATs can view their own sessions" ON sessions
  FOR SELECT
  TO authenticated
  USING (at_id = auth.uid());

CREATE POLICY "Admins/Coordinators/Financeiro can manage sessions in their sector" ON sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND
      (users.type LIKE 'adm-%' OR users.type LIKE 'coordenacao-%' OR users.type LIKE 'financeiro-%') AND
      (users.sector = (SELECT sector FROM patients WHERE patients.id = patient_id) OR users.type = 'adm-geral')
    )
  );

-- RLS Policies for 'supervisions' table
CREATE POLICY "ATs can view their own supervisions" ON supervisions
  FOR SELECT
  TO authenticated
  USING (at_id = auth.uid());

CREATE POLICY "Coordinators can view supervisions in their sector" ON supervisions
  FOR SELECT
  TO authenticated
  USING (
    coordinator_id = auth.uid() OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.type LIKE 'coordenacao-%' AND users.sector = sector))
  );

CREATE POLICY "Admins/Financeiro can manage all supervisions" ON supervisions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'type' LIKE 'adm-%' OR auth.jwt() ->> 'type' LIKE 'financeiro-%');

-- RLS Policies for 'supervision_rates' table
CREATE POLICY "Financeiro can manage supervision rates" ON supervision_rates
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'type' = 'financeiro-ats');

CREATE POLICY "All authenticated users can read supervision rates" ON supervision_rates
  FOR SELECT
  TO authenticated
  USING (TRUE);


-- Initial Data Insertion
-- Password for all example users: 123456 (hashed with bcrypt)
-- Hash for '123456' is '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6'

INSERT INTO users (name, email, type, password, active, hourly_rate) VALUES
    ('Administrador Geral', 'adm.geral@incentivar.com', 'adm-geral', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL),
    ('AT ABA Exemplo', 'at.aba@incentivar.com', 'at-aba', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, 35.00),
    ('Jessica Santana', 'jessicasantana@incentivar.com', 'at-denver', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, 35.00),
    ('Camila Alves', 'camilaalves@incentivar.com', 'at-denver', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, 35.00),
    ('Financeiro ATs', 'financeiro.ats@incentivar.com', 'financeiro-ats', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL),
    ('Financeiro PCT', 'financeiro.pct@incentivar.com', 'financeiro-pct', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL),
    ('Debora Admin Denver', 'debora.denver@incentivar.com', 'adm-denver', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL),
    ('Elba Silva', 'elba@incentivar.com', 'pais', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL),
    ('Ronaldo Santos', 'ronaldo@incentivar.com', 'pais', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6', TRUE, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO patients (name, parent_email, parent_name, sector, weekly_hours, hourly_rate, active, at_id) VALUES
  ('João Silva', 'elba@incentivar.com', 'Elba Silva', 'denver', 20.0, 45.00, TRUE, (SELECT id FROM users WHERE email = 'jessicasantana@incentivar.com')),
  ('Maria Santos', 'ronaldo@incentivar.com', 'Ronaldo Santos', 'aba', 15.0, 45.00, TRUE, (SELECT id FROM users WHERE email = 'at.aba@incentivar.com')),
  ('Pedro Oliveira', 'elba@incentivar.com', 'Elba Silva', 'denver', 18.0, 45.00, TRUE, (SELECT id FROM users WHERE email = 'camilaalves@incentivar.com'))
ON CONFLICT DO NOTHING;

-- Update parent_id for existing patients based on parent_email
UPDATE patients
SET parent_id = users.id
FROM users
WHERE patients.parent_email = users.email
  AND users.type = 'pais'
  AND patients.parent_id IS NULL;

-- Insert default supervision rates if not exists
INSERT INTO supervision_rates (aba, denver, grupo, escolar) VALUES (35.00, 35.00, 35.00, 35.00)
ON CONFLICT DO NOTHING;
```