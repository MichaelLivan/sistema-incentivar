import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

// ✅ LOGS DE INICIALIZAÇÃO MELHORADOS
console.log('🚀 [SERVER] Iniciando servidor...');
console.log('📂 [SERVER] __dirname:', __dirname);
console.log('🔑 [SERVER] JWT_SECRET:', process.env.JWT_SECRET ? '✅ Configurado' : '❌ AUSENTE');
console.log('🗄️ [SERVER] SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ AUSENTE');
console.log('🔐 [SERVER] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ AUSENTE');

// ✅ VERIFICAÇÃO CRÍTICA DE VARIÁVEIS
const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ [SERVER] ERRO CRÍTICO: Variáveis de ambiente ausentes:', missingVars);
  console.error('📋 [SERVER] Verifique se o arquivo .env contém:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}=valor_correto`);
  });
  process.exit(1);
}

// ✅ IMPORTAR ROTAS APÓS VERIFICAÇÃO
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import sessionRoutes from './routes/sessions.js';
import supervisionRoutes from './routes/supervisions.js';
import settingsRoutes from './routes/settings.js'; 

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🌐 [SERVER] NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('🚪 [SERVER] PORT:', PORT);
console.log('🎯 [SERVER] FRONTEND_URL:', process.env.FRONTEND_URL || 'http://localhost:5173');

// ✅ CONFIGURAÇÃO DE SEGURANÇA MELHORADA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// ✅ RATE LIMITING APRIMORADO
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Aumentado para 200 requests por IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ CORS CONFIGURADO CORRETAMENTE
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 [CORS] Origin não permitida:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

app.use(cors(corsOptions));

// ✅ MIDDLEWARE DE PARSING
app.use(express.json({ 
  limit: '10mb',
  strict: false
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// ✅ LOGGING MELHORADO
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ✅ MIDDLEWARE DE LOG PARA DEBUG
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`, {
    headers: req.headers.authorization ? 'Bearer ***' : 'No Auth',
    body: req.body && Object.keys(req.body).length > 0 ? Object.keys(req.body) : 'Empty',
    query: Object.keys(req.query).length > 0 ? req.query : 'Empty'
  });
  next();
});

// ✅ SERVIR ARQUIVOS ESTÁTICOS EM PRODUÇÃO
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 [SERVER] Serving React build from dist folder...');
  
  const distPath = join(__dirname, '..', 'dist');
  console.log('📁 [SERVER] Static files path:', distPath);
  
  app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));
}

// ✅ API ROUTES COM LOGS
console.log('📋 [SERVER] Configurando rotas da API...');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/supervisions', supervisionRoutes);
app.use('/api/settings', settingsRoutes);

console.log('✅ [SERVER] Rotas da API configuradas');

// ✅ HEALTH CHECK APRIMORADO
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontend: process.env.NODE_ENV === 'production' ? 'Serving from dist' : 'Development mode',
    database: {
      supabase: !!process.env.SUPABASE_URL,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    auth: {
      jwtSecret: !!process.env.JWT_SECRET,
      configured: true
    },
    server: {
      port: PORT,
      cors: true,
      rateLimit: true
    }
  };
  
  console.log('💓 [HEALTH] Health check solicitado:', healthData);
  res.json(healthData);
});

// ✅ ROTA DE DEBUG PARA ADMIN
app.get('/api/debug/env', (req, res) => {
  // Só permitir em desenvolvimento ou com token de admin
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Debug endpoint disabled in production' });
  }
  
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    jwtSecret: !!process.env.JWT_SECRET,
    supabaseUrl: !!process.env.SUPABASE_URL,
    supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// ✅ REACT ROUTER - CATCH ALL HANDLER (PRODUÇÃO)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Não interceptar rotas da API
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ 
        message: 'API route not found',
        path: req.path,
        method: req.method
      });
    }
    
    // Servir index.html para todas as outras rotas (React Router)
    console.log('📄 [SERVER] Serving React app for route:', req.path);
    const indexPath = join(__dirname, '..', 'dist', 'index.html');
    res.sendFile(indexPath);
  });
}

// ✅ ERROR HANDLING MIDDLEWARE MELHORADO
app.use((err, req, res, next) => {
  console.error('❌ [ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Erro de CORS
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      message: 'CORS error - origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Erro de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid JSON payload'
    });
  }
  
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
});

// ✅ 404 HANDLER PARA DESENVOLVIMENTO
if (process.env.NODE_ENV !== 'production') {
  app.use('*', (req, res) => {
    console.log('❌ [404] Route not found:', req.method, req.originalUrl);
    res.status(404).json({ 
      message: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      availableRoutes: [
        'GET /api/health',
        'POST /api/auth/login',
        'GET /api/auth/verify',
        'GET /api/users',
        'POST /api/users',
        'GET /api/patients',
        'GET /api/sessions',
        'GET /api/supervisions'
      ]
    });
  });
}

// ✅ GRACEFUL SHUTDOWN
process.on('SIGTERM', () => {
  console.log('📴 [SERVER] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 [SERVER] SIGINT received, shutting down gracefully');
  process.exit(0);
});

// ✅ INICIALIZAR SERVIDOR
const server = app.listen(PORT, () => {
  console.log('🎉 [SERVER] ==========================================');
  console.log(`🚀 [SERVER] Server running on port ${PORT}`);
  console.log(`🌍 [SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💊 [SERVER] Health check: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('📱 [SERVER] Frontend: Serving React build');
    console.log(`🔗 [SERVER] App URL: http://localhost:${PORT}`);
  } else {
    console.log('🛠️ [SERVER] Development mode - Frontend served separately');
    console.log(`🔧 [SERVER] Debug endpoint: http://localhost:${PORT}/api/debug/env`);
  }
  
  console.log('🎉 [SERVER] ==========================================');
});

// ✅ HANDLE SERVER ERRORS
server.on('error', (error) => {
  console.error('❌ [SERVER] Server error:', error);
  
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ [SERVER] Port ${PORT} is already in use`);
    console.error('💡 [SERVER] Try a different port or kill the process using this port');
  }
});

export default app;