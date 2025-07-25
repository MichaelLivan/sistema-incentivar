// ✅ CORREÇÃO COMPLETA DAS ROTAS DE SESSÕES
// Corrige problemas de confirmação para administradores setoriais

import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken, debugPermissions, canConfirmSessions } from '../middleware/auth.js';

const router = express.Router();

// ✅ MIDDLEWARE DE DEBUG (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.use(debugPermissions);
}

// ✅ LISTAR SESSÕES/ATENDIMENTOS
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, patient_id, at_id } = req.query;
    
    console.log('🔍 [SESSIONS] Carregando sessões para usuário:', {
      type: req.user.type,
      sector: req.user.sector,
      filters: { month, year, patient_id, at_id }
    });
    
    let query = supabase
      .from('sessions')
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector, parent_email),
        at:users!sessions_at_id_fkey(id, name, sector)
      `)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false });

    // ✅ FILTROS POR TIPO DE USUÁRIO
    if (req.user.type.startsWith('at-')) {
      // ATs veem suas próprias sessões
      query = query.eq('at_id', req.user.id);
    } else if (req.user.type === 'pais') {
      // Pais veem sessões dos seus filhos
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .select('email')
        .eq('id', req.user.id)
        .single();

      if (parentError) {
        return res.status(500).json({ message: 'Erro ao buscar dados do responsável' });
      }

      // Buscar todos os pacientes e filtrar os filhos deste responsável
      const { data: allPatients, error: patientsError } = await supabase
        .from('patients')
        .select('id, parent_email, parent_email2')
        .eq('active', true);

      if (patientsError) {
        return res.status(500).json({ message: 'Erro ao buscar pacientes' });
      }

      const myChildrenIds = allPatients
        .filter(patient => {
          const isMainParent = patient.parent_email?.toLowerCase() === parentUser.email.toLowerCase();
          const isSecondParent = patient.parent_email2?.toLowerCase() === parentUser.email.toLowerCase();
          return isMainParent || isSecondParent;
        })
        .map(patient => patient.id);

      if (myChildrenIds.length === 0) {
        return res.json([]); // Sem filhos vinculados
      }

      query = query.in('patient_id', myChildrenIds);
    } else if (req.user.type !== 'adm-geral' && req.user.sector) {
      // ✅ CORREÇÃO: Usuários setoriais veem sessões do seu setor
      console.log('🏢 [SESSIONS] Filtrando por setor:', req.user.sector);
      
      const { data: sectorPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('sector', req.user.sector);
      
      const patientIds = sectorPatients?.map(p => p.id) || [];
      console.log('📊 [SESSIONS] Pacientes do setor encontrados:', patientIds.length);
      
      if (patientIds.length > 0) {
        query = query.in('patient_id', patientIds);
      } else {
        // Se não há pacientes no setor, retornar lista vazia
        return res.json([]);
      }
    }
    // Admin geral vê todas

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

    console.log(`✅ [SESSIONS] ${sessions?.length || 0} sessões encontradas para ${req.user.type}`);
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
      at_id: req.user.id
    });

    // ✅ VALIDAÇÕES
    if (!patient_id || !start_time || !end_time || !date) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // ✅ VERIFICAR PERMISSÕES
    // Apenas ATs podem criar sessões
    if (!req.user.type.startsWith('at-')) {
      return res.status(403).json({ message: 'Apenas ATs podem registrar atendimentos' });
    }

    // ✅ VERIFICAR SE O PACIENTE EXISTE
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, name, sector, at_id')
      .eq('id', patient_id)
      .eq('active', true)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    // ✅ VERIFICAR SE É SUBSTITUIÇÃO OU PACIENTE PRÓPRIO
    if (!is_substitution && patient.at_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'Você só pode registrar atendimentos para seus próprios pacientes ou usar o modo substituição' 
      });
    }

    // ✅ VERIFICAR SE É SUBSTITUIÇÃO NO MESMO SETOR
    if (is_substitution && patient.sector !== req.user.sector) {
      return res.status(403).json({ 
        message: 'Substituições só são permitidas dentro do mesmo setor' 
      });
    }

    // ✅ CALCULAR HORAS
    const calculateHours = (start, end) => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const diffMinutes = endMinutes - startMinutes;
      return Math.max(0, diffMinutes / 60);
    };

    const hours = calculateHours(start_time, end_time);

    if (hours <= 0) {
      return res.status(400).json({ message: 'Horário de fim deve ser posterior ao horário de início' });
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
      return res.status(409).json({ message: 'Já existe um atendimento idêntico registrado' });
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
      is_substitution: is_substitution || false,
      is_confirmed: false, // Aguardando confirmação da recepção
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
      return res.status(500).json({ 
        message: 'Erro ao criar sessão', 
        error: insertError.message,
        details: insertError.details || 'Detalhes não disponíveis'
      });
    }

    console.log('✅ [SESSIONS] Sessão criada com sucesso:', {
      id: newSession.id,
      patient_id: newSession.patient_id,
      at_id: newSession.at_id,
      hours: newSession.hours,
      is_substitution: newSession.is_substitution,
      created_by: req.user.name
    });

    res.status(201).json({
      message: 'Atendimento registrado com sucesso',
      sessionId: newSession.id,
      session: newSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno ao criar sessão:', error);
    res.status(500).json({ 
      message: 'Erro interno ao criar atendimento',
      error: error.message
    });
  }
});

// ✅ CONFIRMAR SESSÃO - FUNÇÃO PRINCIPAL COMPLETAMENTE CORRIGIDA
router.patch('/:id/confirm', authenticateToken, canConfirmSessions, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('✅ [SESSIONS] Iniciando confirmação de sessão:', {
      sessionId: id,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        type: req.user.type,
        sector: req.user.sector
      },
      route: {
        method: req.method,
        path: req.path
      },
      timestamp: new Date().toISOString()
    });

    // ✅ VERIFICAR SE SESSÃO EXISTE E BUSCAR DADOS COMPLETOS
    console.log('🔍 [SESSIONS] Buscando sessão no banco...');
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector),
        at:users!sessions_at_id_fkey(id, name, sector)
      `)
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      console.error('❌ [SESSIONS] Sessão não encontrada:', {
        sessionId: id,
        error: sessionError
      });
      return res.status(404).json({ 
        message: 'Atendimento não encontrado',
        sessionId: id
      });
    }

    console.log('📋 [SESSIONS] Sessão encontrada:', {
      id: session.id,
      patient_id: session.patient_id,
      patient_name: session.patient?.name,
      patient_sector: session.patient?.sector,
      at_id: session.at_id,
      at_name: session.at?.name,
      date: session.date,
      is_confirmed: session.is_confirmed,
      is_substitution: session.is_substitution
    });

    // ✅ VERIFICAR SE JÁ FOI CONFIRMADA
    if (session.is_confirmed) {
      console.log('⚠️ [SESSIONS] Sessão já confirmada:', id);
      return res.status(400).json({ 
        message: 'Atendimento já foi confirmado',
        session: {
          id: session.id,
          confirmed_at: session.confirmed_at,
          confirmed_by: session.confirmed_by
        }
      });
    }

    // ✅ VERIFICAÇÃO DE SETOR PARA ADMINS SETORIAIS
    if (req.user.type !== 'adm-geral' && req.user.type.startsWith('adm-')) {
      if (!req.user.sector) {
        console.error('❌ [SESSIONS] Admin setorial sem setor definido:', req.user.type);
        return res.status(403).json({
          message: 'Admin setorial deve ter setor definido',
          userType: req.user.type
        });
      }

      if (session.patient?.sector !== req.user.sector) {
        console.log('❌ [SESSIONS] Admin setorial tentando confirmar sessão de outro setor:', {
          userSector: req.user.sector,
          patientSector: session.patient?.sector,
          sessionId: id
        });
        return res.status(403).json({
          message: 'Você só pode confirmar atendimentos do seu setor',
          userSector: req.user.sector,
          patientSector: session.patient?.sector
        });
      }
    }

    console.log('🔒 [SESSIONS] Verificações de permissão concluídas - prosseguindo com confirmação');

    // ✅ CONFIRMAR SESSÃO
    console.log('💾 [SESSIONS] Atualizando sessão no banco...');
    const { data: confirmedSession, error: confirmError } = await supabase
      .from('sessions')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
      })
      .eq('id', id)
      .select(`
        *,
        patient:patients!sessions_patient_id_fkey(id, name, sector),
        at:users!sessions_at_id_fkey(id, name, sector)
      `)
      .single();

    if (confirmError) {
      console.error('❌ [SESSIONS] Erro ao confirmar sessão no banco:', confirmError);
      return res.status(500).json({ 
        message: 'Erro ao confirmar atendimento no banco de dados',
        error: confirmError.message,
        details: confirmError.details
      });
    }

    console.log('✅ [SESSIONS] Sessão confirmada com sucesso:', {
      id: confirmedSession.id,
      confirmed_at: confirmedSession.confirmed_at,
      confirmed_by: confirmedSession.confirmed_by,
      confirmer: {
        id: req.user.id,
        name: req.user.name,
        type: req.user.type,
        sector: req.user.sector
      },
      patient: {
        name: confirmedSession.patient?.name,
        sector: confirmedSession.patient?.sector
      }
    });
    
    res.json({ 
      message: 'Atendimento confirmado com sucesso',
      session: confirmedSession,
      confirmedBy: {
        id: req.user.id,
        name: req.user.name,
        type: req.user.type,
        sector: req.user.sector
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno na confirmação:', error);
    res.status(500).json({ 
      message: 'Erro interno ao confirmar atendimento',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ✅ APROVAR SESSÃO - FUNÇÃO CORRIGIDA
router.patch('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('✅ [SESSIONS] Aprovando sessão:', id, 'por usuário:', req.user.name, 'tipo:', req.user.type);

    // ✅ CORREÇÃO: Verificar permissão melhorada para aprovação
    const canApprove = req.user.type === 'adm-geral' || 
                      req.user.type.startsWith('adm-') ||
                      req.user.type.startsWith('coordenacao-');

    if (!canApprove) {
      console.log('❌ [SESSIONS] Acesso negado para aprovação, tipo:', req.user.type);
      return res.status(403).json({ 
        message: 'Sem permissão para aprovar atendimentos',
        userType: req.user.type 
      });
    }

    // Verificar se a sessão existe e está confirmada
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Atendimento não encontrado' });
    }

    if (!session.is_confirmed) {
      return res.status(400).json({ 
        message: 'Atendimento deve estar confirmado antes de ser aprovado' 
      });
    }

    if (session.is_approved) {
      return res.status(400).json({ message: 'Atendimento já foi aprovado' });
    }

    const { data: approvedSession, error: approveError } = await supabase
      .from('sessions')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (approveError) {
      console.error('❌ [SESSIONS] Erro ao aprovar sessão:', approveError);
      return res.status(500).json({ message: 'Erro ao aprovar atendimento' });
    }

    console.log('✅ [SESSIONS] Sessão aprovada com sucesso');
    res.json({ 
      message: 'Atendimento aprovado com sucesso',
      session: approvedSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno na aprovação:', error);
    res.status(500).json({ message: 'Erro interno ao aprovar atendimento' });
  }
});

// ✅ LANÇAR SESSÃO (FINANCEIRO) - FUNÇÃO CORRIGIDA
router.patch('/:id/launch', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('✅ [SESSIONS] Lançando sessão:', id, 'por usuário:', req.user.name, 'tipo:', req.user.type);

    // ✅ CORREÇÃO: Verificar permissão para lançamento
    const canLaunch = req.user.type === 'adm-geral' || 
                     req.user.type.startsWith('financeiro-') ||
                     req.user.type.startsWith('adm-');

    if (!canLaunch) {
      console.log('❌ [SESSIONS] Acesso negado para lançamento, tipo:', req.user.type);
      return res.status(403).json({ 
        message: 'Sem permissão para lançar atendimentos',
        userType: req.user.type 
      });
    }

    // Verificar se a sessão existe e está aprovada
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ message: 'Atendimento não encontrado' });
    }

    if (!session.is_approved) {
      return res.status(400).json({ 
        message: 'Atendimento deve estar aprovado antes de ser lançado' 
      });
    }

    if (session.is_launched) {
      return res.status(400).json({ message: 'Atendimento já foi lançado' });
    }

    const { data: launchedSession, error: launchError } = await supabase
      .from('sessions')
      .update({
        is_launched: true,
        launched_at: new Date().toISOString(),
        launched_by: req.user.id
      })
      .eq('id', id)
      .select()
      .single();

    if (launchError) {
      console.error('❌ [SESSIONS] Erro ao lançar sessão:', launchError);
      return res.status(500).json({ message: 'Erro ao lançar atendimento' });
    }

    console.log('✅ [SESSIONS] Sessão lançada com sucesso');
    res.json({ 
      message: 'Atendimento lançado com sucesso',
      session: launchedSession
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno no lançamento:', error);
    res.status(500).json({ message: 'Erro interno ao lançar atendimento' });
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
      console.error('❌ [SESSIONS] Sessão não encontrada:', sessionError);
      return res.status(404).json({ message: 'Atendimento não encontrado' });
    }

    console.log('🔍 [SESSIONS] Sessão encontrada:', {
      id: session.id,
      date: session.date,
      hours: session.hours,
      at_id: session.at_id
    });

    // ✅ VERIFICAR PERMISSÃO
    const canDelete = req.user.type.startsWith('adm-') || 
                     req.user.type.startsWith('financeiro-') ||
                     session.at_id === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este atendimento' });
    }

    // ✅ EXCLUIR SESSÃO (HARD DELETE)
    const { error: deleteError } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ [SESSIONS] Erro ao deletar sessão:', deleteError);
      return res.status(500).json({ 
        message: 'Erro ao excluir atendimento', 
        error: deleteError.message 
      });
    }

    console.log('✅ [SESSIONS] Sessão excluída permanentemente');
    res.json({ 
      message: 'Atendimento excluído com sucesso',
      deletedSession: {
        id: session.id,
        date: session.date,
        hours: session.hours
      }
    });

  } catch (error) {
    console.error('❌ [SESSIONS] Erro interno:', error);
    res.status(500).json({ message: 'Erro interno ao excluir atendimento' });
  }
});

// ✅ ENDPOINT DE DEBUG PARA VERIFICAR PERMISSÕES (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/permissions', authenticateToken, (req, res) => {
    const allowedTypes = [
      'adm-geral',
      'adm-aba',
      'adm-denver', 
      'adm-grupo',
      'adm-escolar',
      'coordenacao-aba',
      'coordenacao-denver',
      'coordenacao-grupo', 
      'coordenacao-escolar',
      'financeiro-ats',
      'financeiro-pct'
    ];

    const canConfirm = allowedTypes.includes(req.user.type);

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        type: req.user.type,
        sector: req.user.sector
      },
      permissions: {
        canConfirmSessions: canConfirm,
        allowedTypes,
        isAdminGeral: req.user.type === 'adm-geral',
        isAdminSetorial: req.user.type.startsWith('adm-') && req.user.type !== 'adm-geral'
      },
      timestamp: new Date().toISOString()
    });
  });
}

export default router;