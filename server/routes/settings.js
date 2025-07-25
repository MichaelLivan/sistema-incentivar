import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get supervision rates
router.get('/supervision-rates', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Carregando taxas de supervisão para usuário:', req.user.type);
    
    // Only financeiro-ats can access supervision rates
    if (req.user.type !== 'financeiro-ats') {
      console.log('❌ Acesso negado para tipo de usuário:', req.user.type);
      return res.status(403).json({ message: 'Access denied. Only financeiro-ats can access supervision rates.' });
    }

    const { data: rates, error } = await supabase
      .from('supervision_rates')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Erro ao buscar taxas de supervisão:', error);
      return res.status(500).json({ message: 'Error fetching supervision rates' });
    }

    // If no rates found, return default values
    if (!rates) {
      console.log('📋 Nenhuma taxa encontrada, retornando valores padrão');
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

    console.log('✅ Taxas de supervisão carregadas:', responseRates);
    res.json(responseRates);
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Save supervision rates
router.post('/supervision-rates', authenticateToken, async (req, res) => {
  try {
    const { aba, denver, grupo, escolar } = req.body;

    console.log('💾 Salvando taxas de supervisão:', { aba, denver, grupo, escolar });
    console.log('👤 Usuário:', req.user.type);

    // Only financeiro-ats can save supervision rates
    if (req.user.type !== 'financeiro-ats') {
      console.log('❌ Acesso negado para tipo de usuário:', req.user.type);
      return res.status(403).json({ message: 'Access denied. Only financeiro-ats can save supervision rates.' });
    }

    // Validate input
    if (aba === undefined || denver === undefined || grupo === undefined || escolar === undefined) {
      console.log('❌ Campos obrigatórios ausentes');
      return res.status(400).json({ message: 'All rate fields (aba, denver, grupo, escolar) are required' });
    }

    if (isNaN(Number(aba)) || isNaN(Number(denver)) || isNaN(Number(grupo)) || isNaN(Number(escolar))) {
      console.log('❌ Valores inválidos fornecidos');
      return res.status(400).json({ message: 'All rates must be valid numbers' });
    }

    const numericRates = {
      aba: Number(aba),
      denver: Number(denver),
      grupo: Number(grupo),
      escolar: Number(escolar)
    };

    // Check if rates already exist
    const { data: existingRates, error: checkError } = await supabase
      .from('supervision_rates')
      .select('id')
      .single();

    let result;
    if (existingRates && !checkError) {
      console.log('🔄 Atualizando taxas existentes');
      // Update existing rates
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
      console.log('➕ Criando novas taxas');
      // Insert new rates
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
      console.error('❌ Erro ao salvar taxas de supervisão:', result.error);
      return res.status(500).json({ message: 'Error saving supervision rates', error: result.error.message });
    }

    console.log('✅ Taxas de supervisão salvas com sucesso:', result.data);
    res.json({
      message: 'Supervision rates saved successfully',
      rates: numericRates
    });
  } catch (error) {
    console.error('❌ Erro interno:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;