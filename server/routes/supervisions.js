import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get supervisions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, at_id } = req.query;
    
    let query = supabase
      .from('supervisions')
      .select(`
        *,
        at:users!supervisions_at_id_fkey(name),
        coordinator:users!supervisions_coordinator_id_fkey(name)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    // Apply filters based on user type
    if (req.user.type.startsWith('coordenacao-')) {
      query = query.eq('coordinator_id', req.user.id);
    } else if (req.user.type.startsWith('at-')) {
      query = query.eq('at_id', req.user.id);
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      query = query.eq('sector', req.user.sector);
    }

    // Additional filters
    if (at_id) {
      query = query.eq('at_id', at_id);
    }

    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: supervisions, error } = await query;

    if (error) {
      console.error('Error fetching supervisions:', error);
      return res.status(500).json({ message: 'Error fetching supervisions' });
    }

    res.json(supervisions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create supervision - CORRIGIDO: Permitir ATs criarem suas próprias supervisões
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { at_id, start_time, end_time, date, observations } = req.body;

    if (!at_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // ✅ CORREÇÃO: Permitir ATs criarem suas próprias supervisões
    // ✅ CORREÇÃO: Permitir coordenadores criarem supervisões para qualquer AT
    // ✅ CORREÇÃO: Permitir admins criarem supervisões
    if (!req.user.type.startsWith('coordenacao-') && 
        !req.user.type.startsWith('adm-') && 
        !req.user.type.startsWith('at-')) {
      return res.status(403).json({ message: 'Only coordinators, admins, or ATs can create supervisions' });
    }

    // Se for um AT, só pode criar supervisão para si mesmo
    if (req.user.type.startsWith('at-') && at_id !== req.user.id) {
      return res.status(403).json({ message: 'ATs can only create supervisions for themselves' });
    }

    // Calculate hours
    const startMinutes = parseInt(start_time.split(':')[0]) * 60 + parseInt(start_time.split(':')[1]);
    const endMinutes = parseInt(end_time.split(':')[0]) * 60 + parseInt(end_time.split(':')[1]);
   let hours = (endMinutes - startMinutes) / 60;
   
   // Arredondar para o múltiplo de 0.5 mais próximo (30 minutos)
   hours = Math.round(hours * 2) / 2;

    if (hours <= 0) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // ✅ CORREÇÃO: Definir coordinator_id baseado no tipo de usuário
    let coordinatorId;
    let sector;
    
    if (req.user.type.startsWith('at-')) {
      // AT criando supervisão para si mesmo
      coordinatorId = req.user.id; // O próprio AT é o "coordenador" neste caso
      sector = req.user.sector;
      
      console.log(`✅ AT ${req.user.name} criando supervisão para si mesmo`);
    } else if (req.user.type.startsWith('coordenacao-')) {
      // Coordenador criando supervisão
      coordinatorId = req.user.id;
      sector = req.user.sector;
      
      console.log(`✅ Coordenador ${req.user.name} criando supervisão para AT ${at_id}`);
    } else {
      // Admin criando supervisão
      coordinatorId = req.user.id;
      sector = req.user.sector;
      
      console.log(`✅ Admin ${req.user.name} criando supervisão`);
    }

    // Insert supervision
    const { data: newSupervision, error } = await supabase
      .from('supervisions')
      .insert({
        at_id,
        coordinator_id: coordinatorId,
        start_time,
        end_time,
        date,
        hours,
        sector: sector,
        observations: observations || ''
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar supervisão:', error);
      return res.status(500).json({ 
        message: 'Error creating supervision', 
        error: error.message,
        details: error.details || 'No additional details'
      });
    }

    console.log('✅ Supervisão criada com sucesso:', {
      id: newSupervision.id,
      at_id: newSupervision.at_id,
      coordinator_id: newSupervision.coordinator_id,
      hours: newSupervision.hours,
      sector: newSupervision.sector,
      created_by: req.user.name
    });

    res.status(201).json({
      message: 'Supervision created successfully',
      supervisionId: newSupervision.id,
      supervision: newSupervision
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete supervision
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Tentando deletar supervisão:', id);

    // Check if supervision exists and get details
    const { data: existingSupervision, error: checkError } = await supabase
      .from('supervisions')
      .select('id, date, hours')
      .eq('id', id)
      .single();

    if (checkError || !existingSupervision) {
      console.error('❌ Supervisão não encontrada:', checkError);
      return res.status(404).json({ message: 'Supervision not found' });
    }

    console.log('🔍 Supervisão encontrada:', existingSupervision);

    // HARD DELETE - Remove permanently from database
    const { error: deleteError } = await supabase
      .from('supervisions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Erro ao deletar supervisão:', deleteError);
      return res.status(500).json({ message: 'Error deleting supervision', error: deleteError.message });
    }

    console.log('✅ Supervisão deletada permanentemente');
    res.json({ 
      message: 'Supervision deleted successfully',
      deletedSupervision: {
        id: existingSupervision.id,
        date: existingSupervision.date,
        hours: existingSupervision.hours
      }
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Adicionar essas rotas no final do arquivo, antes do "export default router;"

// Get supervision rates
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    // Only financeiro-ats can access supervision rates
    if (req.user.type !== 'financeiro-ats') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { data: rates, error } = await supabase
      .from('supervision_rates')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching supervision rates:', error);
      return res.status(500).json({ message: 'Error fetching supervision rates' });
    }

    // If no rates found, return default values
    if (!rates) {
      const defaultRates = {
        aba: 35,
        denver: 35,
        grupo: 35,
        escolar: 35
      };
      return res.json(defaultRates);
    }

    res.json({
      aba: rates.aba || 35,
      denver: rates.denver || 35,
      grupo: rates.grupo || 35,
      escolar: rates.escolar || 35
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Save supervision rates
router.post('/rates', authenticateToken, async (req, res) => {
  try {
    const { aba, denver, grupo, escolar } = req.body;

    // Only financeiro-ats can save supervision rates
    if (req.user.type !== 'financeiro-ats') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate input
    if (!aba || !denver || !grupo || !escolar) {
      return res.status(400).json({ message: 'All rate fields are required' });
    }

    if (isNaN(aba) || isNaN(denver) || isNaN(grupo) || isNaN(escolar)) {
      return res.status(400).json({ message: 'All rates must be valid numbers' });
    }

    // Check if rates already exist
    const { data: existingRates, error: checkError } = await supabase
      .from('supervision_rates')
      .select('id')
      .single();

    let result;
    if (existingRates) {
      // Update existing rates
      const { data, error } = await supabase
        .from('supervision_rates')
        .update({
          aba: Number(aba),
          denver: Number(denver),
          grupo: Number(grupo),
          escolar: Number(escolar),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRates.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Insert new rates
      const { data, error } = await supabase
        .from('supervision_rates')
        .insert({
          aba: Number(aba),
          denver: Number(denver),
          grupo: Number(grupo),
          escolar: Number(escolar)
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving supervision rates:', result.error);
      return res.status(500).json({ message: 'Error saving supervision rates' });
    }

    console.log('✅ Supervision rates saved successfully:', result.data);
    res.json({
      message: 'Supervision rates saved successfully',
      rates: {
        aba: Number(aba),
        denver: Number(denver),
        grupo: Number(grupo),
        escolar: Number(escolar)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
