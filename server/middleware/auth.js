import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, type, sector, active')
      .eq('id', decoded.userId)
      .eq('active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    req.user = user;

    // ✅ Permitir financeiro-pct e coordenação acessarem GET /api/users?type=at
    if (
      req.method === 'GET' &&
      req.path === '/api/users' &&
      ['financeiro-pct', 'coordenação', 'financeiro-ats'].includes(req.user.type) &&
      req.query?.type === 'at'
    ) {
      return next();
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// ✅ Módulo de autorização para proteger rotas específicas
export const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedTypes.includes(req.user.type)) {
      return res.status(403).json({ message: 'Access denied for this user type' });
    }

    next();
  };
};
