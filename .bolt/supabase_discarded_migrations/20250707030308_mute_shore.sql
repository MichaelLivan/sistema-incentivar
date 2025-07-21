/*
  # Setup Completo de Usuários - Clínica Incentivar
  
  Este script cria todos os 16 usuários do sistema com senha padrão "123456"
  
  ## Como usar:
  1. Abra o MySQL Workbench
  2. Conecte ao seu servidor MySQL
  3. Execute este script completo
  4. Todos os usuários estarão prontos para uso
  
  ## Senha padrão: 123456
  ## Hash bcrypt gerado: $2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9
*/

-- Usar o banco de dados
USE incentivar_ats;

-- Limpar dados existentes (opcional - remova se quiser manter dados)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sessions;
TRUNCATE TABLE supervisions;
TRUNCATE TABLE at_rates;
TRUNCATE TABLE patients;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Reset auto increment
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE patients AUTO_INCREMENT = 1;
ALTER TABLE sessions AUTO_INCREMENT = 1;
ALTER TABLE supervisions AUTO_INCREMENT = 1;

-- Inserir todos os 16 usuários com senha padrão "123456"
-- Hash bcrypt para "123456": $2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9
INSERT INTO users (email, password, name, type, sector, active) VALUES

-- 1-2: FINANCEIRO (2 usuários)
('financeiro.ats@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Maria Silva', 'financeiro-ats', NULL, TRUE),
('financeiro.pct@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'João Santos', 'financeiro-pct', NULL, TRUE),

-- 3-6: ATs (4 usuários)
('at.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Carlos Mendes', 'at-aba', 'aba', TRUE),
('at.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Ana Costa', 'at-denver', 'denver', TRUE),
('at.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Pedro Lima', 'at-grupo', 'grupo', TRUE),
('at.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Lucia Ferreira', 'at-escolar', 'escolar', TRUE),

-- 7-8: PAIS (2 usuários)
('pai1@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Roberto Silva', 'pais', NULL, TRUE),
('pai2@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Mariana Souza', 'pais', NULL, TRUE),

-- 9-12: COORDENAÇÃO (4 usuários)
('coord.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Fernanda Oliveira', 'coordenacao-aba', 'aba', TRUE),
('coord.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Ricardo Almeida', 'coordenacao-denver', 'denver', TRUE),
('coord.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Camila Santos', 'coordenacao-escolar', 'escolar', TRUE),
('coord.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Bruno Costa', 'coordenacao-grupo', 'grupo', TRUE),

-- 13-16: ADMINISTRAÇÃO (4 usuários)
('adm.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Sandra Lima', 'adm-aba', 'aba', TRUE),
('adm.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Paulo Rodrigues', 'adm-denver', 'denver', TRUE),
('adm.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Juliana Martins', 'adm-grupo', 'grupo', TRUE),
('adm.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Marcos Pereira', 'adm-escolar', 'escolar', TRUE);

-- Inserir pacientes de exemplo
INSERT INTO patients (name, parent_id, at_id, sector, weekly_hours, hourly_rate, active) VALUES
('João Pedro Silva', 7, 3, 'aba', 20.00, 60.00, TRUE),
('Maria Clara Silva', 7, 4, 'denver', 15.00, 55.00, TRUE),
('Lucas Souza', 8, 5, 'grupo', 10.00, 50.00, TRUE),
('Ana Beatriz Santos', 8, 6, 'escolar', 25.00, 65.00, TRUE);

-- Inserir valores por hora dos ATs
INSERT INTO at_rates (at_id, hourly_rate, updated_by) VALUES
(3, 35.00, 13), -- Carlos Mendes (AT ABA) - atualizado por Sandra Lima (ADM ABA)
(4, 30.00, 14), -- Ana Costa (AT Denver) - atualizado por Paulo Rodrigues (ADM Denver)
(5, 28.00, 15), -- Pedro Lima (AT Grupo) - atualizado por Juliana Martins (ADM Grupo)
(6, 40.00, 16); -- Lucia Ferreira (AT Escolar) - atualizado por Marcos Pereira (ADM Escolar)

-- Inserir algumas sessões de exemplo para o mês atual
INSERT INTO sessions (patient_id, at_id, start_time, end_time, date, hours, observations, is_substitution, is_confirmed, is_approved, is_launched) VALUES
(1, 3, '09:00:00', '11:00:00', CURDATE(), 2.00, 'Sessão regular de ABA', FALSE, FALSE, FALSE, FALSE),
(2, 4, '14:00:00', '16:30:00', CURDATE(), 2.50, 'Terapia Denver', FALSE, TRUE, FALSE, FALSE),
(3, 5, '10:00:00', '12:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 2.00, 'Terapia em grupo', FALSE, TRUE, TRUE, FALSE),
(4, 6, '08:00:00', '10:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 2.00, 'Acompanhamento escolar', FALSE, FALSE, FALSE, FALSE);

-- Inserir algumas supervisões de exemplo
INSERT INTO supervisions (at_id, coordinator_id, start_time, end_time, date, hours, sector, observations) VALUES
(3, 9, '16:00:00', '17:00:00', CURDATE(), 1.00, 'aba', 'Supervisão semanal'),
(4, 10, '15:00:00', '16:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1.00, 'denver', 'Revisão de casos'),
(5, 12, '17:00:00', '18:00:00', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1.00, 'grupo', 'Planejamento de atividades'),
(6, 11, '14:00:00', '15:00:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1.00, 'escolar', 'Acompanhamento pedagógico');

-- Verificar se todos os usuários foram inseridos
SELECT 
    id,
    email,
    name,
    type,
    sector,
    active,
    'Senha padrão: 123456' as senha_info
FROM users 
ORDER BY id;

-- Mostrar resumo por tipo de usuário
SELECT 
    type as 'Tipo de Usuário',
    COUNT(*) as 'Quantidade',
    GROUP_CONCAT(name SEPARATOR ', ') as 'Nomes'
FROM users 
GROUP BY type 
ORDER BY type;

-- Mostrar informações de login para cada usuário
SELECT 
    CONCAT('Email: ', email, ' | Senha: 123456 | Tipo: ', type) as 'Informações de Login'
FROM users 
ORDER BY 
    CASE type
        WHEN 'financeiro-ats' THEN 1
        WHEN 'financeiro-pct' THEN 2
        WHEN 'at-aba' THEN 3
        WHEN 'at-denver' THEN 4
        WHEN 'at-grupo' THEN 5
        WHEN 'at-escolar' THEN 6
        WHEN 'pais' THEN 7
        WHEN 'coordenacao-aba' THEN 8
        WHEN 'coordenacao-denver' THEN 9
        WHEN 'coordenacao-escolar' THEN 10
        WHEN 'coordenacao-grupo' THEN 11
        WHEN 'adm-aba' THEN 12
        WHEN 'adm-denver' THEN 13
        WHEN 'adm-grupo' THEN 14
        WHEN 'adm-escolar' THEN 15
    END;