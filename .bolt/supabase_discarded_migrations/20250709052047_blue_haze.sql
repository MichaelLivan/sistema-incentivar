-- Migração: Estrutura inicial do banco de dados
-- Criada em: 2025-01-08
-- Descrição: Cria todas as tabelas principais do sistema

-- Usar o banco de dados
USE incentivar_ats;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM(
        'financeiro-ats', 'financeiro-pct',
        'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
        'pais',
        'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
        'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ) NOT NULL,
    sector ENUM('aba', 'denver', 'grupo', 'escolar') NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_id INT NOT NULL,
    at_id INT NULL,
    sector ENUM('aba', 'denver', 'grupo', 'escolar') NOT NULL,
    weekly_hours DECIMAL(5,2) NOT NULL,
    hourly_rate DECIMAL(8,2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id),
    FOREIGN KEY (at_id) REFERENCES users(id)
);

-- Tabela de sessões/atendimentos
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    at_id INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    observations TEXT,
    is_substitution BOOLEAN DEFAULT FALSE,
    is_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP NULL,
    approved_by INT NULL,
    is_launched BOOLEAN DEFAULT FALSE,
    launched_at TIMESTAMP NULL,
    launched_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (at_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (launched_by) REFERENCES users(id)
);

-- Tabela de supervisões
CREATE TABLE IF NOT EXISTS supervisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    at_id INT NOT NULL,
    coordinator_id INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    sector ENUM('aba', 'denver', 'grupo', 'escolar') NOT NULL,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (at_id) REFERENCES users(id),
    FOREIGN KEY (coordinator_id) REFERENCES users(id)
);

-- Tabela de valores por hora dos ATs
CREATE TABLE IF NOT EXISTS at_rates (
    at_id INT PRIMARY KEY,
    hourly_rate DECIMAL(8,2) NOT NULL,
    updated_by INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (at_id) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);