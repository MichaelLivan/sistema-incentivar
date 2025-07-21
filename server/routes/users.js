// routes/users.js
import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js'; // authorize será usado por rota

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
  .select('id, email, name, type, sector, active, created_at, hourly_rate') // ✅ Adicionar hourly_rate
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
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro ao buscar usuários' });
    }

    res.json(users);
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// CREATE USER
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, type, sector, hourly_rate, password = '123456' } = req.body;

    if (!name || !email || !type) {
      return res.status(400).json({ message: 'Name, email and type are required' });
    }

    const validTypes = [
      'financeiro-ats', 'financeiro-pct',
      'at-aba', 'at-denver', 'at-grupo', 'at-escolar',
      'pais',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar', 'adm-geral'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Tipo de usuário inválido' });
    }

    const needsSector =
      type.startsWith('at-') ||
      type.startsWith('coordenacao-') ||
      (type.startsWith('adm-') && type !== 'adm-geral');

    if (needsSector && !sector) {
      return res.status(400).json({ message: 'Setor é obrigatório para esse tipo' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

   const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        type,
        sector: needsSector ? sector : null,
        password: hashedPassword,
        hourly_rate: hourly_rate || null // ✅ Adicionar hourly_rate
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({ message: 'Erro ao criar usuário' });
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      userId: newUser.id
    });
  } catch (error) {
    console.error('Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// UPDATE USER
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, type, sector, active, hourly_rate } = req.body;

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ 
        name, 
        email, 
        type, 
        sector, 
        active,
        hourly_rate: hourly_rate !== undefined ? hourly_rate : undefined // ✅ Adicionar hourly_rate
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }

    res.json({
      message: 'Usuário atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro interno:', error);
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
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ message: 'Erro ao verificar e-mail', error });
  }

  res.json({ exists: !!data });
});

// CHECK IF PARENT EMAIL IS AVAILABLE
router.get('/email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('type', 'pais')
      .maybeSingle();

    if (error) throw error;

    res.json({ isAvailable: !data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar e-mail de responsável' });
  }
});

export default router;