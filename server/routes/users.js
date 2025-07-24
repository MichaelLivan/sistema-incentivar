// routes/users.js - VERSÃO CORRIGIDA PARA ADMIN GERAL
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET USERS - Permitir admin geral ver todos os usuários
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sector, type } = req.query;

    console.log('🔍 [GET USERS] Usuário fazendo requisição:', {
      id: req.user.id,
      name: req.user.name,
      type: req.user.type,
      sector: req.user.sector
    });

    console.log('📋 [GET USERS] Filtros recebidos:', { sector, type });

    // ✅ CORREÇÃO: Permitir admin geral acessar tudo
    if (req.user.type === 'adm-geral') {
      console.log('🔓 [GET USERS] Admin geral - acesso total liberado');
    } else {
      // Segurança para outros tipos de usuário
      if (type === 'at') {
        const allowed = [
          'adm-aba', 'adm-denver', 'adm-escolar', 'adm-grupo',
          'financeiro-pct', 'financeiro-ats',
          'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
        ];
        if (!allowed.includes(req.user.type)) {
          console.log('❌ [GET USERS] Acesso negado para tipo:', req.user.type);
          return res.status(403).json({ message: 'Access denied for this user type' });
        }
      }
    }

    let query = supabase
      .from('users')
      .select('id, email, name, type, sector, active, created_at, hourly_rate')
      .order('name');

    // Aplicar filtros apenas se não for admin geral
    if (req.user.type !== 'adm-geral') {
      if (sector) {
        query = query.eq('sector', sector);
      } else if (req.user.sector) {
        query = query.or(`sector.eq.${req.user.sector},sector.is.null`);
      }
    } else {
      // Admin geral pode filtrar por setor se especificado
      if (sector) {
        query = query.eq('sector', sector);
      }
    }

    if (type === 'at') {
      query = query.like('type', 'at-%');
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ [GET USERS] Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }

    console.log('✅ [GET USERS] Usuários encontrados:', users?.length || 0);
    res.json(users || []);
  } catch (error) {
    console.error('❌ [GET USERS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// CREATE USER - VERSÃO TOTALMENTE CORRIGIDA
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📤 [CREATE USER] Dados recebidos:', req.body);
    console.log('👤 [CREATE USER] Usuário fazendo requisição:', {
      id: req.user.id,
      name: req.user.name,
      type: req.user.type
    });
    
    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    // ✅ VERIFICAÇÃO DE PERMISSÃO PARA CRIAR USUÁRIOS
    const canCreateUsers = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!canCreateUsers.includes(req.user.type)) {
      console.log('❌ [CREATE USER] Usuário sem permissão:', req.user.type);
      return res.status(403).json({ 
        message: 'Você não tem permissão para criar usuários',
        userType: req.user.type 
      });
    }

    // Validações básicas
    if (!name || !email || !type) {
      console.error('❌ [CREATE USER] Dados obrigatórios ausentes:', { 
        name: !!name, 
        email: !!email, 
        type: !!type 
      });
      return res.status(400).json({ message: 'Nome, email e tipo são obrigatórios' });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ [CREATE USER] Email inválido:', email);
      return res.status(400).json({ message: 'Formato de email inválido' });
    }

    // Validar tipo de usuário
    const validTypes = [
      'financeiro-ats', 'financeiro-pct',
      'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
      'pais',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ];

    if (!validTypes.includes(type)) {
      console.error('❌ [CREATE USER] Tipo de usuário inválido:', type);
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    // Verificar se setor é necessário
    const needsSector = type.startsWith('at-') || 
                       type.startsWith('coordenacao-') || 
                       (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      console.error('❌ [CREATE USER] Setor obrigatório para tipo:', type);
      return res.status(400).json({ message: 'Setor é obrigatório para esse tipo de usuário' });
    }

    // ✅ VERIFICAÇÃO MELHORADA DE EMAIL EXISTENTE
    console.log('🔍 [CREATE USER] Verificando se email já existe:', email);
    
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, type, active')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error('❌ [CREATE USER] Erro ao verificar email existente:', checkError);
        return res.status(500).json({ 
          message: 'Erro ao verificar email existente',
          error: checkError.message 
        });
      }

      if (existingUser) {
        console.error('❌ [CREATE USER] Email já cadastrado:', {
          email: email,
          existingId: existingUser.id,
          existingType: existingUser.type,
          existingActive: existingUser.active
        });
        return res.status(409).json({ message: 'Este email já está cadastrado no sistema' });
      }

      console.log('✅ [CREATE USER] Email disponível');

    } catch (emailCheckError) {
      console.error('❌ [CREATE USER] Erro crítico na verificação de email:', emailCheckError);
      return res.status(500).json({ 
        message: 'Erro crítico ao verificar email',
        error: emailCheckError.message 
      });
    }

    // ✅ HASH DA SENHA COM TRATAMENTO DE ERRO
    console.log('🔐 [CREATE USER] Gerando hash da senha...');
    let hashedPassword;
    
    try {
      hashedPassword = await bcrypt.hash(password, 12);
      console.log('✅ [CREATE USER] Hash da senha gerado com sucesso');
    } catch (hashError) {
      console.error('❌ [CREATE USER] Erro ao gerar hash da senha:', hashError);
      return res.status(500).json({ 
        message: 'Erro ao processar senha',
        error: hashError.message 
      });
    }

    // ✅ PREPARAR DADOS PARA INSERÇÃO
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      type,
      sector: needsSector ? sector : null,
      password: hashedPassword,
      hourly_rate: hourly_rate && !isNaN(hourly_rate) ? Number(hourly_rate) : null,
      active: true,
      created_at: new Date().toISOString()
    };

    console.log('💾 [CREATE USER] Dados preparados para inserção:', {
      ...userData,
      password: '[HIDDEN]'
    });

    // ✅ INSERÇÃO NO BANCO COM MELHOR TRATAMENTO DE ERRO
    try {
      console.log('🚀 [CREATE USER] Inserindo no banco de dados...');
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(userData)
        .select('id, name, email, type, sector, active, created_at, hourly_rate')
        .single();

      if (insertError) {
        console.error('❌ [CREATE USER] Erro detalhado ao inserir usuário:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        
        // Tratar erros específicos do Supabase/PostgreSQL
        if (insertError.code === '23505') {
          return res.status(409).json({ message: 'Email já cadastrado (violação de unicidade)' });
        } else if (insertError.code === '23514') {
          return res.status(400).json({ message: 'Dados violam restrições do banco de dados' });
        } else if (insertError.code === '23502') {
          return res.status(400).json({ message: 'Campo obrigatório ausente' });
        }
        
        return res.status(500).json({ 
          message: 'Erro ao criar usuário no banco de dados',
          error: insertError.message,
          code: insertError.code,
          details: insertError.details || insertError.hint
        });
      }

      if (!newUser) {
        console.error('❌ [CREATE USER] Usuário não foi retornado após inserção');
        return res.status(500).json({ message: 'Falha ao criar usuário - resposta vazia do banco' });
      }

      console.log('✅ [CREATE USER] Usuário criado com sucesso:', {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        type: newUser.type,
        sector: newUser.sector
      });

      res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        user: newUser
      });

    } catch (insertCriticalError) {
      console.error('❌ [CREATE USER] Erro crítico na inserção:', insertCriticalError);
      return res.status(500).json({ 
        message: 'Erro crítico ao inserir usuário',
        error: insertCriticalError.message 
      });
    }

  } catch (error) {
    console.error('❌ [CREATE USER] Erro interno geral:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

// UPDATE USER
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, type, sector, active, hourly_rate } = req.body;

    console.log('📝 [UPDATE USER] Atualizando usuário:', id, req.body);
    console.log('👤 [UPDATE USER] Usuário fazendo requisição:', req.user.type);

    // Verificar permissão para atualizar usuários
    const canUpdateUsers = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!canUpdateUsers.includes(req.user.type)) {
      return res.status(403).json({ 
        message: 'Você não tem permissão para atualizar usuários' 
      });
    }

    // Validar se usuário existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, type')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      console.log('❌ [UPDATE USER] Usuário não encontrado:', id);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (type !== undefined) updateData.type = type;
    if (sector !== undefined) updateData.sector = sector;
    if (active !== undefined) updateData.active = active;
    if (hourly_rate !== undefined) {
      updateData.hourly_rate = hourly_rate && !isNaN(hourly_rate) ? Number(hourly_rate) : null;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, type, sector, active, created_at, hourly_rate')
      .single();

    if (updateError) {
      console.error('❌ [UPDATE USER] Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }

    console.log('✅ [UPDATE USER] Usuário atualizado:', updatedUser);

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ [UPDATE USER] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE USER - HARD DELETE COMPLETO (deleta tudo relacionado)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [DELETE USER] Iniciando exclusão completa do usuário:', id);
    console.log('👤 [DELETE USER] Usuário fazendo requisição:', req.user.type);

    // Verificar permissão para deletar usuários
    const canDeleteUsers = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!canDeleteUsers.includes(req.user.type)) {
      return res.status(403).json({ 
        message: 'Você não tem permissão para excluir usuários' 
      });
    }

    // 1. Verificar se o usuário existe e obter dados
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, type, email, sector')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      console.error('❌ [DELETE USER] Usuário não encontrado:', fetchError);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    console.log('🔍 [DELETE USER] Usuário encontrado:', existingUser.name, '- Tipo:', existingUser.type);

    let deletedData = {
      user: existingUser.name,
      type: existingUser.type,
      sessionsDeleted: 0,
      supervisionsDeleted: 0,
      patientsUnlinked: 0
    };

    // 2. SE FOR UM AT, DELETAR TODOS OS DADOS RELACIONADOS
    if (existingUser.type && existingUser.type.startsWith('at-')) {
      console.log('👨‍⚕️ [DELETE USER] Usuário é um AT - iniciando limpeza completa...');

      // 2.1. DELETAR TODAS AS SESSÕES DO AT
      console.log('🗑️ [DELETE USER] Deletando todas as sessões do AT...');
      const { data: deletedSessions, error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (sessionsError) {
        console.error('❌ [DELETE USER] Erro ao deletar sessões:', sessionsError);
        return res.status(500).json({ 
          message: 'Erro ao deletar sessões do AT', 
          error: sessionsError.message 
        });
      }

      deletedData.sessionsDeleted = deletedSessions?.length || 0;
      console.log(`✅ [DELETE USER] ${deletedData.sessionsDeleted} sessões deletadas`);

      // 2.2. DELETAR TODAS AS SUPERVISÕES DO AT
      console.log('🗑️ [DELETE USER] Deletando todas as supervisões do AT...');
      const { data: deletedSupervisions, error: supervisionsError } = await supabase
        .from('supervisions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (supervisionsError) {
        console.error('❌ [DELETE USER] Erro ao deletar supervisões:', supervisionsError);
        return res.status(500).json({ 
          message: 'Erro ao deletar supervisões do AT', 
          error: supervisionsError.message 
        });
      }

      deletedData.supervisionsDeleted = deletedSupervisions?.length || 0;
      console.log(`✅ [DELETE USER] ${deletedData.supervisionsDeleted} supervisões deletadas`);

      // 2.3. DESVINCULAR PACIENTES DO AT (setar at_id como null)
      console.log('🔗 [DELETE USER] Desvinculando pacientes do AT...');
      const { data: unlinkedPatients, error: unlinkError } = await supabase
        .from('patients')
        .update({ at_id: null })
        .eq('at_id', id)
        .select('id, name');

      if (unlinkError) {
        console.error('❌ [DELETE USER] Erro ao desvincular pacientes:', unlinkError);
        return res.status(500).json({ 
          message: 'Erro ao desvincular pacientes do AT', 
          error: unlinkError.message 
        });
      }

      deletedData.patientsUnlinked = unlinkedPatients?.length || 0;
      console.log(`✅ [DELETE USER] ${deletedData.patientsUnlinked} pacientes desvinculados do AT`);

      if (unlinkedPatients && unlinkedPatients.length > 0) {
        console.log('📋 [DELETE USER] Pacientes desvinculados:', unlinkedPatients.map(p => p.name).join(', '));
      }
    }

    // 3. SE FOR PAIS, VERIFICAR SE HÁ PACIENTES VINCULADOS
    if (existingUser.type === 'pais') {
      console.log('👪 [DELETE USER] Usuário é um responsável - verificando pacientes vinculados...');
      
      const { data: linkedPatients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
        .or(`parent_email.eq.${existingUser.email},parent_email2.eq.${existingUser.email}`);

      if (patientsError) {
        console.error('❌ [DELETE USER] Erro ao verificar pacientes vinculados:', patientsError);
        return res.status(500).json({ 
          message: 'Erro ao verificar pacientes vinculados ao responsável' 
        });
      }

      if (linkedPatients && linkedPatients.length > 0) {
        console.log('⚠️ [DELETE USER] Responsável tem pacientes vinculados:', linkedPatients.map(p => p.name));
        return res.status(409).json({
          message: 'Não é possível excluir este responsável. Há pacientes vinculados a ele.',
          linkedPatients: linkedPatients.map(p => p.name),
          suggestion: 'Exclua os pacientes primeiro ou remova este responsável dos pacientes.'
        });
      }
    }

    // 4. DELETAR O USUÁRIO
    console.log('🗑️ [DELETE USER] Deletando o usuário...');
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteUserError) {
      console.error('❌ [DELETE USER] Erro ao deletar usuário:', deleteUserError);
      return res.status(500).json({ 
        message: 'Erro ao deletar usuário', 
        error: deleteUserError.message 
      });
    }

    console.log('✅ [DELETE USER] Usuário deletado permanentemente');

    res.status(200).json({
      success: true,
      message: 'Usuário e todos os dados relacionados foram deletados com sucesso',
      deletedData: deletedData
    });

  } catch (error) {
    console.error('❌ [DELETE USER] Erro interno ao excluir usuário:', error);
    res.status(500).json({
      message: 'Erro interno ao excluir usuário completamente',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

// CHECK IF PARENT EMAIL EXISTS
router.get('/email-exists', authenticateToken, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email é obrigatório' });

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('type', 'pais')
    .maybeSingle();

  if (error) {
    console.error('❌ [EMAIL EXISTS] Erro ao verificar email:', error);
    return res.status(500).json({ message: 'Erro ao verificar e-mail', error: error.message });
  }

  res.json({ exists: !!data });
});

// CHECK IF EMAIL IS AVAILABLE - VERSÃO CORRIGIDA
router.get('/email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    console.log('🔍 [EMAIL AVAILABLE] Verificando disponibilidade do email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('id, type, active')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('❌ [EMAIL AVAILABLE] Erro ao verificar email:', error);
      return res.status(500).json({ error: 'Erro ao verificar e-mail' });
    }

    const isAvailable = !data;
    console.log('✅ [EMAIL AVAILABLE] Email disponível:', isAvailable);
    
    if (data) {
      console.log('📋 [EMAIL AVAILABLE] Email já cadastrado para:', {
        type: data.type,
        active: data.active
      });
    }
    
    res.json({ isAvailable });
  } catch (err) {
    console.error('❌ [EMAIL AVAILABLE] Erro interno:', err);
    res.status(500).json({ error: 'Erro interno ao verificar e-mail' });
  }
});

export default router;