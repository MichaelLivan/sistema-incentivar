import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ FUNÇÃO CORRIGIDA para calcular horas com precisão
const calculatePreciseHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) return 0;
  if (startMin >= 60 || endMin >= 60) return 0;
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60; // Para horários overnight
  
  // ✅ RETORNAR VALOR EXATO SEM ARREDONDAMENTO
  return Math.max(0, diffMinutes / 60);
};

// =====================================================
// GET SESSIONS - Listar sessões
// =====================================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, patient_id, at_id } = req.query;

    console.log('🔍 Buscando sessões para:', {
      user_type: req.user.type,
      user_sector: req.user.sector,
      user_id: req.user.id,
      filters: { month, year, patient_id, at_id }
    });

    let query = supabase
      .from('sessions')
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector, parent_email, parent_email2, at_id),
        at:users!sessions_at_id_fkey(id, name, sector, email)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    // ✅ FILTROS POR TIPO DE USUÁRIO
    if (req.user.type === 'pais') {
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .select('email')
        .eq('id', req.user.id)
        .single();

      if (parentError) {
        return res.status(500).json({ message: 'Erro ao buscar dados do responsável' });
      }

      const { data: myChildren, error: patientsError } = await supabase
        .from('patients')
        .select('id')
        .or(`parent_email.eq.${parentUser.email},parent_email2.eq.${parentUser.email}`);

      if (patientsError) {
        return res.status(500).json({ message: 'Erro ao buscar pacientes vinculados' });
      }

      const childrenIds = myChildren.map(child => child.id);
      if (childrenIds.length > 0) {
        query = query.in('patient_id', childrenIds).eq('is_approved', true);
        console.log(`👪 Pais - Buscando sessões de ${childrenIds.length} filhos`);
      } else {
        return res.json([]);
      }
    } else if (req.user.type.startsWith('at-')) {
      // ✅ NOVA LÓGICA: ATs veem suas próprias sessões (onde eles atenderam)
      query = query.eq('at_id', req.user.id);
      console.log(`👨‍⚕️ AT - Buscando sessões onde AT atendeu: ${req.user.id}`);
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      // Para admins setoriais, coordenação, etc.
      const { data: sectorPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('sector', req.user.sector);

      const patientIds = sectorPatients?.map(p => p.id) || [];
      if (patientIds.length > 0) {
        query = query.in('patient_id', patientIds);
        console.log(`🏢 Setor ${req.user.sector} - ${patientIds.length} pacientes`);
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
      console.error('❌ Erro ao buscar sessões:', error);
      return res.status(500).json({ message: 'Erro ao buscar sessões' });
    }

    // ✅ LOG para debug das primeiras sessões
    if (sessions && sessions.length > 0) {
      console.log(`✅ ${sessions.length} sessões encontradas`);
      sessions.slice(0, 2).forEach((session, i) => {
        console.log(`🔍 Sessão ${i + 1}:`, {
          id: session.id.substring(0, 8),
          paciente: session.patient?.name,
          at: session.at?.name,
          horarios: `${session.start_time} - ${session.end_time}`,
          hours_stored: session.hours,
          is_substitution: session.is_substitution
        });
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('❌ Erro interno ao buscar sessões:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =====================================================
// POST SESSIONS - Criar sessão (LÓGICA CORRIGIDA)
// =====================================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, start_time, end_time, date, observations, is_substitution } = req.body;

    console.log('📤 CRIANDO SESSÃO:', {
      patient_id, 
      start_time, 
      end_time, 
      date, 
      is_substitution,
      at_logado: req.user.id,
      at_nome: req.user.name,
      at_setor: req.user.sector
    });

    if (!patient_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'Preencha todos os campos obrigatórios' });
    }

    // ✅ NOVA LÓGICA CORRIGIDA: AT_ID sempre é quem está logado
    const atId = req.user.id;  // SEMPRE o AT que está fazendo o atendimento
    
    let isSubstitutionReal = false;
    let originalATInfo = null;

    if (is_substitution) {
      console.log('🔄 Verificando se é substituição real...');
      
      // Buscar o AT original do paciente
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select(`
          id, name, sector, at_id,
          original_at:users!patients_at_id_fkey(id, name, email)
        `)
        .eq('id', patient_id)
        .single();

      if (patientError) {
        console.error('❌ Erro ao buscar paciente:', patientError);
        return res.status(500).json({ message: 'Erro ao buscar dados do paciente' });
      }

      originalATInfo = patient.original_at;

      console.log('👤 Dados do paciente:', {
        nome: patient.name,
        setor: patient.sector,
        at_original_id: patient.at_id,
        at_original_nome: originalATInfo?.name
      });

      // ✅ REGRA CORRETA: É substituição se o AT logado é diferente do AT do paciente
      if (patient.at_id && patient.at_id !== req.user.id) {
        isSubstitutionReal = true;
        console.log(`✅ SUBSTITUIÇÃO CONFIRMADA: ${req.user.name} substituindo ${originalATInfo?.name}`);
      } else if (!patient.at_id) {
        console.log('ℹ️ Paciente sem AT atribuído - atendimento normal');
        isSubstitutionReal = false;
      } else {
        console.log('ℹ️ AT está atendendo seu próprio paciente - atendimento normal');
        isSubstitutionReal = false;
      }
    }

    // ✅ CALCULAR HORAS COM PRECISÃO
    const hours = calculatePreciseHours(start_time, end_time);
    console.log(`⏰ Horas calculadas: ${hours} (${typeof hours})`);

    if (hours <= 0) {
      return res.status(400).json({ message: 'Hora final deve ser posterior à inicial' });
    }

    // ✅ DADOS PARA INSERÇÃO - LÓGICA TOTALMENTE CORRIGIDA
    const sessionData = {
      patient_id,
      at_id: atId,  // ✅ SEMPRE o AT logado (quem realmente atendeu)
      start_time,
      end_time,
      date,
      hours,
      observations: observations || '',
      is_substitution: isSubstitutionReal,  // ✅ true só se for substituição real
      is_approved: false,
      is_confirmed: false,
      is_launched: false
    };

    console.log('💾 DADOS FINAIS PARA INSERÇÃO:', sessionData);

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector, at_id),
        at:users!sessions_at_id_fkey(id, name, email, sector)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao inserir sessão:', error);
      return res.status(500).json({ 
        message: 'Erro ao cadastrar sessão',
        error: error.message 
      });
    }

    // ✅ LOG DETALHADO DO RESULTADO
    console.log('✅ SESSÃO CRIADA COM SUCESSO:');
    console.log(`   ID: ${newSession.id}`);
    console.log(`   Paciente: ${newSession.patient?.name}`);
    console.log(`   AT que atendeu: ${newSession.at?.name} (ID: ${newSession.at_id})`);
    console.log(`   Horas: ${newSession.hours}`);
    console.log(`   É substituição: ${newSession.is_substitution}`);
    
    if (isSubstitutionReal && originalATInfo) {
      console.log(`   AT original do paciente: ${originalATInfo.name}`);
      console.log(`   🔄 ${newSession.at?.name} substituiu ${originalATInfo.name}`);
    }

    // ✅ RESPOSTA COMPLETA
    res.status(201).json({
      message: 'Sessão cadastrada com sucesso',
      sessionId: newSession.id,
      session: newSession,
      substitutionInfo: isSubstitutionReal ? {
        substituting_at: newSession.at?.name,
        original_at: originalATInfo?.name,
        patient: newSession.patient?.name
      } : null,
      debug: {
        calculated_hours: hours,
        is_substitution: isSubstitutionReal,
        at_who_attended: newSession.at?.name,
        at_id_used: atId
      }
    });

  } catch (error) {
    console.error('❌ Erro interno ao criar sessão:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

// =====================================================
// PUT SESSIONS - Atualizar sessão
// =====================================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, date, observations } = req.body;

    console.log(`📝 Atualizando sessão ${id}:`, { start_time, end_time, date, observations });

    let updateData = {};
    
    // Se horários foram alterados, recalcular horas com precisão
    if (start_time && end_time) {
      const preciseHours = calculatePreciseHours(start_time, end_time);
      
      if (preciseHours <= 0) {
        return res.status(400).json({ 
          message: 'Horário de fim deve ser posterior ao horário de início' 
        });
      }
      
      updateData = {
        start_time,
        end_time,
        hours: preciseHours // ✅ USAR VALOR PRECISO
      };
      
      console.log(`✅ Horas recalculadas: ${preciseHours}`);
    }
    
    if (date) updateData.date = date;
    if (observations !== undefined) updateData.observations = observations;

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(name),
        at:users!sessions_at_id_fkey(name)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar sessão:', error);
      return res.status(500).json({ message: 'Erro ao atualizar sessão' });
    }

    console.log(`✅ Sessão atualizada:`, {
      id: updatedSession.id,
      hours: updatedSession.hours,
      patient: updatedSession.patient?.name,
      at: updatedSession.at?.name
    });

    res.json({
      message: 'Sessão atualizada com sucesso',
      session: updatedSession
    });

  } catch (error) {
    console.error('❌ Erro interno ao atualizar sessão:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =====================================================
// PATCH SESSIONS - Confirmar sessão (pais)
// =====================================================
router.patch('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.type !== 'pais') {
      return res.status(403).json({ message: 'Apenas responsáveis podem confirmar sessões' });
    }

    console.log(`👪 Confirmando sessão ${id} pelo responsável ${req.user.name}`);

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({ 
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(name),
        at:users!sessions_at_id_fkey(name)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao confirmar sessão:', error);
      return res.status(500).json({ message: 'Erro ao confirmar sessão' });
    }

    console.log(`✅ Sessão confirmada pelo responsável:`, {
      session_id: updatedSession.id,
      patient: updatedSession.patient?.name,
      at: updatedSession.at?.name
    });

    res.json({ 
      message: 'Sessão confirmada com sucesso', 
      session: updatedSession 
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =====================================================
// PATCH SESSIONS - Aprovar sessão (admin ou coordenação)
// =====================================================
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const allowedTypes = [
      'adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar',
      'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: 'Apenas administradores ou coordenação podem aprovar sessões' });
    }

    console.log(`👨‍💼 Aprovando sessão ${id} por ${req.user.name} (${req.user.type})`);

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(name),
        at:users!sessions_at_id_fkey(name)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao aprovar sessão:', error);
      return res.status(500).json({ message: 'Erro ao aprovar sessão' });
    }

    console.log(`✅ Sessão aprovada:`, {
      session_id: updatedSession.id,
      patient: updatedSession.patient?.name,
      at: updatedSession.at?.name,
      approved_by: req.user.name
    });

    res.json({ 
      message: 'Sessão aprovada com sucesso', 
      session: updatedSession 
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =====================================================
// PATCH SESSIONS - Lançar sessão (admin)
// =====================================================
router.patch('/:id/launch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const allowedTypes = [
      'adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: 'Apenas administradores podem lançar sessões' });
    }

    console.log(`🚀 Lançando sessão ${id} por ${req.user.name} (${req.user.type})`);

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        is_launched: true,
        launched_at: new Date().toISOString(),
        launched_by: req.user.id
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(name),
        at:users!sessions_at_id_fkey(name)
      `)
      .single();

    if (error) {
      console.error('❌ Erro ao lançar sessão:', error);
      return res.status(500).json({ message: 'Erro ao lançar sessão' });
    }

    console.log(`✅ Sessão lançada:`, {
      session_id: updatedSession.id,
      patient: updatedSession.patient?.name,
      at: updatedSession.at?.name,
      launched_by: req.user.name
    });

    res.json({ 
      message: 'Sessão lançada com sucesso', 
      session: updatedSession 
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =====================================================
// DELETE SESSIONS - Deletar sessão
// =====================================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deletando sessão ${id} por ${req.user.name}`);

    // Buscar dados da sessão antes de deletar
    const { data: existingSession, error: checkError } = await supabase
      .from('sessions')
      .select(`
        id, date, hours, is_substitution,
        patient:patients!sessions_patient_id_fkey(name),
        at:users!sessions_at_id_fkey(name)
      `)
      .eq('id', id)
      .single();

    if (checkError || !existingSession) {
      console.log(`❌ Sessão ${id} não encontrada`);
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    console.log(`🔍 Sessão encontrada:`, {
      id: existingSession.id,
      patient: existingSession.patient?.name,
      at: existingSession.at?.name,
      date: existingSession.date,
      hours: existingSession.hours,
      is_substitution: existingSession.is_substitution
    });

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Erro ao deletar sessão:', deleteError);
      return res.status(500).json({ 
        message: 'Erro ao deletar sessão', 
        error: deleteError.message 
      });
    }

    console.log(`✅ Sessão ${id} deletada com sucesso`);

    res.json({
      message: 'Sessão deletada com sucesso',
      deletedSession: {
        id: existingSession.id,
        patient: existingSession.patient?.name,
        at: existingSession.at?.name,
        date: existingSession.date,
        hours: existingSession.hours,
        is_substitution: existingSession.is_substitution
      }
    });
  } catch (error) {
    console.error('❌ Erro interno ao deletar sessão:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;
