-- Seed: Dados de exemplo
-- Descrição: Insere dados de exemplo para desenvolvimento e testes

USE incentivar_ats;

-- Inserir usuários de exemplo (apenas se não existirem)
INSERT IGNORE INTO users (email, password, name, type, sector, active) VALUES
-- Financeiro
('financeiro.ats@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Maria Silva', 'financeiro-ats', NULL, TRUE),
('financeiro.pct@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'João Santos', 'financeiro-pct', NULL, TRUE),

-- ATs
('at.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Carlos Mendes', 'at-aba', 'aba', TRUE),
('at.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Ana Costa', 'at-denver', 'denver', TRUE),
('at.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Pedro Lima', 'at-grupo', 'grupo', TRUE),
('at.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Lucia Ferreira', 'at-escolar', 'escolar', TRUE),

-- Pais
('pai1@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Roberto Silva', 'pais', NULL, TRUE),
('pai2@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Mariana Souza', 'pais', NULL, TRUE),

-- Coordenação
('coord.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Fernanda Oliveira', 'coordenacao-aba', 'aba', TRUE),
('coord.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Ricardo Almeida', 'coordenacao-denver', 'denver', TRUE),
('coord.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Camila Santos', 'coordenacao-escolar', 'escolar', TRUE),
('coord.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Bruno Costa', 'coordenacao-grupo', 'grupo', TRUE),

-- Administração
('adm.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Sandra Lima', 'adm-aba', 'aba', TRUE),
('adm.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Paulo Rodrigues', 'adm-denver', 'denver', TRUE),
('adm.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Juliana Martins', 'adm-grupo', 'grupo', TRUE),
('adm.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Marcos Pereira', 'adm-escolar', 'escolar', TRUE);

-- Inserir pacientes de exemplo (apenas se não existirem)
INSERT IGNORE INTO patients (name, parent_id, at_id, sector, weekly_hours, hourly_rate, active) VALUES
('João Pedro Silva', 7, 3, 'aba', 20.00, 60.00, TRUE),
('Maria Clara Silva', 7, 4, 'denver', 15.00, 55.00, TRUE),
('Lucas Souza', 8, 5, 'grupo', 10.00, 50.00, TRUE),
('Ana Beatriz Santos', 8, 6, 'escolar', 25.00, 65.00, TRUE);

-- Inserir valores por hora dos ATs (apenas se não existirem)
INSERT IGNORE INTO at_rates (at_id, hourly_rate, updated_by) VALUES
(3, 35.00, 1), -- Carlos Mendes
(4, 30.00, 1), -- Ana Costa
(5, 28.00, 1), -- Pedro Lima
(6, 40.00, 1); -- Lucia Ferreira

-- Inserir algumas sessões de exemplo
INSERT IGNORE INTO sessions (patient_id, at_id, start_time, end_time, date, hours, observations, is_substitution, is_confirmed, is_approved, is_launched) VALUES
(1, 3, '09:00:00', '11:00:00', CURDATE(), 2.00, 'Sessão regular de ABA', FALSE, FALSE, FALSE, FALSE),
(2, 4, '14:00:00', '16:30:00', CURDATE(), 2.50, 'Terapia Denver', FALSE, TRUE, FALSE, FALSE),
(3, 5, '10:00:00', '12:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 2.00, 'Terapia em grupo', FALSE, TRUE, TRUE, FALSE),
(4, 6, '08:00:00', '10:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 2.00, 'Acompanhamento escolar', FALSE, FALSE, FALSE, FALSE);

-- Inserir algumas supervisões de exemplo
INSERT IGNORE INTO supervisions (at_id, coordinator_id, start_time, end_time, date, hours, sector, observations) VALUES
(3, 9, '16:00:00', '17:00:00', CURDATE(), 1.00, 'aba', 'Supervisão semanal'),
(4, 10, '15:00:00', '16:00:00', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1.00, 'denver', 'Revisão de casos'),
(5, 12, '17:00:00', '18:00:00', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1.00, 'grupo', 'Planejamento de atividades'),
(6, 11, '14:00:00', '15:00:00', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1.00, 'escolar', 'Acompanhamento pedagógico');