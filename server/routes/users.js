// routes/users.js - Versão corrigida com debug melhorado
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// CREATE USER - Versão com debug aprimorado
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 [CREATE USER] Iniciando criação de usuário...');
    console.log('📥 Dados recebidos:', {
      ...req.body,
      password: req.body.password ? '[PRESENTE]' : '[AUSENTE]'
    });

    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    // 1. VALIDAÇÕES BÁSICAS
    if (!name || !email || !type) {
      console.log('❌ Validação falhou: campos obrigatórios ausentes');
      return res.status(400).json({ 
        message: 'Name, email and type are required',
        received: { name: !!name, email: !!email, type: !!type }
      });
    }

    // 2. VALIDAR TIPO DE USUÁRIO
    const validTypes = [
      'financeiro-ats', 'financeiro-pct',
      'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
      'pais',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ];

    if (!validTypes.includes(type)) {
      console.log('❌ Tipo de usuário inválido:', type);
      return res.status(400).json({ 
        message: 'Tipo de usuário inválido',
        validTypes,
        received: type
      });
    }

    // 3. VALIDAR SETOR (se necessário)
    const needsSector = type.startsWith('at-') || 
                       type.startsWith('coordenacao-') || 
                       (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      console.log('❌ Setor obrigatório para tipo:', type);
      return res.status(400).json({ 
        message: 'Setor é obrigatório para esse tipo',
        type,
        needsSector: true
      });
    }

    // 4. VERIFICAR SE EMAIL JÁ EXISTE
    console.log('🔍 Verificando se email já existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erro ao verificar email existente:', checkError);
      return res.status(500).json({ 
        message: 'Erro ao verificar email',
        error: checkError.message,
        code: checkError.code
      });
    }

    if (existingUser) {
      console.log('❌ Email já cadastrado:', email);
      return res.status(400).json({ 
        message: 'Email já cadastrado',
        email 
      });
    }

    // 5. HASH DA SENHA
    console.log('🔐 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // 6. PREPARAR DADOS PARA INSERÇÃO
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      type,
      sector: needsSector ? sector : null,
      password: hashedPassword,
      hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
      active: true
    };

    console.log('📝 Dados preparados para inserção:', {
      ...userData,
      password: '[HASH_GERADO]'
    });

    // 7. INSERIR USUÁRIO NO BANCO
    console.log('💾 Inserindo usuário no banco...');
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, type, sector, hourly_rate, active, created_at')
      .single();

    if (insertError) {
      console.error('❌ Erro detalhado na inserção:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });

      // Tratamento específico de erros comuns
      if (insertError.code === '23505') { // Unique violation
        return res.status(400).json({ 
          message: 'Email já está em uso',
          error: 'DUPLICATE_EMAIL'
        });
      }

      if (insertError.code === '23514') { // Check violation
        return res.status(400).json({ 
          message: 'Dados inválidos - violação de constraint',
          error: 'CONSTRAINT_VIOLATION',
          details: insertError.details
        });
      }

      if (insertError.code === '42703') { // Column does not exist
        return res.status(500).json({ 
          message: 'Erro de estrutura do banco - coluna não existe',
          error: 'COLUMN_NOT_FOUND',
          details: insertError.details
        });
      }

      return res.status(500).json({ 
        message: 'Erro ao criar usuário no banco',
        error: insertError.message,
        code: insertError.code
      });
    }

    if (!newUser) {
      console.error('❌ Usuário não foi criado (dados nulos)');
      return res.status(500).json({ 
        message: 'Usuário não foi criado - resposta nula do banco'
      });
    }

    console.log('✅ Usuário criado com sucesso:', {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      type: newUser.type
    });

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        type: newUser.type,
        sector: newUser.sector,
        hourly_rate: newUser.hourly_rate,
        active: newUser.active,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erro interno na criação de usuário:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ENDPOINT DE TESTE PARA VERIFICAR ESTRUTURA DA TABELA
router.get('/debug/table-structure', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');

    // Verificar se a tabela existe e suas colunas
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { 
        table_name: 'users',
        schema_name: 'public'
      });

    if (error) {
      // Fallback: tentar uma query simples
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('*')
        .limit(0);

      return res.json({
        message: 'Estrutura da tabela (método fallback)',
        error: error.message,
        tableExists: !testError,
        testError: testError?.message
      });
    }

    res.json({
      message: 'Estrutura da tabela users',
      columns,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao verificar estrutura:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar estrutura da tabela',
      error: error.message 
    });
  }
});

// ENDPOINT DE TESTE PARA CRIAR USUÁRIO DE TESTE
router.post('/debug/test-user', authenticateToken, async (req, res) => {
  try {
    const testUser = {
      name: 'Usuário Teste Debug',
      email: `teste-${Date.now()}@incentivar.com`,
      type: 'adm-geral',
      sector: null,
      password: await bcrypt.hash('123456', 12),
      hourly_rate: null,
      active: true
    };

    console.log('🧪 Criando usuário de teste...');

    const { data, error } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: 'Erro ao criar usuário de teste',
        error: error.message,
        code: error.code,
        details: error.details
      });
    }

    res.json({
      message: 'Usuário de teste criado com sucesso',
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        type: data.type
      }
    });

  } catch (error) {
    res.status(500).json({
      message: 'Erro interno ao criar usuário de teste',
      error: error.message
    });
  }
});

export default router;