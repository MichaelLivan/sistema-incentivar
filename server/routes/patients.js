// CORRIGIDO: Cadastro de paciente permitindo segundo email sem nome, se já for cadastrado
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// CORREÇÃO: Adicionar parâmetro para permitir ATs verem todos os pacientes do setor

// Listar pacientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sector, for_substitution } = req.query; // ← ADICIONAR for_substitution

    let query = supabase
      .from('patients')
      .select(`
        *,
        parent:users!patients_parent_id_fkey(name, email),
        at:users!patients_at_id_fkey(name, email)
      `)
      .eq('active', true)
      .order('name');

    if (req.user.type === 'pais') {
      const { data: parentUser, error: parentError } = await supabase
        .from('users')
        .select('email')
        .eq('id', req.user.id)
        .single();

      if (parentError) {
        return res.status(500).json({ message: 'Erro ao buscar dados do responsável' });
      }

      const { data: allPatients, error: patientsError } = await supabase
        .from('patients')
        .select(`
          *,
          parent:users!patients_parent_id_fkey(name, email),
          at:users!patients_at_id_fkey(name, email)
        `)
        .eq('active', true)
        .order('name');

      if (patientsError) {
        return res.status(500).json({ message: 'Erro ao buscar pacientes' });
      }

      const myPatients = allPatients.filter(patient => {
        const isMainParent = patient.parent?.email === parentUser.email;
        const isSecondParent = patient.parent_email2 === parentUser.email;
        return isMainParent || isSecondParent;
      });

      return res.json(myPatients);
    }

    // ✅ CORREÇÃO PRINCIPAL: Permitir ATs verem todos os pacientes do setor para substituição
    if (req.user.type.startsWith('at-')) {
      if (for_substitution === 'true') {
        // Para substituição: mostrar todos os pacientes do setor do AT
        query = query.eq('sector', req.user.sector);
      } else {
        // Normal: mostrar apenas pacientes do AT
        query = query.eq('at_id', req.user.id);
      }
    } else if (req.user.sector && req.user.type !== 'adm-geral') {
      query = query.eq('sector', req.user.sector);
    }

    if (sector) {
      query = query.eq('sector', sector);
    }

    const { data: patients, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar pacientes:', error);
      return res.status(500).json({ message: 'Erro ao buscar pacientes' });
    }

    // 🔍 DEBUG: Logs para verificar
    console.log('📊 Busca de pacientes:');
    console.log('- Usuário:', req.user.type, req.user.sector);
    console.log('- For substitution:', for_substitution);
    console.log('- Pacientes encontrados:', patients.length);
    
    res.json(patients);
  } catch (error) {
    console.error('❌ Erro interno ao buscar pacientes:', error);
    res.status(500).json({ message: 'Erro interno ao buscar pacientes' });
  }
});

// Criar paciente
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      parent_email,
      parent_name,
      parent_email2,
      parent_name2,
      at_id,
      sector,
      weekly_hours,
      hourly_rate
    } = req.body;

    if (!name || !parent_email) {
      return res.status(400).json({ error: 'Nome do paciente e email do responsável são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parent_email)) {
      return res.status(400).json({ message: 'Formato de e-mail do responsável inválido' });
    }
    if (parent_email2 && !emailRegex.test(parent_email2)) {
      return res.status(400).json({ message: 'Formato de e-mail do segundo responsável inválido' });
    }

    // Verificar se o e-mail 1 já está cadastrado
    const { data: existingParent1 } = await supabase
      .from('users')
      .select('id')
      .eq('email', parent_email)
      .eq('type', 'pais')
      .maybeSingle();

    if (!existingParent1 && !parent_name?.trim()) {
      return res.status(400).json({ error: 'Nome do responsável é obrigatório para novo e-mail' });
    }

    // Verificar se o e-mail 2 já está cadastrado
    if (parent_email2) {
      const { data: existingParent2 } = await supabase
        .from('users')
        .select('id')
        .eq('email', parent_email2)
        .eq('type', 'pais')
        .maybeSingle();

      if (!existingParent2 && !parent_name2?.trim()) {
        return res.status(400).json({ error: 'Nome do 2º responsável é obrigatório para novo e-mail' });
      }
    }

    let parentId = existingParent1 ? existingParent1.id : null;

    // Verificar se paciente já existe com mesmo nome e responsável principal
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('name', name)
      .eq('parent_email', parent_email)
      .maybeSingle();

    if (existingPatient) {
      return res.status(409).json({ message: 'Já existe um paciente com este nome e e-mail de responsável' });
    }

    const patientData = {
      name: name.trim(),
      parent_id: parentId,
      parent_email: parent_email.trim().toLowerCase(),
      parent_name: parent_name?.trim() || null,
      sector,
      weekly_hours: weekly_hours || null,
      hourly_rate: hourly_rate || null,
      at_id: at_id || null,
      active: true,
      parent_email2: parent_email2?.trim().toLowerCase() || null,
      parent_name2: parent_name2?.trim() || null
    };

    const { data: insertedPatients, error: insertError } = await supabase
      .from('patients')
      .insert(patientData)
      .select();

    if (insertError || !insertedPatients || insertedPatients.length === 0) {
      console.error('❌ Erro ao inserir paciente:', insertError);
      return res.status(500).json({
        message: 'Erro ao cadastrar paciente',
        error: insertError?.message || 'Paciente não retornado após cadastro'
      });
    }

    const newPatient = insertedPatients[0];

    const { data: completePatient, error: fetchError } = await supabase
      .from('patients')
      .select(`
        *,
        parent:users!patients_parent_id_fkey(name, email),
        at:users!patients_at_id_fkey(name, email)
      `)
      .eq('id', newPatient.id)
      .single();

    if (fetchError) {
      console.warn('⚠️ Paciente criado, mas não foi possível buscar os dados completos:', fetchError.message);
    }

    res.status(201).json({
      message: 'Paciente cadastrado com sucesso',
      patient: completePatient || newPatient
    });
  } catch (error) {
    console.error('❌ Erro interno ao cadastrar paciente:', error);
    res.status(500).json({
      message: 'Erro interno ao cadastrar paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

// Atualizar paciente
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      parent_email,
      parent_name,
      parent_email2,
      parent_name2,
      at_id,
      sector,
      weekly_hours,
      hourly_rate
    } = req.body;

    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update({
        name,
        parent_email,
        parent_name,
        parent_email2,
        parent_name2,
        at_id,
        sector,
        weekly_hours,
        hourly_rate
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar paciente:', error);
      return res.status(500).json({ message: 'Erro ao atualizar paciente' });
    }

    res.status(200).json({
      message: 'Paciente atualizado com sucesso',
      patient: updatedPatient
    });
  } catch (error) {
    console.error('❌ Erro interno ao atualizar paciente:', error);
    res.status(500).json({
      message: 'Erro interno ao atualizar paciente',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

// Excluir paciente - HARD DELETE COMPLETO (deleta tudo relacionado)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Iniciando exclusão completa do paciente:', id);

    // 1. Verificar se o paciente existe e obter dados
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('id, name, parent_email, parent_email2, at_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPatient) {
      console.error('❌ Paciente não encontrado:', fetchError);
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }

    console.log('🔍 Paciente encontrado:', existingPatient.name);

    // 2. DELETAR TODAS AS SESSÕES DO PACIENTE
    console.log('🗑️ Deletando todas as sessões do paciente...');
    const { data: deletedSessions, error: sessionsError } = await supabase
      .from('sessions')
      .delete()
      .eq('patient_id', id)
      .select('id');

    if (sessionsError) {
      console.error('❌ Erro ao deletar sessões:', sessionsError);
      return res.status(500).json({ 
        message: 'Erro ao deletar sessões do paciente', 
        error: sessionsError.message 
      });
    }

    console.log(`✅ ${deletedSessions?.length || 0} sessões deletadas`);

    // 3. VERIFICAR E DELETAR PAIS SE NÃO ESTIVEREM VINCULADOS A OUTROS PACIENTES

    // 3.1. Verificar primeiro responsável
    if (existingPatient.parent_email) {
      console.log('🔍 Verificando primeiro responsável:', existingPatient.parent_email);
      
      // Buscar outros pacientes com o mesmo email de responsável
      const { data: otherPatientsParent1, error: checkParent1Error } = await supabase
        .from('patients')
        .select('id')
        .or(`parent_email.eq.${existingPatient.parent_email},parent_email2.eq.${existingPatient.parent_email}`)
        .neq('id', id); // Excluir o paciente atual da busca

      if (checkParent1Error) {
        console.error('⚠️ Erro ao verificar outros pacientes do responsável 1:', checkParent1Error);
      } else if (!otherPatientsParent1 || otherPatientsParent1.length === 0) {
        // Não há outros pacientes, pode deletar o responsável
        console.log('🗑️ Deletando primeiro responsável (sem outros pacientes vinculados)...');
        const { error: deleteParent1Error } = await supabase
          .from('users')
          .delete()
          .eq('email', existingPatient.parent_email)
          .eq('type', 'pais');

        if (deleteParent1Error) {
          console.error('⚠️ Erro ao deletar primeiro responsável:', deleteParent1Error);
        } else {
          console.log('✅ Primeiro responsável deletado');
        }
      } else {
        console.log('ℹ️ Primeiro responsável mantido (vinculado a outros pacientes)');
      }
    }

    // 3.2. Verificar segundo responsável
    if (existingPatient.parent_email2) {
      console.log('🔍 Verificando segundo responsável:', existingPatient.parent_email2);
      
      // Buscar outros pacientes com o mesmo email de responsável
      const { data: otherPatientsParent2, error: checkParent2Error } = await supabase
        .from('patients')
        .select('id')
        .or(`parent_email.eq.${existingPatient.parent_email2},parent_email2.eq.${existingPatient.parent_email2}`)
        .neq('id', id); // Excluir o paciente atual da busca

      if (checkParent2Error) {
        console.error('⚠️ Erro ao verificar outros pacientes do responsável 2:', checkParent2Error);
      } else if (!otherPatientsParent2 || otherPatientsParent2.length === 0) {
        // Não há outros pacientes, pode deletar o responsável
        console.log('🗑️ Deletando segundo responsável (sem outros pacientes vinculados)...');
        const { error: deleteParent2Error } = await supabase
          .from('users')
          .delete()
          .eq('email', existingPatient.parent_email2)
          .eq('type', 'pais');

        if (deleteParent2Error) {
          console.error('⚠️ Erro ao deletar segundo responsável:', deleteParent2Error);
        } else {
          console.log('✅ Segundo responsável deletado');
        }
      } else {
        console.log('ℹ️ Segundo responsável mantido (vinculado a outros pacientes)');
      }
    }

    // 4. DELETAR O PACIENTE
    console.log('🗑️ Deletando o paciente...');
    const { error: deletePatientError } = await supabase
      .from('patients')
      .delete()
      .eq('id', id);

    if (deletePatientError) {
      console.error('❌ Erro ao deletar paciente:', deletePatientError);
      return res.status(500).json({ 
        message: 'Erro ao deletar paciente', 
        error: deletePatientError.message 
      });
    }

    console.log('✅ Paciente deletado permanentemente');

    res.status(200).json({
      success: true,
      message: 'Paciente e todos os dados relacionados foram deletados com sucesso',
      deletedData: {
        patient: existingPatient.name,
        sessionsDeleted: deletedSessions?.length || 0,
        parentsChecked: {
          parent1: existingPatient.parent_email,
          parent2: existingPatient.parent_email2
        }
      }
    });

  } catch (error) {
    console.error('❌ Erro interno ao excluir paciente:', error);
    res.status(500).json({
      message: 'Erro interno ao excluir paciente completamente',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro inesperado'
    });
  }
});

export default router;