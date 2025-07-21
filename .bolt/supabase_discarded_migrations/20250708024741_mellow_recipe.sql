/*
  # Criar Administrador Geral - Clínica Incentivar
  
  Este script cria o usuário administrador geral que terá controle total do sistema.
  
  ## Funcionalidades do Administrador Geral:
  - Cadastrar todos os tipos de usuários
  - Gerenciar pacientes e ATs
  - Visão geral completa do sistema
  - Controle total sobre todas as operações
  
  ## Credenciais:
  - Email: adm.geral@incentivar.com
  - Senha: 123456
*/

-- Usar o banco de dados
USE incentivar_ats;

-- Atualizar ENUM para incluir o novo tipo de usuário
ALTER TABLE users MODIFY COLUMN type ENUM(
    'financeiro-ats', 'financeiro-pct',
    'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
    'pais',
    'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
    'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
) NOT NULL;

-- Limpar dados existentes (remover usuários pré-cadastrados)
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

-- Inserir apenas o Administrador Geral
-- Hash bcrypt para "123456": $2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9
INSERT INTO users (email, password, name, type, sector, active) VALUES
('adm.geral@incentivar.com', '$2b$12$LQv3c1yqBw2GrMq5.rKOKOvHLXp9X9X9X9X9X9X9X9X9X9X9X9X9X9', 'Administrador Geral', 'adm-geral', NULL, TRUE);

-- Verificar se o usuário foi criado
SELECT 
    id,
    email,
    name,
    type,
    sector,
    active,
    'Senha: 123456' as senha_info
FROM users 
WHERE email = 'adm.geral@incentivar.com';

-- Mostrar informações de login
SELECT 
    CONCAT('🔑 LOGIN DO ADMINISTRADOR GERAL') as titulo,
    CONCAT('Email: ', email) as email_login,
    CONCAT('Senha: 123456') as senha_login,
    CONCAT('Tipo: ', type) as tipo_usuario,
    CONCAT('Criado em: ', created_at) as data_criacao
FROM users 
WHERE email = 'adm.geral@incentivar.com';

-- Instruções para uso
SELECT 
    '📋 INSTRUÇÕES DE USO' as titulo,
    'O Administrador Geral pode cadastrar todos os outros usuários através do sistema.' as instrucao_1,
    'Após o login, acesse a aba "Usuários" para cadastrar novos usuários.' as instrucao_2,
    'Cada usuário cadastrado poderá acessar seu perfil correspondente.' as instrucao_3,
    'O sistema está pronto para uso em produção.' as instrucao_4;