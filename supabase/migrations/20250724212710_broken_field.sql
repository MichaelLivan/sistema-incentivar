/*
  # Corrigir estrutura da tabela de pacientes

  1. Modificações na tabela patients
    - Adicionar campos parent_email e parent_name (obrigatórios)
    - Adicionar campos parent_email2 e parent_name2 (opcionais para segundo responsável)
    - Tornar parent_id opcional (será preenchido automaticamente)
    - Adicionar índices para melhor performance

  2. Segurança
    - Manter RLS habilitado
    - Atualizar políticas de acesso

  3. Dados de exemplo
    - Inserir alguns pacientes de teste
*/

-- Primeiro, vamos verificar se a tabela existe e fazer backup se necessário
DO $$
BEGIN
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'parent_email'
  ) THEN
    ALTER TABLE patients ADD COLUMN parent_email VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'parent_name'
  ) THEN
    ALTER TABLE patients ADD COLUMN parent_name VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'parent_email2'
  ) THEN
    ALTER TABLE patients ADD COLUMN parent_email2 VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patients' AND column_name = 'parent_name2'
  ) THEN
    ALTER TABLE patients ADD COLUMN parent_name2 VARCHAR(100);
  END IF;
END $$;

-- Tornar parent_id opcional (remover NOT NULL se existir)
ALTER TABLE patients ALTER COLUMN parent_id DROP NOT NULL;

-- Adicionar restrições necessárias
DO $$
BEGIN
  -- Adicionar constraint para garantir que pelo menos parent_email seja fornecido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'patients' AND constraint_name = 'patients_parent_email_required'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_parent_email_required 
    CHECK (parent_email IS NOT NULL AND parent_email != '');
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_parent_email ON patients(parent_email);
CREATE INDEX IF NOT EXISTS idx_patients_parent_email2 ON patients(parent_email2);
CREATE INDEX IF NOT EXISTS idx_patients_sector ON patients(sector);
CREATE INDEX IF NOT EXISTS idx_patients_at_id ON patients(at_id);

-- Atualizar políticas RLS
DROP POLICY IF EXISTS "Patients policy" ON patients;
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON patients;

-- Política para pais verem apenas seus filhos
CREATE POLICY "Parents can view their children"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = parent_email OR 
    auth.jwt() ->> 'email' = parent_email2
  );

-- Política para ATs verem pacientes do seu setor ou seus próprios pacientes
CREATE POLICY "ATs can view sector patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_metadata' ->> 'type' LIKE 'at-%' AND 
     auth.jwt() ->> 'user_metadata' ->> 'sector' = sector) OR
    (auth.jwt() ->> 'user_metadata' ->> 'id')::uuid = at_id
  );

-- Política para administradores e coordenadores
CREATE POLICY "Admins can manage all patients"
  ON patients
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'user_metadata' ->> 'type' LIKE 'adm-%' OR
    auth.jwt() ->> 'user_metadata' ->> 'type' LIKE 'coordenacao-%' OR
    auth.jwt() ->> 'user_metadata' ->> 'type' LIKE 'financeiro-%'
  );

-- Inserir alguns pacientes de exemplo para teste
INSERT INTO patients (
  name, 
  parent_email, 
  parent_name, 
  sector, 
  weekly_hours, 
  hourly_rate,
  active
) VALUES 
  (
    'João Silva', 
    'elba@incentivar.com', 
    'Elba Silva', 
    'denver', 
    20.0, 
    45.00,
    true
  ),
  (
    'Maria Santos', 
    'ronaldo@incentivar.com', 
    'Ronaldo Santos', 
    'aba', 
    15.0, 
    45.00,
    true
  ),
  (
    'Pedro Oliveira', 
    'elba@incentivar.com', 
    'Elba Silva', 
    'denver', 
    18.0, 
    45.00,
    true
  )
ON CONFLICT DO NOTHING;

-- Criar usuários pais de exemplo se não existirem
INSERT INTO users (name, email, type, password, active) VALUES 
  (
    'Elba Silva', 
    'elba@incentivar.com', 
    'pais', 
    '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6',
    true
  ),
  (
    'Ronaldo Santos', 
    'ronaldo@incentivar.com', 
    'pais', 
    '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6',
    true
  )
ON CONFLICT (email) DO NOTHING;

-- Atualizar parent_id dos pacientes com base no email
UPDATE patients 
SET parent_id = users.id 
FROM users 
WHERE patients.parent_email = users.email 
  AND users.type = 'pais' 
  AND patients.parent_id IS NULL;