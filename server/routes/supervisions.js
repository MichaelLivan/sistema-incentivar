// ✅ ARQUIVO SUPERVISIONS.JS CORRIGIDO - ROTAS PARA SUPERVISÕES
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ✅ LISTAR SUPERVISÕES
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, at_id } = req.query;
    
    console.log('🔍 [SUPERVISIONS] Carregando supervisões para usuário:', req.user.type);
    
    let query = supabase
      .from('supervisions')
      .select(`
        *,
        at:users!supervisions_at_id_fkey(id, name, sector),
        coordinator:users!supervisions_coordinator_id_fkey(id, name, sector)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    // ✅ FILTROS POR TIPO DE USUÁRIO
    if (req.user.type.startsWith('coordenacao-')) {
      // Coordenadores veem supervisões que criaram
      query = query.eq('coordinator_id', req.user.id);
    } else if (req.user.type.startsWith('at-')) {
      // ATs veem suas próprias supervisões
      query = query.eq('at_id', req.user.id);
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      // Usuários setoriais veem supervisões do seu setor
      query = query.eq('sector', req.user.sector);
    }
    // Admin geral vê todas

    // ✅ FILTROS ADICIONAIS
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
      console.error('❌ [SUPERVISIONS] Erro ao buscar supervisões:', error);
      return res.status(500).json({ message: 'Erro ao buscar supervisões' });
    }

    console.log(`✅ [SUPERVISIONS] ${supervisions?.length || 0} supervisões encontradas`);
    res.json(supervisions || []);

  } catch (error) {
    console.error('❌ [SUPERVISIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao buscar supervisões' });
  }
});

// ✅ CRIAR SUPERVISÃO
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { at_id, start_time, end_time, date, observations } = req.body;

    console.log('📤 [SUPERVISIONS] Criando supervisão:', {
      at_id,
      start_time,
      end_time,
      date,
      user: req.user.type,
      sector: req.user.sector
    });

    // ✅ VALIDAÇÕES
    if (!at_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // ✅ VERIFICAR PERMISSÕES
    // ATs podem criar supervisões para si mesmos
    // Coordenadores podem criar supervisões para qualquer AT
    // Admins podem criar supervisões
    if (!req.user.type.startsWith('coordenacao-') && 
        !req.user.type.startsWith('adm-') && 
        !req.user.type.startsWith('at-')) {
      return res.status(403).json({ message: 'Você não tem permissão para criar supervisões' });
    }

    // ✅ SE FOR UM AT, SÓ PODE CRIAR SUPERVISÃO PARA SI MESMO
    if (req.user.type.startsWith('at-') && at_id !== req.user.id) {
      return res.status(403).json({ message: 'ATs só podem criar supervisões para si mesmos' });
    }

    // ✅ VERIFICAR SE O AT EXISTE
    const { data: atUser, error: atError } = await supabase
      .from('users')
      .select('id, name, sector, type')
      .eq('id', at_id)
      .single();

    if (atError || !atUser) {
      return res.status(404).json({ message: 'AT não encontrado' });
    }

    if (!atUser.type.startsWith('at-')) {
      return res.status(400).json({ message: 'Usuário selecionado não é um AT' });
    }

    // ✅ CALCULAR HORAS
    const calculateHours = (start, end) => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const diffMinutes = endMinutes - startMinutes;
      return Math.round((Math.max(0, diffMinutes) / 60) * 2) / 2; // Arredondar para 0.5
    };

    const hours = calculateHours(start_time, end_time);

    if (hours <= 0) {
      return res.status(400).json({ message: 'Horário de fim deve ser posterior ao horário de início' });
    }

    // ✅ VERIFICAR DUPLICATAS
    const { data: existingSupervision } = await supabase
      .from('supervisions')
      .select('id')
      .eq('at_id', at_id)
      .eq('date', date)
      .eq('start_time', start_time)
      .eq('end_time', end_time)
      .maybeSingle();

    if (existingSupervision) {
      return res.status(409).json({ message: 'Já existe uma supervisão idêntica registrada' });
    }

    // ✅ DETERMINAR COORDINATOR_ID E SECTOR
    let coordinatorId;
    let sector;
    
    if (req.user.type.startsWith('at-')) {
      // AT criando supervisão para si mesmo
      coordinatorId = req.user.id;
      sector = req.user.sector;
    } else if (req.user.type.startsWith('coordenacao-')) {
      // Coordenador criando supervisão
      coordinatorId = req.user.id;
      sector = req.user.sector;
    } else {
      // Admin criando supervisão
      coordinatorId = req.user.id;
      sector = atUser.sector; // Usar setor do AT
    }

    // ✅ INSERIR SUPERVISÃO
    const supervisionData = {
      at_id,
      coordinator_id: coordinatorId,
      start_time,
      end_time,
      date,
      hours,
      sector: sector,
      observations: observations || '',
      created_at: new Date().toISOString()
    };

    const { data: newSupervision, error: insertError } = await supabase
      .from('supervisions')
      .insert(supervisionData)
      .select(`
        *,
        at:users!supervisions_at_id_fkey(name, sector),
        coordinator:users!supervisions_coordinator_id_fkey(name, sector)
      `)
      .single();

    if (insertError) {
      console.error('❌ [SUPERVISIONS] Erro ao inserir supervisão:', insertError);
      return res.status(500).json({ 
        message: 'Erro ao criar supervisão', 
        error: insertError.message,
        details: insertError.details || 'Detalhes não disponíveis'
      });
    }

    console.log('✅ [SUPERVISIONS] Supervisão criada com sucesso:', {
      id: newSupervision.id,
      at_id: newSupervision.at_id,
      coordinator_id: newSupervision.coordinator_id,
      hours: newSupervision.hours,
      sector: newSupervision.sector,
      created_by: req.user.name
    });

    res.status(201).json({
      message: 'Supervisão criada com sucesso',
      supervisionId: newSupervision.id,
      supervision: newSupervision
    });

  } catch (error) {
    console.error('❌ [SUPERVISIONS] Erro interno ao criar supervisão:', error);
    res.status(500).json({ 
      message: 'Erro interno ao criar supervisão',
      error: error.message
    });
  }
});

// ✅ EXCLUIR SUPERVISÃO
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ [SUPERVISIONS] Excluindo supervisão:', id);

    // ✅ VERIFICAR SE SUPERVISÃO EXISTE
    const { data: supervision, error: supervisionError } = await supabase
      .from('supervisions')
      .select('*')
      .eq('id', id)
      .single();

    if (supervisionError || !supervision) {
      console.error('❌ [SUPERVISIONS] Supervisão não encontrada:', supervisionError);
      return res.status(404).json({ message: 'Supervisão não encontrada' });
    }

    console.log('🔍 [SUPERVISIONS] Supervisão encontrada:', {
      id: supervision.id,
      date: supervision.date,
      hours: supervision.hours,
      at_id: supervision.at_id,
      coordinator_id: supervision.coordinator_id
    });

    // ✅ VERIFICAR PERMISSÃO
    const canDelete = req.user.type.startsWith('adm-') || 
                     req.user.type.startsWith('financeiro-') ||
                     supervision.coordinator_id === req.user.id ||
                     (req.user.type.startsWith('at-') && supervision.at_id === req.user.id);

    if (!canDelete) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir esta supervisão' });
    }

    // ✅ EXCLUIR SUPERVISÃO (HARD DELETE)
    const { error: deleteError } = await supabase
      .from('supervisions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [SUPERVISIONS] Erro ao deletar supervisão:', deleteError);
      return res.status(500).json({ 
        message: 'Erro ao excluir supervisão', 
        error: deleteError.message 
      });
    }

    console.log('✅ [SUPERVISIONS] Supervisão excluída permanentemente');
    res.json({ 
      message: 'Supervisão excluída com sucesso',
      deletedSupervision: {
        id: supervision.id,
        date: supervision.date,
        hours: supervision.hours
      }
    });

  } catch (error) {
    console.error('❌ [SUPERVISIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao excluir supervisão' });
  }
});

// ✅ BUSCAR TAXAS DE SUPERVISÃO
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [SUPERVISIONS] Carregando taxas de supervisão para:', req.user.type);
    
    // Apenas financeiro-ats pode acessar taxas de supervisão
    if (req.user.type !== 'financeiro-ats') {
      return res.status(403).json({ message: 'Acesso negado. Apenas financeiro-ats pode acessar taxas de supervisão.' });
    }

    const { data: rates, error } = await supabase
      .from('supervision_rates')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ [SUPERVISIONS] Erro ao buscar taxas:', error);
      return res.status(500).json({ message: 'Erro ao buscar taxas de supervisão' });
    }

    // Se não há taxas, retornar valores padrão
    if (!rates) {
      console.log('📋 [SUPERVISIONS] Nenhuma taxa encontrada, retornando valores padrão');
      const defaultRates = {
        aba: 35,
        denver: 35,
        grupo: 35,
        escolar: 35
      };
      return res.json(defaultRates);
    }

    const responseRates = {
      aba: rates.aba || 35,
      denver: rates.denver || 35,
      grupo: rates.grupo || 35,
      escolar: rates.escolar || 35
    };

    console.log('✅ [SUPERVISIONS] Taxas de supervisão carregadas:', responseRates);
    res.json(responseRates);

  } catch (error) {
    console.error('❌ [SUPERVISIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao buscar taxas' });
  }
});

// ✅ SALVAR TAXAS DE SUPERVISÃO
router.post('/rates', authenticateToken, async (req, res) => {
  try {
    const { aba, denver, grupo, escolar } = req.body;

    console.log('💾 [SUPERVISIONS] Salvando taxas de supervisão:', { aba, denver, grupo, escolar });
    console.log('👤 [SUPERVISIONS] Usuário:', req.user.type);

    // Apenas financeiro-ats pode salvar taxas de supervisão
    if (req.user.type !== 'financeiro-ats') {
      console.log('❌ [SUPERVISIONS] Acesso negado para tipo de usuário:', req.user.type);
      return res.status(403).json({ message: 'Acesso negado. Apenas financeiro-ats pode salvar taxas de supervisão.' });
    }

    // ✅ VALIDAR ENTRADA
    if (aba === undefined || denver === undefined || grupo === undefined || escolar === undefined) {
      console.log('❌ [SUPERVISIONS] Campos obrigatórios ausentes');
      return res.status(400).json({ message: 'Todos os campos de taxa (aba, denver, grupo, escolar) são obrigatórios' });
    }

    if (isNaN(Number(aba)) || isNaN(Number(denver)) || isNaN(Number(grupo)) || isNaN(Number(escolar))) {
      console.log('❌ [SUPERVISIONS] Valores inválidos fornecidos');
      return res.status(400).json({ message: 'Todas as taxas devem ser números válidos' });
    }

    const numericRates = {
      aba: Number(aba),
      denver: Number(denver),
      grupo: Number(grupo),
      escolar: Number(escolar)
    };

    // ✅ VERIFICAR SE TAXAS JÁ EXISTEM
    const { data: existingRates, error: checkError } = await supabase
      .from('supervision_rates')
      .select('id')
      .single();

    let result;
    if (existingRates && !checkError) {
      console.log('🔄 [SUPERVISIONS] Atualizando taxas existentes');
      // Atualizar taxas existentes
      const { data, error } = await supabase
        .from('supervision_rates')
        .update({
          aba: numericRates.aba,
          denver: numericRates.denver,
          grupo: numericRates.grupo,
          escolar: numericRates.escolar,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRates.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      console.log('➕ [SUPERVISIONS] Criando novas taxas');
      // Inserir novas taxas
      const { data, error } = await supabase
        .from('supervision_rates')
        .insert({
          aba: numericRates.aba,
          denver: numericRates.denver,
          grupo: numericRates.grupo,
          escolar: numericRates.escolar
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('❌ [SUPERVISIONS] Erro ao salvar taxas:', result.error);
      return res.status(500).json({ message: 'Erro ao salvar taxas de supervisão', error: result.error.message });
    }

    console.log('✅ [SUPERVISIONS] Taxas de supervisão salvas com sucesso:', result.data);
    res.json({
      message: 'Taxas de supervisão salvas com sucesso',
      rates: numericRates
    });

  } catch (error) {
    console.error('❌ [SUPERVISIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao salvar taxas' });
  }
});

export default router;