// routes/users.js - Versão corrigida com diagnóstico e fallbacks
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// FUNÇÃO AUXILIAR: Verificar se tabela existe e tem estrutura correta
async function ensureTableExists() {
  try {
    // Tentar uma query simples para verificar se a tabela existe
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.log('⚠️ Tabela users pode não existir:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('❌ Erro ao verificar tabela:', err.message);
    return false;
  }
}

// FUNÇÃO AUXILIAR: Criar usuário de forma segura
async function createUserSafely(userData) {
  console.log('📝 Tentando criar usuário com dados:', {
    ...userData,
    password: '[HASH_PROTEGIDO]'
  });

  // Método 1: Inserção normal
  try {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, type, sector, hourly_rate, active, created_at')
      .single();

    if (!error && data) {
      console.log('✅ Usuário criado com sucesso (método 1)');
      return { success: true, data, error: null };
    }

    console.log('⚠️ Método 1 falhou, tentando método 2...');
    console.log('Erro método 1:', error);

    // Método 2: Inserção com upsert
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .upsert(userData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select('id, name, email, type, sector, hourly_rate, active, created_at')
      .single();

    if (!error2 && data2) {
      console.log('✅ Usuário criado com sucesso (método 2 - upsert)');
      return { success: true, data: data2, error: null };
    }

    console.log('❌ Ambos os métodos falharam');
    return { success: false, data: null, error: error2 || error };

  } catch (err) {
    console.error('❌ Erro interno na criação:', err);
    return { success: false, data: null, error: err };
  }
}

// CREATE USER - Versão ultra robusta
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 [CREATE USER] Iniciando criação de usuário...');
    console.log('📥 Dados recebidos:', {
      ...req.body,
      password: req.body.password ? '[PRESENTE]' : '[AUSENTE]'
    });

    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    // 1. VERIFICAR SE TABELA EXISTE
    const tableExists = await ensureTableExists();
    if (!tableExists) {
      console.error('❌ Tabela users não encontrada ou inacessível');
      return res.status(500).json({ 
        message: 'Erro de configuração do banco de dados',
        error: 'TABLE_NOT_FOUND',
        suggestion: 'Execute o script de diagnóstico primeiro'
      });
    }

    // 2. VALIDAÇÕES BÁSICAS
    if (!name || !email || !type) {
      console.log('❌ Validação falhou: campos obrigatórios ausentes');
      return res.status(400).json({ 
        message: 'Nome, email e tipo são obrigatórios',
        received: { 
          name: !!name, 
          email: !!email, 
          type: !!type 
        }
      });
    }

    // 3. VALIDAR FORMATO DO EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Formato de email inválido',
        email: email
      });
    }

    // 4. VALIDAR TIPO DE USUÁRIO
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

    // 5. VALIDAR SETOR (se necessário)
    const needsSector = type.startsWith('at-') || 
                       type.startsWith('coordenacao-') || 
                       (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      console.log('❌ Setor obrigatório para tipo:', type);
      return res.status(400).json({ 
        message: 'Setor é obrigatório para esse tipo de usuário',
        type,
        needsSector: true
      });
    }

    // 6. VERIFICAR SE EMAIL JÁ EXISTE
    console.log('🔍 Verificando se email já existe...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erro ao verificar email existente:', checkError);
      return res.status(500).json({ 
        message: 'Erro ao verificar email no banco',
        error: checkError.message,
        code: checkError.code
      });
    }

    if (existingUser) {
      console.log('❌ Email já cadastrado:', email);
      return res.status(400).json({ 
        message: 'Este email já está cadastrado no sistema',
        email: email
      });
    }

    // 7. VALIDAR E HASH DA SENHA
    console.log('🔐 Gerando hash da senha...');
    
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Senha deve ter pelo menos 6 caracteres'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // 8. PREPARAR DADOS PARA INSERÇÃO
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      type: type.trim(),
      sector: needsSector ? (sector?.trim() || null) : null,
      password: hashedPassword,
      hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
      active: true
    };

    // Verificar se hourly_rate é um número válido
    if (hourly_rate && (isNaN(userData.hourly_rate) || userData.hourly_rate < 0)) {
      return res.status(400).json({
        message: 'Valor por hora deve ser um número positivo',
        received: hourly_rate
      });
    }

    console.log('📝 Dados preparados para inserção:', {
      ...userData,
      password: '[HASH_GERADO]'
    });

    // 9. INSERIR USUÁRIO NO BANCO (com métodos de fallback)
    console.log('💾 Inserindo usuário no banco...');
    
    const result = await createUserSafely(userData);

    if (!result.success) {
      const error = result.error;
      
      console.error('❌ Erro detalhado na inserção:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // Tratamento específico de erros comuns
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ 
          message: 'Email já está em uso',
          error: 'DUPLICATE_EMAIL'
        });
      }

      if (error.code === '23514') { // Check violation
        return res.status(400).json({ 
          message: 'Dados inválidos - violação de regra do banco',
          error: 'CONSTRAINT_VIOLATION',
          details: error.details
        });
      }

      if (error.code === '42703') { // Column does not exist
        return res.status(500).json({ 
          message: 'Erro de estrutura do banco - coluna não existe',
          error: 'COLUMN_NOT_FOUND',
          details: error.details,
          suggestion: 'Execute o script de diagnóstico para corrigir a estrutura'
        });
      }

      if (error.code === '42P01') { // Table does not exist
        return res.status(500).json({ 
          message: 'Tabela de usuários não encontrada',
          error: 'TABLE_NOT_FOUND',
          suggestion: 'Execute o script de diagnóstico para criar a tabela'
        });
      }

      return res.status(500).json({ 
        message: 'Erro ao criar usuário no banco de dados',
        error: error.message,
        code: error.code,
        suggestion: 'Verifique os logs do servidor e a configuração do banco'
      });
    }

    const newUser = result.data;

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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
      timestamp: new Date().toISOString(),
      suggestion: 'Tente novamente ou contate o suporte'
    });
  }
});

// ENDPOINT PARA DIAGNÓSTICO RÁPIDO
router.get('/health', authenticateToken, async (req, res) => {
  try {
    console.log('🏥 Verificando saúde do sistema de usuários...');

    const checks = {
      database_connection: false,
      table_exists: false,
      can_read: false,
      can_write: false,
      total_users: 0
    };

    // 1. Testar conexão
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact' });
      
      checks.database_connection = true;
      checks.table_exists = !error || error.code !== '42P01';
      
      if (!error) {
        checks.can_read = true;
        checks.total_users = data[0]?.count || 0;
      }
    } catch (err) {
      console.error('Erro no health check:', err);
    }

    // 2. Testar escrita (apenas se leitura funcionou)
    if (checks.can_read) {
      try {
        const testData = {
          name: 'Test Health Check',
          email: `health-${Date.now()}@test.com`,
          type: 'adm-geral',
          password: 'temp123',
          active: true
        };

        const { data, error } = await supabase
          .from('users')
          .insert(testData)
          .select('id')
          .single();

        if (!error && data) {
          checks.can_write = true;
          // Limpar teste
          await supabase.from('users').delete().eq('id', data.id);
        }
      } catch (err) {
        console.log('Teste de escrita falhou:', err.message);
      }
    }

    const isHealthy = checks.database_connection && 
                     checks.table_exists && 
                     checks.can_read;

    res.status(isHealthy ? 200 : 500).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
      recommendations: isHealthy ? [] : [
        !checks.database_connection && 'Verificar conexão com Supabase',
        !checks.table_exists && 'Executar script de criação de tabelas',
        !checks.can_read && 'Verificar permissões de leitura',
        !checks.can_write && 'Verificar permissões de escrita'
      ].filter(Boolean)
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Erro ao executar health check',
      error: error.message
    });
  }
});

// MANTER endpoints de debug existentes
router.get('/debug/table-structure', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Verificando estrutura da tabela users...');

    const { data: testData, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    const columns = testData && testData.length > 0 
      ? Object.keys(testData[0]) 
      : [];

    res.json({
      message: 'Estrutura da tabela users',
      tableExists: !error || error.code !== '42P01',
      error: error?.message,
      columns,
      sampleData: testData?.[0] ? Object.keys(testData[0]).reduce((acc, key) => {
        acc[key] = typeof testData[0][key];
        return acc;
      }, {}) : null,
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

    const result = await createUserSafely(testUser);

    if (!result.success) {
      return res.status(400).json({
        message: 'Erro ao criar usuário de teste',
        error: result.error.message,
        code: result.error.code,
        details: result.error.details
      });
    }

    res.json({
      message: 'Usuário de teste criado com sucesso',
      user: {
        id: result.data.id,
        name: result.data.name,
        email: result.data.email,
        type: result.data.type
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