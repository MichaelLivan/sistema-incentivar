-- Inserir dados iniciais
USE incentivar_ats;

-- Limpar dados existentes
DELETE FROM sessions;
DELETE FROM supervisions;
DELETE FROM at_rates;
DELETE FROM patients;
DELETE FROM users;

-- Reset auto increment
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE patients AUTO_INCREMENT = 1;
ALTER TABLE sessions AUTO_INCREMENT = 1;
ALTER TABLE supervisions AUTO_INCREMENT = 1;

-- Inserir usuários (senha padrão: 123456)
-- Hash gerado: $2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5
INSERT INTO users (email, password, name, type, sector) VALUES
-- Financeiro
('financeiro.ats@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Maria Silva', 'financeiro-ats', NULL),
('financeiro.pct@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'João Santos', 'financeiro-pct', NULL),

-- ATs
('at.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Carlos Mendes', 'at-aba', 'aba'),
('at.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Ana Costa', 'at-denver', 'denver'),
('at.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Pedro Lima', 'at-grupo', 'grupo'),
('at.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Lucia Ferreira', 'at-escolar', 'escolar'),

-- Pais
('pai1@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Roberto Silva', 'pais', NULL),
('pai2@email.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Mariana Souza', 'pais', NULL),

-- Coordenação
('coord.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Fernanda Oliveira', 'coordenacao-aba', 'aba'),
('coord.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Ricardo Almeida', 'coordenacao-denver', 'denver'),
('coord.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Camila Santos', 'coordenacao-escolar', 'escolar'),
('coord.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Bruno Costa', 'coordenacao-grupo', 'grupo'),

-- Administração
('adm.aba@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Sandra Lima', 'adm-aba', 'aba'),
('adm.denver@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Paulo Rodrigues', 'adm-denver', 'denver'),
('adm.grupo@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Juliana Martins', 'adm-grupo', 'grupo'),
('adm.escolar@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOK5z5z5z5z5z5z5z5z5z5z5z5z5z5z5z5', 'Marcos Pereira', 'adm-escolar', 'escolar');

-- Inserir pacientes
INSERT INTO patients (name, parent_id, at_id, sector, weekly_hours, hourly_rate) VALUES
('João Pedro Silva', 7, 3, 'aba', 20.00, 60.00),
('Maria Clara Silva', 7, 4, 'denver', 15.00, 55.00),
('Lucas Souza', 8, 5, 'grupo', 10.00, 50.00),
('Ana Beatriz Santos', 8, 6, 'escolar', 25.00, 65.00);

-- Inserir valores por hora dos ATs
INSERT INTO at_rates (at_id, hourly_rate, updated_by) VALUES
(3, 35.00, 13), -- Carlos Mendes
(4, 30.00, 14), -- Ana Costa
(5, 28.00, 15), -- Pedro Lima
(6, 40.00, 16); -- Lucia Ferreira

-- Inserir algumas sessões de exemplo
INSERT INTO sessions (patient_id, at_id, start_time, end_time, date, hours, observations, is_substitution, is_confirmed, is_approved, is_launched) VALUES
(1, 3, '09:00:00', '11:00:00', '2025-01-15', 2.00, 'Sessão regular de ABA', FALSE, FALSE, FALSE, FALSE),
(2, 4, '14:00:00', '16:30:00', '2025-01-15', 2.50, 'Terapia Denver', FALSE, TRUE, FALSE, FALSE),
(3, 5, '10:00:00', '12:00:00', '2025-01-16', 2.00, 'Terapia em grupo', FALSE, TRUE, TRUE, FALSE),
(4, 6, '08:00:00', '10:00:00', '2025-01-16', 2.00, 'Acompanhamento escolar', FALSE, FALSE, FALSE, FALSE);

-- Inserir algumas supervisões de exemplo
INSERT INTO supervisions (at_id, coordinator_id, start_time, end_time, date, hours, sector, observations) VALUES
(3, 9, '16:00:00', '17:00:00', '2025-01-15', 1.00, 'aba', 'Supervisão semanal'),
(4, 10, '15:00:00', '16:00:00', '2025-01-16', 1.00, 'denver', 'Revisão de casos'),
(5, 12, '17:00:00', '18:00:00', '2025-01-17', 1.00, 'grupo', 'Planejamento de atividades'),
(6, 11, '14:00:00', '15:00:00', '2025-01-18', 1.00, 'escolar', 'Acompanhamento pedagógico');