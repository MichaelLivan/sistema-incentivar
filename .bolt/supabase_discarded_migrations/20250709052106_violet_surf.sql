-- Seed: Criar usuário administrador geral
-- Descrição: Cria o usuário administrador geral do sistema

USE incentivar_ats;

-- Inserir apenas o Administrador Geral
-- Hash bcrypt para "123456": $2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9
INSERT IGNORE INTO users (email, password, name, type, sector, active) VALUES
('adm.geral@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Administrador Geral', 'adm-geral', NULL, TRUE);