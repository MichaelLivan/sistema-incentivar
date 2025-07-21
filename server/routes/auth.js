import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação de entrada
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validação de formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase()) // Normalizar email
      .eq('active', true)
      .single();

    if (error || !user) {
      console.log('User not found or error:', error);
      return res.status(401).json({ message: 'Credencial Inválida' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Credencial Inválida' });
    }

    // Get children if user is parent
    let children = [];
    if (user.type === 'pais') {
      const { data: childrenData, error: childrenError } = await supabase
        .from('patients')
        .select('id')
        .eq('parent_id', user.id);
      
      if (childrenError) {
        console.error('Error fetching children:', childrenError);
      } else {
        children = childrenData?.map(child => child.id) || [];
      }
    }

    // Verificar se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined');
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        type: user.type,
        sector: user.sector 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    console.log('Login successful for user:', email, 'type:', user.type);
    res.json({
      message: 'Login successful',
      token,
      user: { ...userWithoutPassword, children }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Verify token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário ainda está ativo
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, active')
      .eq('id', req.user.userId)
      .single();

    if (userError || !currentUser || !currentUser.active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Get children if user is parent
    let children = [];
    if (req.user.type === 'pais') {
      const { data: childrenData, error: childrenError } = await supabase
        .from('patients')
        .select('id')
        .eq('parent_id', req.user.userId);
      
      if (childrenError) {
        console.error('Error fetching children:', childrenError);
      } else {
        children = childrenData?.map(child => child.id) || [];
      }
    }

    res.json({ user: { ...req.user, children } });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  // Em implementações futuras, aqui poderia ser adicionado um blacklist de tokens
  res.json({ message: 'Logout successful' });
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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
      .eq('id', req.user.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
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
      .eq('id', req.user.userId);

    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ message: 'Error updating password' });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;