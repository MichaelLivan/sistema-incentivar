@@ .. @@
 -- Inserir usuário administrador geral
 -- Senha: 123456 (hash bcrypt)
 INSERT INTO users (name, email, type, password) VALUES (
     'Administrador Geral',
     'adm.geral@incentivar.com',
     'adm-geral',
-    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'
+    '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6'
 ) ON CONFLICT (email) DO NOTHING;
 
 -- Inserir alguns usuários de exemplo para teste
 INSERT INTO users (name, email, type, sector, password) VALUES 
-    ('AT ABA Exemplo', 'at.aba@incentivar.com', 'at-aba', 'aba', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'),
-    ('Pais Exemplo', 'pai1@email.com', 'pais', NULL, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue'),
-    ('Coordenador ABA', 'coord.aba@incentivar.com', 'coordenacao-aba', 'aba', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJL9.dHue')
+    ('AT ABA Exemplo', 'at.aba@incentivar.com', 'at-aba', 'aba', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6'),
+    ('Pais Exemplo', 'pai1@email.com', 'pais', NULL, '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6'),
+    ('Coordenador ABA', 'coord.aba@incentivar.com', 'coordenacao-aba', 'aba', '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6')
 ON CONFLICT (email) DO NOTHING;