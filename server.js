const express = require('express');
const winston = require('winston');
const logger = require('./logger');
const cnpjRoutes = require('./routes/cnpj');
const emailRoutes = require('./routes/email');
const stripeRoutes = require('./routes/stripe');
const teamRoutes = require('./routes/team');
const uploadRoutes = require('./routes/upload');
const storageRoutes = require('./routes/storage');
const notificationsRoutes = require('./routes/notifications');
const signupRoutes = require('./routes/signup');
const securityRoutes = require('./routes/security');
const validateRouter = require('./routes/validate');
const loginRoutes = require('./routes/login');
const fetch = require('node-fetch'); // 👈 Adicionado para o disparador

const app = express();
const PORT = process.env.PORT || 3000;
const SELF_URL = 'https://nuvex-pc02.onrender.com'; // 👈 Substitua pela URL real do backend no Render

const FRONTEND_URLS = [
  'http://localhost:8080',
  'https://nuvex-pc02.onrender.com',
  'https://nuvexenterprise.com.br',
  process.env.CORS_ORIGIN
].filter(Boolean);

// Log para debug
console.log('Allowed origins:', FRONTEND_URLS);

app.set('trust proxy', 1);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (FRONTEND_URLS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/cnpj', cnpjRoutes);
app.use('/email', emailRoutes);
app.use('/stripe', stripeRoutes);
app.use('/team', teamRoutes);
app.use('/upload', uploadRoutes);
app.use('/storage', storageRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/signup', signupRoutes);
app.use('/security', securityRoutes);
app.use('/validate', validateRouter);
app.use('/login', loginRoutes);

app.use((err, req, res, next) => {
  logger.error('Erro inesperado:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);

  // Sistema de keep-alive para evitar timeout no Render
  const pingInterval = 1000 * 60 * 10; // A cada 10 minutos
  let failedAttempts = 0;

  const keepAlive = async () => {
    try {
      const response = await fetch(SELF_URL);
      if (response.ok) {
        logger.info(`[Keep-Alive] Ping bem sucedido (${response.status})`);
        failedAttempts = 0;
      } else {
        failedAttempts++;
        logger.warn(`[Keep-Alive] Falha no ping (${response.status}) - Tentativa ${failedAttempts}`);
      }
    } catch (error) {
      failedAttempts++;
      logger.error(`[Keep-Alive] Erro no ping: ${error.message} - Tentativa ${failedAttempts}`);
    }

    // Se houver muitas falhas consecutivas, aumenta o intervalo temporariamente
    if (failedAttempts > 3) {
      setTimeout(keepAlive, pingInterval * 2);
    } else {
      setTimeout(keepAlive, pingInterval);
    }
  };

  // Inicia o sistema de keep-alive
  keepAlive();
});