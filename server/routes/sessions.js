import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar sessões
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, patient_id } = req.query;

    let query = supabase
      .from('sessions')
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector, parent_email, parent_email2),
        at:users!sessions_at_id_fkey(id, name, sector)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

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
      } else {
        return res.json([]);
      }
    } else if (req.user.type.startsWith('at-')) {
      query = query.eq('at_id', req.user.id);
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      const { data: sectorPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('sector', req.user.sector);

      const patientIds = sectorPatients?.map(p => p.id) || [];
      if (patientIds.length > 0) {
        query = query.in('patient_id', patientIds);
      }
    }

    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Erro ao buscar sessões' });
    }

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar sessão
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patient_id, start_time, end_time, date, observations, is_substitution } = req.body;

    if (!patient_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'Preencha todos os campos obrigatórios' });
    }

    const startMinutes = parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]);
    const endMinutes = parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]);
    let hours = (endMinutes - startMinutes) / 60;
    hours = Math.round(hours * 2) / 2;

    if (hours <= 0) {
      return res.status(400).json({ message: 'Hora final deve ser posterior à inicial' });
    }

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        patient_id,
        at_id: req.user.id,
        start_time,
        end_time,
        date,
        hours,
        observations: observations || '',
        is_substitution: is_substitution || false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erro ao cadastrar sessão' });
    }

    res.status(201).json({
      message: 'Sessão cadastrada com sucesso',
      sessionId: newSession.id
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Confirmar sessão (pais)
router.patch('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.type !== 'pais') {
      return res.status(403).json({ message: 'Apenas responsáveis podem confirmar sessões' });
    }

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({ 
        is_confirmed: true,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erro ao confirmar sessão' });
    }

    res.json({ message: 'Sessão confirmada com sucesso', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Aprovar sessão (admin ou coordenação)
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

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erro ao aprovar sessão' });
    }

    res.json({ message: 'Sessão aprovada com sucesso', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Lançar sessão (admin)
router.patch('/:id/launch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const allowedTypes = [
      'adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: 'Apenas administradores podem lançar sessões' });
    }

    const { data: updatedSession, error } = await supabase
      .from('sessions')
      .update({
        is_launched: true,
        launched_at: new Date().toISOString(),
        launched_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Erro ao lançar sessão' });
    }

    res.json({ message: 'Sessão lançada com sucesso', session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Deletar sessão
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingSession, error: checkError } = await supabase
      .from('sessions')
      .select('id, date, hours')
      .eq('id', id)
      .single();

    if (checkError || !existingSession) {
      return res.status(404).json({ message: 'Sessão não encontrada' });
    }

    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ message: 'Erro ao deletar sessão', error: deleteError.message });
    }

    res.json({
      message: 'Sessão deletada com sucesso',
      deletedSession: {
        id: existingSession.id,
        date: existingSession.date,
        hours: existingSession.hours
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default router;
