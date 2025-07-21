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

// Verificação de debug
console.log('🚀 Starting server...');
console.log('📂 __dirname:', __dirname);
console.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? 'OK' : 'MISSING');

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import sessionRoutes from './routes/sessions.js';
import supervisionRoutes from './routes/supervisions.js';
import settingsRoutes from './routes/settings.js'; 

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server...');
console.log('Environment file path:', join(__dirname, '.', '.env'));
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configured' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Servir arquivos estáticos do build do React (EM PRODUÇÃO)
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Serving React build from dist folder...');
  
  // Servir arquivos estáticos da pasta dist
  app.use(express.static(join(__dirname, '..', 'dist')));
  
  console.log('📁 Static files path:', join(__dirname, '..', 'dist'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/supervisions', supervisionRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    frontend: process.env.NODE_ENV === 'production' ? 'Serving from dist' : 'Development mode'
  });
});

// React Router - Catch all handler (DEVE VIR DEPOIS DAS ROTAS DA API)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Não interceptar rotas da API
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    
    // Servir index.html para todas as outras rotas (React Router)
    console.log('📄 Serving React app for route:', req.path);
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler para desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💊 Health check: http://localhost:${PORT}/api/health`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('📱 Frontend: Serving React build');
    console.log('🔗 App URL: http://localhost:${PORT}');
  } else {
    console.log('🛠️ Development mode - Frontend served separately');
  }
});
