// ✅ ARQUIVO SESSIONS.JS CORRIGIDO - ROTAS PARA SESSÕES/ATENDIMENTOS
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ LISTAR SESSÕES
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, patient_id, at_id } = req.query;

    console.log('🔍 [SESSIONS] Carregando sessões para usuário:', req.user.type);

    let query = supabase
      .from('sessions')
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector, parent_email, parent_email2),
        at:users!sessions_at_id_fkey(id, name, sector)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    // ✅ FILTROS POR TIPO DE USUÁRIO
    if (req.user.type === 'pais') {
      // Pais veem apenas sessões dos seus filhos
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .select('email')
        .eq('id', req.user.id)
        .single();

      if (parentError) {
        return res.status(500).json({ message: 'Erro ao buscar dados do responsável' });
      }

      const { data: myPatients, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .or(`parent_email.ilike.${parentUser.email},parent_email2.ilike.${parentUser.email}`);

      if (patientsError) {
        return res.status(500).json({ message: 'Erro ao buscar pacientes' });
      }

      const patientIds = myPatients.map(p => p.id);
      if (patientIds.length === 0) {
        return res.json([]);
      }

      query = query.in('patient_id', patientIds);

    } else if (req.user.type.startsWith('at-')) {
      // ATs veem apenas suas próprias sessões
      query = query.eq('at_id', req.user.id);

    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      // Usuários setoriais veem sessões do seu setor
      const { data: sectorPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('sector', req.user.sector);

      const patientIds = sectorPatients?.map(p => p.id) || [];
      if (patientIds.length > 0) {
        query = query.in('patient_id', patientIds);
      }
    }

    // ✅ FILTROS ADICIONAIS
    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    if (at_id) {
      query = query.eq('at_id', at_id);
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('❌ [SESSIONS] Erro ao buscar sessões:', error);
      return res.status(500).json({ message: 'Erro ao buscar sessões' });
    }

    console.log(`✅ [SESSIONS] ${sessions?.length || 0} sessões encontradas`);
    res.json(sessions || []);

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao buscar sessões' });
  }
});

// ✅ CRIAR SESSÃO/ATENDIMENTO
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, start_time, end_time, date, observations, is_substitution } = req.body;

    console.log('📤 [SESSIONS] Criando sessão:', {
      patient_id,
      start_time,
      end_time,
      date,
      user: req.user.type,
      is_substitution
    });

    // ✅ VALIDAÇÕES
    if (!patient_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // ✅ VERIFICAR PERMISSÕES
    if (!req.user.type.startsWith('at-')) {
      return res.status(403).json({ message: 'Apenas ATs podem criar sessões' });
    }

    // ✅ CALCULAR HORAS
    const calculateHours = (start, end) => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return Math.max(0, (endMinutes - startMinutes) / 60);
    };

    const hours = calculateHours(start_time, end_time);

    if (hours <= 0) {
      return res.status(400).json({ message: 'Horário de fim deve ser posterior ao horário de início' });
    }

    // ✅ VERIFICAR SE PACIENTE EXISTE
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, sector, at_id')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // ✅ VERIFICAR PERMISSÃO PARA ATENDER ESTE PACIENTE
    if (!is_substitution && patient.at_id !== req.user.id) {
      return res.status(403).json({ message: 'Você não é o AT responsável por este paciente' });
    }

    // ✅ PARA SUBSTITUIÇÃO, VERIFICAR SE É DO MESMO SETOR
    if (is_substitution && patient.sector !== req.user.sector) {
      return res.status(403).json({ message: 'Substituições só são permitidas dentro do mesmo setor' });
    }

    // ✅ VERIFICAR DUPLICATAS
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('patient_id', patient_id)
      .eq('at_id', req.user.id)
      .eq('date', date)
      .eq('start_time', start_time)
      .eq('end_time', end_time)
      .maybeSingle();

    if (existingSession) {
      return res.status(409).json({ message: 'Já existe uma sessão idêntica registrada' });
    }

    // ✅ INSERIR SESSÃO
    const sessionData = {
      patient_id,
      at_id: req.user.id,
      start_time,
      end_time,
      date,
      hours,
      observations: observations || '',
      is_substitution: !!is_substitution,
      is_confirmed: false,
      is_approved: false,
      is_launched: false,
      created_at: new Date().toISOString()
    };

    const { data: newSession, error: insertError } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(name, sector),
        at:users!sessions_at_id_fkey(name, sector)
      `)
      .single();

    if (insertError) {
      console.error('❌ [SESSIONS] Erro ao inserir sessão:', insertError);
      return res.status(500).json({ message: 'Erro ao criar sessão', error: insertError.message });
    }

    console.log('✅ [SESSIONS] Sessão criada com sucesso:', newSession.id);

    res.status(201).json({
      message: 'Atendimento registrado com sucesso',
      session: newSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno ao criar sessão:', error);
    res.status(500).json({ message: 'Erro interno ao criar sessão' });
  }
});

// ✅ CONFIRMAR SESSÃO (RECEPÇÃO)
router.patch('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('✅ [SESSIONS] Confirmando sessão:', id, 'por:', req.user.type);

    // ✅ VERIFICAR PERMISSÃO
    const allowedTypes = ['adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'];
    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: 'Apenas administradores podem confirmar sessões' });
    }

    // ✅ VERIFICAR SE SESSÃO EXISTE
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    if (session.is_confirmed) {
      return res.status(400).json({ message: 'Sessão já foi confirmada' });
    }

    // ✅ CONFIRMAR SESSÃO
    const { data: confirmedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ 
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [SESSIONS] Erro ao confirmar sessão:', updateError);
      return res.status(500).json({ message: 'Erro ao confirmar sessão' });
    }

    console.log('✅ [SESSIONS] Sessão confirmada com sucesso');
    res.json({
      message: 'Sessão confirmada com sucesso',
      session: confirmedSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao confirmar sessão' });
  }
});

// ✅ APROVAR SESSÃO
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    if (!session.is_confirmed) {
      return res.status(400).json({ message: 'Sessão deve ser confirmada antes de ser aprovada' });
    }

    const { data: approvedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ 
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Erro ao aprovar sessão' });
    }

    res.json({
      message: 'Sessão aprovada com sucesso',
      session: approvedSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao aprovar sessão' });
  }
});

// ✅ LANÇAR SESSÃO
router.patch('/:id/launch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    if (!session.is_approved) {
      return res.status(400).json({ message: 'Sessão deve ser aprovada antes de ser lançada' });
    }

    const { data: launchedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ 
        is_launched: true,
        launched_at: new Date().toISOString(),
        launched_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ message: 'Erro ao lançar sessão' });
    }

    res.json({
      message: 'Sessão lançada com sucesso',
      session: launchedSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao lançar sessão' });
  }
});

// ✅ EXCLUIR SESSÃO
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [SESSIONS] Excluindo sessão:', id);

    // ✅ VERIFICAR SE SESSÃO EXISTE
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    // ✅ VERIFICAR PERMISSÃO
    const canDelete = req.user.type.startsWith('adm-') || 
                     req.user.type.startsWith('financeiro-') ||
                     (req.user.type.startsWith('at-') && session.at_id === req.user.id && !session.is_confirmed);

    if (!canDelete) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir esta sessão' });
    }

    // ✅ EXCLUIR SESSÃO
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [SESSIONS] Erro ao excluir:', deleteError);
      return res.status(500).json({ message: 'Erro ao excluir sessão' });
    }

    console.log('✅ [SESSIONS] Sessão excluída com sucesso');
    res.json({ message: 'Sessão excluída com sucesso' });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao excluir sessão' });
  }
});

export default router;