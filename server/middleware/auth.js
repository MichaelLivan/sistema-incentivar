// ✅ CORREÇÃO COMPLETA DO auth.js
// Corrige problemas de autenticação para administradores setoriais

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
      type: decoded.type,
      sector: decoded.sector
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
      sector: user.sector,
      active: user.active
    });

    req.user = user;

    // ✅ CORREÇÃO 1: Admin geral sempre tem acesso total
    if (user.type === 'adm-geral') {
      console.log('👑 [AUTH] Admin geral - acesso total liberado');
      return next();
    }

    // ✅ CORREÇÃO 2: Verificação melhorada para administradores setoriais
    if (user.type && user.type.startsWith('adm-')) {
      console.log('🏢 [AUTH] Administrador setorial detectado:', {
        type: user.type,
        sector: user.sector,
        path: req.path,
        method: req.method
      });
      
      // Verificar se tem setor definido (obrigatório para admins setoriais)
      if (!user.sector && user.type !== 'adm-geral') {
        console.warn('⚠️ [AUTH] Admin setorial sem setor definido:', user.type);
        return res.status(403).json({ 
          message: 'Admin setorial deve ter setor definido',
          userType: user.type,
          sector: user.sector
        });
      }
      
      console.log('✅ [AUTH] Administrador setorial - acesso liberado:', user.type);
      return next();
    }

    // ✅ CORREÇÃO 3: Coordenadores (descontinuados mas ainda podem existir)
    if (user.type && user.type.startsWith('coordenacao-')) {
      console.log('📋 [AUTH] Coordenador (descontinuado) - acesso limitado:', user.type);
      return next();
    }

    // ✅ CORREÇÃO 4: Financeiro tem acesso administrativo
    if (user.type && user.type.startsWith('financeiro-')) {
      console.log('💰 [AUTH] Financeiro - acesso liberado:', user.type);
      return next();
    }

    // ✅ CORREÇÃO 5: ATs têm acesso às suas funções
    if (user.type && user.type.startsWith('at-')) {
      console.log('👨‍⚕️ [AUTH] AT - acesso liberado:', user.type);
      return next();
    }

    // ✅ CORREÇÃO 6: Pais têm acesso às suas informações
    if (user.type === 'pais') {
      console.log('👨‍👩‍👧‍👦 [AUTH] Responsável - acesso liberado:', user.type);
      return next();
    }

    // ✅ PERMITIR: Acesso especial para casos específicos
    if (
      req.method === 'GET' &&
      req.path === '/users' &&
      ['financeiro-pct', 'coordenacao-aba', 'coordenacao-denver', 'coordenacao-escolar', 'coordenacao-grupo', 'financeiro-ats'].includes(user.type) &&
      req.query?.type === 'at'
    ) {
      console.log('✅ [AUTH] Acesso especial liberado para financeiro/coordenação buscar ATs');
      return next();
    }

    // Se chegou até aqui, o usuário está autenticado mas pode não ter permissão específica
    console.log('✅ [AUTH] Usuário autenticado - prosseguindo:', {
      type: user.type,
      path: req.path,
      method: req.method
    });
    next();

  } catch (error) {
    console.error('❌ [AUTH] Erro na autenticação:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(403).json({ 
      message: 'Invalid token',
      code: 'AUTH_ERROR'
    });
  }
};

// ✅ CORREÇÃO 7: Função authorize melhorada
export const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    console.log('🔐 [AUTHORIZE] Verificando autorização...');
    console.log('📋 [AUTHORIZE] Tipos permitidos:', allowedTypes);
    console.log('👤 [AUTHORIZE] Usuário:', {
      type: req.user?.type,
      sector: req.user?.sector,
      name: req.user?.name
    });
    
    if (!req.user) {
      console.log('❌ [AUTHORIZE] Usuário não autenticado');
      return res.status(401).json({ message: 'Authentication required' });
    }

    // ✅ Admin geral sempre tem acesso
    if (req.user.type === 'adm-geral') {
      console.log('👑 [AUTHORIZE] Admin geral - acesso total liberado');
      return next();
    }

    // ✅ Verificar se o tipo do usuário está na lista de permitidos
    const hasPermission = allowedTypes.some(allowedType => {
      // Suporte para wildcards (ex: 'adm-*' permite qualquer admin setorial)
      if (allowedType.endsWith('*')) {
        const prefix = allowedType.slice(0, -1);
        const matches = req.user.type.startsWith(prefix);
        console.log(`🔍 [AUTHORIZE] Testando wildcard ${allowedType} contra ${req.user.type}:`, matches);
        return matches;
      }
      
      const exactMatch = req.user.type === allowedType;
      console.log(`🔍 [AUTHORIZE] Testando match exato ${allowedType} contra ${req.user.type}:`, exactMatch);
      return exactMatch;
    });

    if (!hasPermission) {
      console.log('❌ [AUTHORIZE] Acesso negado:', {
        userType: req.user.type,
        allowedTypes: allowedTypes,
        path: req.path,
        method: req.method
      });
      return res.status(403).json({ 
        message: 'Access denied for this user type',
        userType: req.user.type,
        allowedTypes: allowedTypes
      });
    }

    console.log('✅ [AUTHORIZE] Autorização bem-sucedida');
    next();
  };
};

// ✅ CORREÇÃO 8: Middleware específico para verificar se é admin
export const requireAdmin = (req, res, next) => {
  console.log('👨‍💼 [ADMIN] Verificando se é administrador...');
  console.log('👤 [ADMIN] Usuário:', {
    type: req.user?.type,
    sector: req.user?.sector,
    name: req.user?.name
  });
  
  if (!req.user) {
    console.log('❌ [ADMIN] Usuário não autenticado');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // ✅ Lista completa de tipos de administradores
  const adminTypes = [
    'adm-geral',
    'adm-aba', 
    'adm-denver', 
    'adm-grupo', 
    'adm-escolar',
    'coordenacao-aba',
    'coordenacao-denver',
    'coordenacao-grupo',
    'coordenacao-escolar'
  ];

  const isAdmin = adminTypes.includes(req.user.type);
  console.log('🔍 [ADMIN] Verificação de admin:', {
    userType: req.user.type,
    adminTypes,
    isAdmin
  });

  if (!isAdmin) {
    console.log('❌ [ADMIN] Acesso negado - não é administrador:', req.user.type);
    return res.status(403).json({ 
      message: 'Access denied. Administrator required.',
      userType: req.user.type,
      allowedTypes: adminTypes
    });
  }

  console.log('✅ [ADMIN] Acesso liberado para administrador:', req.user.type);
  next();
};

// ✅ CORREÇÃO 9: Middleware específico para admin geral
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

// ✅ CORREÇÃO 10: Middleware para verificar se pode confirmar atendimentos
export const canConfirmSessions = (req, res, next) => {
  console.log('✅ [CONFIRM SESSIONS] Verificando permissão para confirmar atendimentos...');
  console.log('👤 [CONFIRM SESSIONS] Usuário:', {
    type: req.user?.type,
    sector: req.user?.sector,
    name: req.user?.name
  });
  
  if (!req.user) {
    console.log('❌ [CONFIRM SESSIONS] Usuário não autenticado');
    return res.status(401).json({ message: 'Authentication required' });
  }

  // ✅ CORREÇÃO: Lista completa e atualizada de tipos que podem confirmar atendimentos
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
  
  console.log('🔍 [CONFIRM SESSIONS] Verificação de permissão:', {
    userType: req.user.type,
    allowedTypes,
    canConfirm,
    sector: req.user.sector
  });

  if (!canConfirm) {
    console.log('❌ [CONFIRM SESSIONS] Acesso negado para confirmação:', req.user.type);
    return res.status(403).json({ 
      message: 'Apenas administradores podem confirmar atendimentos',
      userType: req.user.type,
      allowedTypes: allowedTypes,
      details: 'Verifique se seu tipo de usuário tem as permissões necessárias'
    });
  }

  console.log('✅ [CONFIRM SESSIONS] Permissão liberada para:', req.user.type);
  next();
};

// ✅ CORREÇÃO 11: Função auxiliar para debug de permissões
export const debugPermissions = (req, res, next) => {
  console.log('🐛 [DEBUG] Informações de permissão:', {
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      type: req.user.type,
      sector: req.user.sector,
      active: req.user.active
    } : null,
    route: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      query: req.query,
      params: req.params
    },
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'Não presente'
    }
  });
  next();
};