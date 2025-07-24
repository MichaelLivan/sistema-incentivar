// routes/users.js
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET USERS (atualizado para permitir acesso de financeiro-pct)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sector, type } = req.query;

    // Segurança extra: só permite listar ATs se for adm ou financeiro-pct
    if (type === 'at') {
      const allowed = [
        'adm-geral', 'adm-aba', 'adm-denver', 'adm-escolar', 'adm-grupo',
        'financeiro-pct', 'financeiro-ats',
        'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      ];
      if (!allowed.includes(req.user.type)) {
        return res.status(403).json({ message: 'Access denied for this user type' });
      }
    }

    let query = supabase
      .from('users')
      .select('id, email, name, type, sector, active, created_at, hourly_rate')
      .order('name');

    if (sector) {
      query = query.eq('sector', sector);
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      query = query.or(`sector.eq.${req.user.sector},sector.is.null`);
    }

    if (type === 'at') {
      query = query.like('type', 'at-%');
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
    }

    console.log('✅ Usuários encontrados:', users?.length || 0);
    res.json(users || []);
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
});

// CREATE USER - VERSÃO CORRIGIDA
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📤 Dados recebidos para criar usuário:', req.body);
    
    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    // Validações básicas
    if (!name || !email || !type) {
      console.error('❌ Dados obrigatórios ausentes:', { name: !!name, email: !!email, type: !!type });
      return res.status(400).json({ message: 'Nome, email e tipo são obrigatórios' });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Email inválido:', email);
      return res.status(400).json({ message: 'Email inválido' });
    }

    const validTypes = [
      'financeiro-ats', 'financeiro-pct',
      'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
      'pais',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ];

    if (!validTypes.includes(type)) {
      console.error('❌ Tipo de usuário inválido:', type);
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    // Verificar se setor é necessário
    const needsSector = type.startsWith('at-') || 
                       type.startsWith('coordenacao-') || 
                       (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      console.error('❌ Setor obrigatório para tipo:', type);
      return res.status(400).json({ message: 'Setor é obrigatório para esse tipo de usuário' });
    }

    // Verificar se email já existe
    console.log('🔍 Verificando se email já existe:', email);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erro ao verificar email existente:', checkError);
      return res.status(500).json({ message: 'Erro ao verificar email existente' });
    }

    if (existingUser) {
      console.error('❌ Email já cadastrado:', email);
      return res.status(409).json({ message: 'Email já cadastrado no sistema' });
    }

    // Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Preparar dados para inserir
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

    console.log('💾 Inserindo usuário no banco com dados:', {
      ...userData,
      password: '[HIDDEN]'
    });

    // Inserir no banco
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, type, sector, active, created_at, hourly_rate')
      .single();

    if (insertError) {
      console.error('❌ Erro detalhado ao inserir usuário:', insertError);
      
      // Tratar erros específicos
      if (insertError.code === '23505') {
        return res.status(409).json({ message: 'Email já cadastrado' });
      }
      
      return res.status(500).json({ 
        message: 'Erro ao criar usuário no banco de dados',
        error: insertError.message,
        details: insertError.details || insertError.hint
      });
    }

    if (!newUser) {
      console.error('❌ Usuário não foi criado - resposta vazia');
      return res.status(500).json({ message: 'Falha ao criar usuário - resposta vazia' });
    }

    console.log('✅ Usuário criado com sucesso:', newUser);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: newUser
    });

  } catch (error) {
    console.error('❌ Erro interno ao criar usuário:', error);
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

    console.log('📝 Atualizando usuário:', id, req.body);

    // Validar se usuário existe
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
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
      console.error('❌ Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }

    console.log('✅ Usuário atualizado:', updatedUser);

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE USER - HARD DELETE COMPLETO (deleta tudo relacionado)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Iniciando exclusão completa do usuário:', id);

    // 1. Verificar se o usuário existe e obter dados
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, name, type, email, sector')
      .eq('id', id)
      .single();

    if (fetchError || !existingUser) {
      console.error('❌ Usuário não encontrado:', fetchError);
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    console.log('🔍 Usuário encontrado:', existingUser.name, '- Tipo:', existingUser.type);

    let deletedData = {
      user: existingUser.name,
      type: existingUser.type,
      sessionsDeleted: 0,
      supervisionsDeleted: 0,
      patientsUnlinked: 0
    };

    // 2. SE FOR UM AT, DELETAR TODOS OS DADOS RELACIONADOS
    if (existingUser.type && existingUser.type.startsWith('at-')) {
      console.log('👨‍⚕️ Usuário é um AT - iniciando limpeza completa...');

      // 2.1. DELETAR TODAS AS SESSÕES DO AT
      console.log('🗑️ Deletando todas as sessões do AT...');
      const { data: deletedSessions, error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (sessionsError) {
        console.error('❌ Erro ao deletar sessões:', sessionsError);
        return res.status(500).json({ 
          message: 'Erro ao deletar sessões do AT', 
          error: sessionsError.message 
        });
      }

      deletedData.sessionsDeleted = deletedSessions?.length || 0;
      console.log(`✅ ${deletedData.sessionsDeleted} sessões deletadas`);

      // 2.2. DELETAR TODAS AS SUPERVISÕES DO AT
      console.log('🗑️ Deletando todas as supervisões do AT...');
      const { data: deletedSupervisions, error: supervisionsError } = await supabase
        .from('supervisions')
        .delete()
        .eq('at_id', id)
        .select('id');

      if (supervisionsError) {
        console.error('❌ Erro ao deletar supervisões:', supervisionsError);
        return res.status(500).json({ 
          message: 'Erro ao deletar supervisões do AT', 
          error: supervisionsError.message 
        });
      }

      deletedData.supervisionsDeleted = deletedSupervisions?.length || 0;
      console.log(`✅ ${deletedData.supervisionsDeleted} supervisões deletadas`);

      // 2.3. DESVINCULAR PACIENTES DO AT (setar at_id como null)
      console.log('🔗 Desvinculando pacientes do AT...');
      const { data: unlinkedPatients, error: unlinkError } = await supabase
        .from('patients')
        .update({ at_id: null })
        .eq('at_id', id)
        .select('id, name');

      if (unlinkError) {
        console.error('❌ Erro ao desvincular pacientes:', unlinkError);
        return res.status(500).json({ 
          message: 'Erro ao desvincular pacientes do AT', 
          error: unlinkError.message 
        });
      }

      deletedData.patientsUnlinked = unlinkedPatients?.length || 0;
      console.log(`✅ ${deletedData.patientsUnlinked} pacientes desvinculados do AT`);

      if (unlinkedPatients && unlinkedPatients.length > 0) {
        console.log('📋 Pacientes desvinculados:', unlinkedPatients.map(p => p.name).join(', '));
      }
    }

    // 3. SE FOR PAIS, VERIFICAR SE HÁ PACIENTES VINCULADOS
    if (existingUser.type === 'pais') {
      console.log('👪 Usuário é um responsável - verificando pacientes vinculados...');
      
      const { data: linkedPatients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name')
        .or(`parent_email.eq.${existingUser.email},parent_email2.eq.${existingUser.email}`);

      if (patientsError) {
        console.error('❌ Erro ao verificar pacientes vinculados:', patientsError);
        return res.status(500).json({ 
          message: 'Erro ao verificar pacientes vinculados ao responsável' 
        });
      }

      if (linkedPatients && linkedPatients.length > 0) {
        console.log('⚠️ Responsável tem pacientes vinculados:', linkedPatients.map(p => p.name));
        return res.status(409).json({
          message: 'Não é possível excluir este responsável. Há pacientes vinculados a ele.',
          linkedPatients: linkedPatients.map(p => p.name),
          suggestion: 'Exclua os pacientes primeiro ou remova este responsável dos pacientes.'
        });
      }
    }

    // 4. DELETAR O USUÁRIO
    console.log('🗑️ Deletando o usuário...');
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteUserError) {
      console.error('❌ Erro ao deletar usuário:', deleteUserError);
      return res.status(500).json({ 
        message: 'Erro ao deletar usuário', 
        error: deleteUserError.message 
      });
    }

    console.log('✅ Usuário deletado permanentemente');

    res.status(200).json({
      success: true,
      message: 'Usuário e todos os dados relacionados foram deletados com sucesso',
      deletedData: deletedData
    });

  } catch (error) {
    console.error('❌ Erro interno ao excluir usuário:', error);
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
    console.error('❌ Erro ao verificar email:', error);
    return res.status(500).json({ message: 'Erro ao verificar e-mail', error: error.message });
  }

  res.json({ exists: !!data });
});

// CHECK IF EMAIL IS AVAILABLE
router.get('/email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    console.log('🔍 Verificando disponibilidade do email:', email);
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao verificar email:', error);
      return res.status(500).json({ error: 'Erro ao verificar e-mail' });
    }

    const isAvailable = !data;
    console.log('✅ Email disponível:', isAvailable);
    
    res.json({ isAvailable });
  } catch (err) {
    console.error('❌ Erro interno:', err);
    res.status(500).json({ error: 'Erro interno ao verificar e-mail' });
  }
});

export default router;