// routes/users.js - VERSÃO ROBUSTA E SIMPLIFICADA
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// MIDDLEWARE PARA LOG DE REQUESTS
router.use((req, res, next) => {
  console.log(`📥 [USERS API] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : 'N/A',
    user: req.user ? { id: req.user.id, type: req.user.type } : 'Not authenticated'
  });
  next();
});

// HELPER: Verificar permissões
const hasUserManagementPermission = (userType) => {
  const allowedTypes = ['adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'];
  return allowedTypes.includes(userType);
};

// HELPER: Resposta padrão de erro
const sendError = (res, status, message, details = null) => {
  console.error(`❌ [USERS API] ${status}: ${message}`, details);
  res.status(status).json({ 
    success: false, 
    message, 
    ...(details && process.env.NODE_ENV === 'development' && { details })
  });
};

// HELPER: Resposta padrão de sucesso
const sendSuccess = (res, message, data = null, status = 200) => {
  console.log(`✅ [USERS API] ${status}: ${message}`, data ? 'Data included' : 'No data');
  res.status(status).json({ 
    success: true, 
    message, 
    ...(data && { data })
  });
};

// GET /users - Listar usuários
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sector, type } = req.query;
    
    console.log('🔍 [GET USERS] Filtros:', { sector, type });
    console.log('👤 [GET USERS] User requesting:', req.user.type);

    // Verificar permissão básica
    if (!hasUserManagementPermission(req.user.type) && req.user.type !== 'financeiro-ats' && req.user.type !== 'financeiro-pct') {
      return sendError(res, 403, 'Acesso negado para listar usuários');
    }

    // Construir query
    let query = supabase
      .from('users')
      .select('id, email, name, type, sector, active, created_at, hourly_rate')
      .order('name');

    // Aplicar filtros
    if (req.user.type !== 'adm-geral') {
      // Usuários não admin-geral veem apenas do seu setor
      if (req.user.sector) {
        query = query.eq('sector', req.user.sector);
      }
    } else {
      // Admin geral pode filtrar por setor se especificado
      if (sector) {
        query = query.eq('sector', sector);
      }
    }

    // Filtro por tipo
    if (type === 'at') {
      query = query.like('type', 'at-%');
    } else if (type) {
      query = query.eq('type', type);
    }

    const { data: users, error } = await query;

    if (error) {
      return sendError(res, 500, 'Erro ao buscar usuários no banco', error);
    }

    console.log(`✅ [GET USERS] ${users?.length || 0} usuários encontrados`);
    res.json(users || []);

  } catch (error) {
    sendError(res, 500, 'Erro interno ao buscar usuários', error.message);
  }
});

// POST /users - Criar usuário
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    // Verificar permissão
    if (!hasUserManagementPermission(req.user.type)) {
      return sendError(res, 403, 'Sem permissão para criar usuários');
    }

    // Validações básicas
    if (!name?.trim()) {
      return sendError(res, 400, 'Nome é obrigatório');
    }
    
    if (!email?.trim()) {
      return sendError(res, 400, 'Email é obrigatório');
    }
    
    if (!type) {
      return sendError(res, 400, 'Tipo de usuário é obrigatório');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 400, 'Formato de email inválido');
    }

    // Validar tipo
    const validTypes = [
      'financeiro-ats', 'financeiro-pct',
      'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
      'pais',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ];

    if (!validTypes.includes(type)) {
      return sendError(res, 400, 'Tipo de usuário inválido');
    }

    // Verificar se setor é necessário
    const needsSector = type.startsWith('at-') || 
                       type.startsWith('coordenacao-') || 
                       (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      return sendError(res, 400, 'Setor é obrigatório para esse tipo de usuário');
    }

    // Verificar se email já existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) {
      return sendError(res, 500, 'Erro ao verificar email existente', checkError);
    }

    if (existingUser) {
      return sendError(res, 409, 'Este email já está cadastrado no sistema');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Preparar dados
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      type,
      password: hashedPassword,
      active: true,
      created_at: new Date().toISOString(),
      ...(needsSector && { sector }),
      ...(hourly_rate && !isNaN(hourly_rate) && { hourly_rate: Number(hourly_rate) })
    };

    // Inserir usuário
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, type, sector, active, created_at, hourly_rate')
      .single();

    if (insertError) {
      console.error('❌ [CREATE USER] Erro detalhado:', insertError);
      
      if (insertError.code === '23505') {
        return sendError(res, 409, 'Email já cadastrado');
      }
      
      return sendError(res, 500, 'Erro ao criar usuário no banco', insertError);
    }

    if (!newUser) {
      return sendError(res, 500, 'Usuário não foi retornado após criação');
    }

    console.log('✅ [CREATE USER] Usuário criado:', newUser.name);
    sendSuccess(res, 'Usuário criado com sucesso', { user: newUser }, 201);

  } catch (error) {
    sendError(res, 500, 'Erro interno ao criar usuário', error.message);
  }
});

// PUT /users/:id - Atualizar usuário
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, type, sector, active, hourly_rate } = req.body;

    // Verificar permissão
    if (!hasUserManagementPermission(req.user.type)) {
      return sendError(res, 403, 'Sem permissão para atualizar usuários');
    }

    if (!id) {
      return sendError(res, 400, 'ID do usuário é obrigatório');
    }

    // Verificar se usuário existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, type, email')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (type !== undefined) updateData.type = type;
    if (sector !== undefined) updateData.sector = sector;
    if (active !== undefined) updateData.active = active;
    if (hourly_rate !== undefined) {
      updateData.hourly_rate = hourly_rate && !isNaN(hourly_rate) ? Number(hourly_rate) : null;
    }

    // Se estiver alterando email, verificar se já existe
    if (email && email !== existingUser.email) {
      const { data: emailExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .neq('id', id)
        .maybeSingle();

      if (emailExists) {
        return sendError(res, 409, 'Este email já está em uso por outro usuário');
      }
    }

    // Atualizar usuário
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, type, sector, active, created_at, hourly_rate')
      .single();

    if (updateError) {
      return sendError(res, 500, 'Erro ao atualizar usuário', updateError);
    }

    console.log('✅ [UPDATE USER] Usuário atualizado:', updatedUser.name);
    sendSuccess(res, 'Usuário atualizado com sucesso', { user: updatedUser });

  } catch (error) {
    sendError(res, 500, 'Erro interno ao atualizar usuário', error.message);
  }
});

// DELETE /users/:id - Excluir usuário
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permissão
    if (!hasUserManagementPermission(req.user.type)) {
      return sendError(res, 403, 'Sem permissão para excluir usuários');
    }

    if (!id) {
      return sendError(res, 400, 'ID do usuário é obrigatório');
    }

    // Verificar se usuário existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, type, email, sector')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    console.log(`🗑️ [DELETE USER] Iniciando exclusão: ${existingUser.name} (${existingUser.type})`);

    let deletedData = {
      user: existingUser.name,
      type: existingUser.type,
      sessionsDeleted: 0,
      supervisionsDeleted: 0,
      patientsUnlinked: 0
    };

    // Se for AT, limpar dados relacionados
    if (existingUser.type?.startsWith('at-')) {
      console.log('👨‍⚕️ [DELETE USER] Limpando dados do AT...');

      // Deletar sessões
      const { data: deletedSessions, error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (sessionsError) {
        return sendError(res, 500, 'Erro ao deletar sessões do AT', sessionsError);
      }

      deletedData.sessionsDeleted = deletedSessions?.length || 0;

      // Deletar supervisões
      const { data: deletedSupervisions, error: supervisionsError } = await supabase
        .from('supervisions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (supervisionsError) {
        return sendError(res, 500, 'Erro ao deletar supervisões do AT', supervisionsError);
      }

      deletedData.supervisionsDeleted = deletedSupervisions?.length || 0;

      // Desvincular pacientes
      const { data: unlinkedPatients, error: unlinkError } = await supabase
        .from('patients')
        .update({ at_id: null })
        .eq('at_id', id)
        .select('id');

      if (unlinkError) {
        return sendError(res, 500, 'Erro ao desvincular pacientes do AT', unlinkError);
      }

      deletedData.patientsUnlinked = unlinkedPatients?.length || 0;
    }

    // Se for responsável, verificar pacientes vinculados
    if (existingUser.type === 'pais') {
      const { data: linkedPatients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
        .or(`parent_email.eq.${existingUser.email},parent_email2.eq.${existingUser.email}`);

      if (patientsError) {
        return sendError(res, 500, 'Erro ao verificar pacientes vinculados', patientsError);
      }

      if (linkedPatients?.length > 0) {
        return sendError(res, 409, 
          'Não é possível excluir este responsável. Há pacientes vinculados a ele.', 
          { linkedPatients: linkedPatients.map(p => p.name) }
        );
      }
    }

    // Excluir usuário
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteUserError) {
      return sendError(res, 500, 'Erro ao excluir usuário', deleteUserError);
    }

    console.log('✅ [DELETE USER] Usuário excluído com sucesso');
    sendSuccess(res, 'Usuário excluído com sucesso', { deletedData });

  } catch (error) {
    sendError(res, 500, 'Erro interno ao excluir usuário', error.message);
  }
});

// GET /users/email/:email - Verificar disponibilidade do email
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return sendError(res, 400, 'Email é obrigatório');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      return sendError(res, 500, 'Erro ao verificar email', error);
    }

    const isAvailable = !data;
    res.json({ isAvailable });

  } catch (error) {
    sendError(res, 500, 'Erro interno ao verificar email', error.message);
  }
});

// GET /users/email-exists - Verificar se email de responsável existe
router.get('/email-exists', authenticateToken, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return sendError(res, 400, 'Email é obrigatório');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('type', 'pais')
      .maybeSingle();

    if (error) {
      return sendError(res, 500, 'Erro ao verificar email', error);
    }

    res.json({ exists: !!data });

  } catch (error) {
    sendError(res, 500, 'Erro interno ao verificar email', error.message);
  }
});

export default router;