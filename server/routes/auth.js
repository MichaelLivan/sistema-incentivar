import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login - VERSÃO CORRIGIDA
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔄 [LOGIN] Tentativa de login:', { email, timestamp: new Date().toISOString() });

    // Validação de entrada
    if (!email || !password) {
      console.log('❌ [LOGIN] Dados ausentes');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validação de formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ [LOGIN] Email inválido:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Verificar se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      console.error('❌ [LOGIN] JWT_SECRET não definido!');
      return res.status(500).json({ message: 'Server configuration error - JWT_SECRET missing' });
    }

    console.log('🔍 [LOGIN] Buscando usuário no banco...');

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase()) // Normalizar email
      .eq('active', true)
      .single();

    if (error) {
      console.log('❌ [LOGIN] Erro ao buscar usuário:', error);
      return res.status(401).json({ message: 'Credencial Inválida' });
    }

    if (!user) {
      console.log('❌ [LOGIN] Usuário não encontrado:', email);
      return res.status(401).json({ message: 'Credencial Inválida' });
    }

    console.log('✅ [LOGIN] Usuário encontrado:', {
      id: user.id,
      name: user.name,
      type: user.type,
      sector: user.sector,
      active: user.active
    });

    // Verify password
    console.log('🔐 [LOGIN] Verificando senha...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ [LOGIN] Senha inválida para usuário:', email);
      return res.status(401).json({ message: 'Credencial Inválida' });
    }

    console.log('✅ [LOGIN] Senha válida');

    // Get children if user is parent
    let children = [];
    if (user.type === 'pais') {
      console.log('👨‍👩‍👧‍👦 [LOGIN] Carregando filhos para responsável...');
      const { data: childrenData, error: childrenError } = await supabase
        .from('patients')
        .select('id')
        .eq('parent_id', user.id);
      
      if (childrenError) {
        console.error('⚠️ [LOGIN] Erro ao buscar filhos:', childrenError);
      } else {
        children = childrenData?.map(child => child.id) || [];
        console.log(`✅ [LOGIN] ${children.length} filhos encontrados`);
      }
    }

    // Generate token
    console.log('🎫 [LOGIN] Gerando token JWT...');
    const tokenPayload = { 
      userId: user.id, 
      email: user.email, 
      type: user.type,
      sector: user.sector,
      name: user.name
    };

    console.log('📋 [LOGIN] Payload do token:', tokenPayload);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ [LOGIN] Token gerado com sucesso');

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    const responseData = {
      message: 'Login successful',
      token,
      user: { ...userWithoutPassword, children }
    };

    console.log('✅ [LOGIN] Login bem-sucedido para:', {
      email: user.email,
      type: user.type,
      name: user.name
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [LOGIN] Erro interno:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Unexpected error'
    });
  }
});

// Verify token - VERSÃO APRIMORADA
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 [VERIFY] Verificando token para usuário:', req.user?.id);

    // Verificar se o usuário ainda está ativo e obter dados atualizados
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, type, sector, active, hourly_rate')
      .eq('id', req.user.id)
      .single();

    if (userError) {
      console.error('❌ [VERIFY] Erro ao buscar usuário atualizado:', userError);
      return res.status(401).json({ message: 'User verification failed' });
    }

    if (!currentUser || !currentUser.active) {
      console.log('❌ [VERIFY] Usuário não encontrado ou inativo');
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    console.log('✅ [VERIFY] Usuário verificado:', {
      id: currentUser.id,
      name: currentUser.name,
      type: currentUser.type,
      sector: currentUser.sector
    });

    // Get children if user is parent
    let children = [];
    if (currentUser.type === 'pais') {
      const { data: childrenData, error: childrenError } = await supabase
        .from('patients')
        .select('id')
        .or(`parent_email.ilike.${currentUser.email},parent_email2.ilike.${currentUser.email}`);
      
      if (childrenError) {
        console.error('⚠️ [VERIFY] Erro ao buscar filhos:', childrenError);
      } else {
        children = childrenData?.map(child => child.id) || [];
        console.log(`✅ [VERIFY] ${children.length} filhos encontrados`);
      }
    }

    res.json({ 
      user: { ...currentUser, children },
      permissions: {
        canCreateUsers: ['adm-geral', 'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'].includes(currentUser.type),
        canManageAllUsers: currentUser.type === 'adm-geral',
        canAccessFinancial: currentUser.type.startsWith('financeiro-') || currentUser.type === 'adm-geral'
      }
    });

  } catch (error) {
    console.error('❌ [VERIFY] Erro interno:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  console.log('👋 [LOGOUT] Logout realizado para usuário:', req.user?.name);
  // Em implementações futuras, aqui poderia ser adicionado um blacklist de tokens
  res.json({ message: 'Logout successful' });
});

// Change password - VERSÃO CORRIGIDA
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 [CHANGE PASSWORD] Tentativa de alteração de senha para:', req.user?.email);

    // Validações de entrada
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Validação adicional para senha forte
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number' 
      });
    }

    // Verificar se a nova senha é diferente da atual
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Get current user with password
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('❌ [CHANGE PASSWORD] Usuário não encontrado:', userError);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      console.log('❌ [CHANGE PASSWORD] Senha atual incorreta');
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('❌ [CHANGE PASSWORD] Erro ao atualizar senha:', updateError);
      return res.status(500).json({ message: 'Error updating password' });
    }

    console.log('✅ [CHANGE PASSWORD] Senha alterada com sucesso para:', req.user?.email);
    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('❌ [CHANGE PASSWORD] Erro interno:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Health check for auth
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Authentication',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    jwtConfigured: !!process.env.JWT_SECRET
  });
});

export default router;