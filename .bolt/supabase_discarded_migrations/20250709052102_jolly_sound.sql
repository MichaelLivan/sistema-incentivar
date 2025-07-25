-- Migração: Criar índices para performance
-- Criada em: 2025-01-08
-- Descrição: Adiciona índices para melhorar performance das consultas

-- Usar o banco de dados
USE incentivar_ats;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_patient_date ON sessions(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_at_date ON sessions(at_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_supervisions_at_date ON supervisions(at_id, date);
CREATE INDEX IF NOT EXISTS idx_supervisions_coordinator_date ON supervisions(coordinator_id, date);
CREATE INDEX IF NOT EXISTS idx_patients_parent ON patients(parent_id);
CREATE INDEX IF NOT EXISTS idx_patients_at ON patients(at_id);
CREATE INDEX IF NOT EXISTS idx_patients_sector ON patients(sector);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);