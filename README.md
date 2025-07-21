# Sistema de Gerenciamento de ATs - Clínica Incentivar

## Tecnologias

### Frontend
- React 18 com TypeScript
- Tailwind CSS para estilização
- Vite como build tool
- Lucide React para ícones

### Backend
- Node.js com Express
- Supabase como banco de dados
- JWT para autenticação
- bcrypt para hash de senhas
- Helmet para segurança
- Morgan para logs

## Pré-requisitos

- Node.js 18+
- Conta no Supabase
- npm ou yarn

## Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd incentivar-ats
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Supabase

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings > API para obter as chaves
4. Configure as variáveis de ambiente

### 4. Configure as variáveis de ambiente

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
NODE_ENV=development
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# JWT Secret
JWT_SECRET=sua_chave_secreta_jwt_super_forte

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 5. Configure o banco de dados no Supabase

Execute os seguintes comandos SQL no Supabase SQL Editor:

```sql
-- Criar tabela de usuários
CREATE TABLE users (
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
CREATE TABLE patients (
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
CREATE TABLE sessions (
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
CREATE TABLE supervisions (
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
INSERT INTO users (name, email, type, password) VALUES (
    'Administrador Geral',
    'adm.geral@incentivar.com',
    'adm-geral',
    '$2a$12$mPvkP9VHS9jgaSTSRpbeeunIDwz8.c3x/yeVJAvHaC6Z13gRC26q6'
);
```

## Executando o projeto

### Desenvolvimento (Frontend + Backend)
```bash
npm run dev
```

### Apenas Backend
```bash
npm run server
```

### Apenas Frontend
```bash
npx vite
```

## Autenticação

### Usuário Administrador Geral:
- Email: `adm.geral@incentivar.com`
- Senha: `123456`

O administrador geral pode cadastrar todos os outros tipos de usuários.

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/logout` - Logout

### Usuários
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Desativar usuário

### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Criar paciente
- `PUT /api/patients/:id` - Atualizar paciente
- `DELETE /api/patients/:id` - Desativar paciente

### Sessões
- `GET /api/sessions` - Listar sessões
- `POST /api/sessions` - Criar sessão
- `PATCH /api/sessions/:id/confirm` - Confirmar sessão (pais)
- `PATCH /api/sessions/:id/approve` - Aprovar sessão (admin/coord)
- `PATCH /api/sessions/:id/launch` - Lançar sessão (admin)
- `DELETE /api/sessions/:id` - Deletar sessão

### Supervisões
- `GET /api/supervisions` - Listar supervisões
- `POST /api/supervisions` - Criar supervisão
- `DELETE /api/supervisions/:id` - Deletar supervisão

## Segurança

- Autenticação JWT
- Hash de senhas com bcrypt
- Rate limiting
- Helmet para headers de segurança
- CORS configurado
- Validação de entrada
- Autorização baseada em roles

## Deploy

### Preparação para Produção:

1. **Configure as variáveis de ambiente de produção**
2. **Use um banco Supabase em produção**
3. **Configure HTTPS**
4. **Use um JWT_SECRET forte**
5. **Configure logs adequados**

### Build:
```bash
npm run build
```

### Deploy no Render:
1. Conecte seu repositório GitHub ao Render
2. Configure as variáveis de ambiente
3. O Render detectará automaticamente o projeto Node.js
4. Configure o comando de build: `npm run build`
5. Configure o comando de start: `npm run server`

## Troubleshooting

### Erro de conexão Supabase:
- Verifique se as URLs e chaves estão corretas no `.env`
- Confirme se o projeto Supabase está ativo

### Erro de autenticação:
- Verifique se o JWT_SECRET está configurado
- Confirme se o hash das senhas foi gerado corretamente

### Erro de CORS:
- Verifique se o FRONTEND_URL está correto no `.env`

## Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.