import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔍 [AUTH] Verificando token para rota:', req.method, req.path);
  console.log('🔑 [AUTH] Token presente:', !!token);

  if (!token) {
    console.log('❌ [AUTH] Token não fornecido');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Verificar se JWT_SECRET está definido
    if (!process.env.JWT_SECRET) {
      console.error('❌ [AUTH] JWT_SECRET não definido!');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log('🔓 [AUTH] Decodificando token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ [AUTH] Token decodificado:', {
      userId: decoded.userId,
      email: decoded.email,
      type: decoded.type
    });

    // Buscar dados atualizados do usuário no banco
    console.log('🔍 [AUTH] Buscando dados do usuário no banco...');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, type, sector, active')
      .eq('id', decoded.userId)
      .eq('active', true)
      .single();

    if (error) {
      console.error('❌ [AUTH] Erro ao buscar usuário no banco:', error);
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    if (!user) {
      console.log('❌ [AUTH] Usuário não encontrado ou inativo');
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    console.log('✅ [AUTH] Usuário autenticado:', {
      id: user.id,
      name: user.name,
      type: user.type,
      sector: user.sector
    });

    req.user = user;

    // ✅ CORREÇÃO: Permitir acesso total para admin geral
    if (user.type === 'adm-geral') {
      console.log('🔓 [AUTH] Admin geral - acesso total liberado');
      return next();
    }

    // ✅ CORREÇÃO: Permitir financeiro-pct e coordenação acessarem GET /api/users?type=at
    if (
      req.method === 'GET' &&
      req.path === '/users' &&
      ['financeiro-pct', 'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo', 'financeiro-ats'].includes(user.type) &&
      req.query?.type === 'at'
    ) {
      console.log('✅ [AUTH] Acesso especial liberado para financeiro/coordenação buscar ATs');
      return next();
    }

    // ✅ CORREÇÃO: Permitir administradores setoriais gerenciarem usuários
    if (user.type.startsWith('adm-')) {
      console.log('✅ [AUTH] Administrador setorial - acesso liberado');
      return next();
    }

    console.log('✅ [AUTH] Autenticação bem-sucedida - prosseguindo');
    next();

  } catch (error) {
    console.error('❌ [AUTH] Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token format' });
    }
    
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// ✅ Módulo de autorização para proteger rotas específicas
export const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    console.log('🔐 [AUTHORIZE] Verificando autorização...');
    console.log('📋 [AUTHORIZE] Tipos permitidos:', allowedTypes);
    console.log('👤 [AUTHORIZE] Tipo do usuário:', req.user?.type);
    
    if (!req.user) {
      console.log('❌ [AUTHORIZE] Usuário não autenticado');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // ✅ CORREÇÃO: Admin geral sempre tem acesso
    if (req.user.type === 'adm-geral') {
      console.log('✅ [AUTHORIZE] Admin geral - acesso total liberado');
      return next();
    }

    if (!allowedTypes.includes(req.user.type)) {
      console.log('❌ [AUTHORIZE] Acesso negado para tipo:', req.user.type);
      return res.status(403).json({ message: 'Access denied for this user type' });
    }

    console.log('✅ [AUTHORIZE] Autorização bem-sucedida');
    next();
  };
};

// ✅ Middleware específico para verificar se é admin geral
export const requireAdminGeral = (req, res, next) => {
  console.log('👑 [ADMIN GERAL] Verificando se é admin geral...');
  
  if (!req.user) {
    console.log('❌ [ADMIN GERAL] Usuário não autenticado');
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.type !== 'adm-geral') {
    console.log('❌ [ADMIN GERAL] Acesso negado - não é admin geral:', req.user.type);
    return res.status(403).json({ 
      message: 'Access denied. Admin geral required.',
      userType: req.user.type 
    });
  }

  console.log('✅ [ADMIN GERAL] Acesso liberado para admin geral');
  next();
};

// ✅ Middleware para verificar se é admin (qualquer tipo)
export const requireAdmin = (req, res, next) => {
  console.log('👨‍💼 [ADMIN] Verificando se é administrador...');
  
  if (!req.user) {
    console.log('❌ [ADMIN] Usuário não autenticado');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const adminTypes = [
    'adm-geral',
    'adm-aba', 'adm-denver', 'adm-grupo', 'adm-escolar'
  ];

  if (!adminTypes.includes(req.user.type)) {
    console.log('❌ [ADMIN] Acesso negado - não é administrador:', req.user.type);
    return res.status(403).json({ 
      message: 'Access denied. Administrator required.',
      userType: req.user.type 
    });
  }

  console.log('✅ [ADMIN] Acesso liberado para administrador');
  next();
};