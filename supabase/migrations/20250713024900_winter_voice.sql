-- Execute este SQL no Supabase SQL Editor para criar as tabelas e o usuário administrador

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    sector VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id UUID NOT NULL REFERENCES users(id),
    at_id UUID REFERENCES users(id),
    sector VARCHAR(50),
    weekly_hours DECIMAL(5,2),
    hourly_rate DECIMAL(10,2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de sessões
CREATE TABLE IF NOT EXISTS sessions (
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

-- Criar tabela de supervisões
CREATE TABLE IF NOT EXISTS supervisions (
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

-- Inserir usuário administrador geral
-- Senha: 123456 (hash bcrypt)
INSERT INTO users (name, email, type, password) VALUES (
    'Administrador Geral',
    'adm.geral@incentivar.com',
    'adm-geral',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'
) ON CONFLICT (email) DO NOTHING;

-- Inserir alguns usuários de exemplo para teste
INSERT INTO users (name, email, type, sector, password) VALUES 
    ('AT ABA Exemplo', 'at.aba@incentivar.com', 'at-aba', 'aba', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'),
    ('Pais Exemplo', 'pai1@email.com', 'pais', NULL, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'),
    ('Coordenador ABA', 'coord.aba@incentivar.com', 'coordenacao-aba', 'aba', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue')
ON CONFLICT (email) DO NOTHING;