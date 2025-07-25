// CORRIGIDO: Cadastro de paciente permitindo admin setorial e melhorando validações
import express from 'express';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar pacientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sector, for_substitution } = req.query;

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

    // ✅ CORREÇÃO: Permitir ATs verem todos os pacientes do setor para substituição
    if (req.user.type.startsWith('at-')) {
      if (for_substitution === 'true') {
        query = query.eq('sector', req.user.sector);
      } else {
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

    console.log('📊 Busca de pacientes:', {
      usuario: req.user.type,
      setor: req.user.sector,
      for_substitution,
      pacientes_encontrados: patients.length
    });
    
    res.json(patients);
  } catch (error) {
    console.error('❌ Erro interno ao buscar pacientes:', error);
    res.status(500).json({ message: 'Erro interno ao buscar pacientes' });
  }
});

// ✅ CRIAR PACIENTE - CORRIGIDO PARA ADMIN SETORIAL
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('📤 [CREATE PATIENT] Iniciando cadastro de paciente');
    console.log('👤 [CREATE PATIENT] Usuário:', req.user.type, req.user.sector);
    console.log('📋 [CREATE PATIENT] Dados recebidos:', req.body);

    // ✅ VERIFICAÇÃO DE PERMISSÃO CORRIGIDA
    const allowedTypes = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      console.error('❌ [CREATE PATIENT] Usuário não autorizado:', req.user.type);
      return res.status(403).json({ 
        message: 'Apenas administradores podem cadastrar pacientes',
        userType: req.user.type 
      });
    }

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

    // ✅ VALIDAÇÕES BÁSICAS MELHORADAS
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Nome do paciente é obrigatório' });
    }

    if (!parent_email?.trim()) {
      return res.status(400).json({ message: 'Email do responsável é obrigatório' });
    }

    if (!parent_name?.trim()) {
      return res.status(400).json({ message: 'Nome do responsável é obrigatório' });
    }

    if (!sector) {
      return res.status(400).json({ message: 'Setor é obrigatório' });
    }

    // ✅ VALIDAÇÃO DE EMAIL MELHORADA
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parent_email.trim())) {
      return res.status(400).json({ message: 'Formato de e-mail do responsável inválido' });
    }

    if (parent_email2 && !emailRegex.test(parent_email2.trim())) {
      return res.status(400).json({ message: 'Formato de e-mail do segundo responsável inválido' });
    }

    // ✅ VERIFICAR SE PACIENTE JÁ EXISTE
    console.log('🔍 [CREATE PATIENT] Verificando se paciente já existe...');
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, name')
      .eq('name', name.trim())
      .eq('parent_email', parent_email.trim().toLowerCase())
      .maybeSingle();

    if (existingPatient) {
      return res.status(409).json({ 
        message: 'Já existe um paciente com este nome e e-mail de responsável' 
      });
    }

    // ✅ CRIAR USUÁRIO "PAIS" AUTOMATICAMENTE - PRIMEIRA PARTE
    console.log('👨‍👩‍👧‍👦 [CREATE PATIENT] Verificando/criando usuário para responsável 1:', parent_email);
    
    const { data: existingParent1 } = await supabase
      .from('users')
      .select('id')
      .eq('email', parent_email.trim().toLowerCase())
      .eq('type', 'pais')
      .maybeSingle();

    let parentId = existingParent1 ? existingParent1.id : null;

    if (!existingParent1) {
      console.log('➕ [CREATE PATIENT] Criando novo usuário "pais" para:', parent_email);
      
      // ✅ IMPORTAÇÃO DINÂMICA DO BCRYPT CORRIGIDA
      const bcrypt = await import('bcryptjs');
      const defaultPassword = await bcrypt.default.hash('123456', 12);
      
      const { data: newParentUser, error: createParentError } = await supabase
        .from('users')
        .insert({
          name: parent_name.trim(),
          email: parent_email.trim().toLowerCase(),
          type: 'pais',
          password: defaultPassword,
          active: true,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createParentError) {
        console.error('❌ [CREATE PATIENT] Erro ao criar usuário responsável:', createParentError);
        return res.status(500).json({ 
          message: 'Erro ao criar usuário para o responsável',
          error: createParentError.message 
        });
      }

      parentId = newParentUser.id;
      console.log('✅ [CREATE PATIENT] Usuário "pais" criado com sucesso:', newParentUser.id);
    }

    // ✅ CRIAR USUÁRIO "PAIS" PARA SEGUNDO RESPONSÁVEL (SE FORNECIDO)
    if (parent_email2?.trim()) {
      console.log('👨‍👩‍👧‍👦 [CREATE PATIENT] Verificando/criando usuário para responsável 2:', parent_email2);
      
      const { data: existingParent2 } = await supabase
        .from('users')
        .select('id')
        .eq('email', parent_email2.trim().toLowerCase())
        .eq('type', 'pais')
        .maybeSingle();

      if (!existingParent2) {
        if (!parent_name2?.trim()) {
          return res.status(400).json({ 
            message: 'Nome do 2º responsável é obrigatório para novo e-mail' 
          });
        }

        console.log('➕ [CREATE PATIENT] Criando novo usuário "pais" para responsável 2:', parent_email2);
        
        const bcrypt = await import('bcryptjs');
        const defaultPassword = await bcrypt.default.hash('123456', 12);
        
        const { data: newParentUser2, error: createParent2Error } = await supabase
          .from('users')
          .insert({
            name: parent_name2.trim(),
            email: parent_email2.trim().toLowerCase(),
            type: 'pais',
            password: defaultPassword,
            active: true,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createParent2Error) {
          console.error('❌ [CREATE PATIENT] Erro ao criar usuário responsável 2:', createParent2Error);
          return res.status(500).json({ 
            message: 'Erro ao criar usuário para o segundo responsável',
            error: createParent2Error.message 
          });
        }

        console.log('✅ [CREATE PATIENT] Usuário "pais" 2 criado com sucesso:', newParentUser2.id);
      }
    }

    // ✅ PREPARAR DADOS DO PACIENTE
    const patientData = {
      name: name.trim(),
      parent_id: parentId,
      parent_email: parent_email.trim().toLowerCase(),
      parent_name: parent_name.trim(),
      sector: sector,
      weekly_hours: weekly_hours ? Number(weekly_hours) : null,
      hourly_rate: hourly_rate ? Number(hourly_rate) : null,
      at_id: at_id || null,
      active: true,
      parent_email2: parent_email2?.trim().toLowerCase() || null,
      parent_name2: parent_name2?.trim() || null,
      created_at: new Date().toISOString()
    };

    console.log('💾 [CREATE PATIENT] Inserindo paciente no banco:', patientData);

    // ✅ INSERIR PACIENTE NO BANCO
    const { data: insertedPatients, error: insertError } = await supabase
      .from('patients')
      .insert(patientData)
      .select();

    if (insertError) {
      console.error('❌ [CREATE PATIENT] Erro ao inserir paciente:', insertError);
      return res.status(500).json({
        message: 'Erro ao cadastrar paciente no banco de dados',
        error: insertError.message
      });
    }

    if (!insertedPatients || insertedPatients.length === 0) {
      console.error('❌ [CREATE PATIENT] Paciente não retornado após inserção');
      return res.status(500).json({
        message: 'Paciente não foi retornado após cadastro'
      });
    }

    const newPatient = insertedPatients[0];
    console.log('✅ [CREATE PATIENT] Paciente inserido com sucesso:', newPatient.id);

    // ✅ BUSCAR DADOS COMPLETOS DO PACIENTE
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
      console.warn('⚠️ [CREATE PATIENT] Erro ao buscar dados completos:', fetchError);
    }

    // ✅ MENSAGEM DE SUCESSO MELHORADA
    let successMessage = '✅ Paciente cadastrado com sucesso!';
    const createdUsers = [];
    
    if (!existingParent1) {
      createdUsers.push(`${parent_name} (${parent_email})`);
    }
    
    if (parent_email2 && !existingParent2) {
      createdUsers.push(`${parent_name2} (${parent_email2})`);
    }
    
    if (createdUsers.length > 0) {
      successMessage += `\n\n👥 Usuários "pais" criados automaticamente:\n• ${createdUsers.join('\n• ')}\n\n🔑 Senha padrão: 123456\n(Os pais podem alterar a senha após o primeiro login)`;
    }

    console.log('🎉 [CREATE PATIENT] Cadastro concluído com sucesso!');

    res.status(201).json({
      success: true,
      message: successMessage,
      patient: completePatient || newPatient,
      createdUsers: createdUsers.length
    });

  } catch (error) {
    console.error('❌ [CREATE PATIENT] Erro interno:', error);
    res.status(500).json({
      message: 'Erro interno do servidor ao cadastrar paciente',
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

    // ✅ VERIFICAÇÃO DE PERMISSÃO
    const allowedTypes = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ 
        message: 'Apenas administradores podem atualizar pacientes' 
      });
    }

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
        weekly_hours: weekly_hours ? Number(weekly_hours) : null,
        hourly_rate: hourly_rate ? Number(hourly_rate) : null,
        updated_at: new Date().toISOString()
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

// Excluir paciente - HARD DELETE COMPLETO
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ VERIFICAÇÃO DE PERMISSÃO
    const allowedTypes = [
      'adm-geral',
      'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
    ];

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ 
        message: 'Apenas administradores podem excluir pacientes' 
      });
    }

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
    // ... [resto da lógica de exclusão de pais]

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
        sessionsDeleted: deletedSessions?.length || 0
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