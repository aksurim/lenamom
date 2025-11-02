console.log('--- Iniciando arquivo do servidor... ---');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Importação de Rotas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const customerRoutes = require('./routes/customers');
const paymentMethodRoutes = require('./routes/payment-methods');
const salesRoutes = require('./routes/sales');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const auditLogRoutes = require('./routes/audit-logs');
const cashMovementRoutes = require('./routes/cash-movements');

const app = express();
const port = process.env.PORT || 3002;

// --- Middlewares Globais ---
app.use(cors());
app.use(express.json());

// --- Servir Arquivos Estáticos do Frontend ---
app.use(express.static(path.join(__dirname, '../dist')));

console.log('--- Definindo rotas da API... ---');

// --- Uso das Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/cash-movements', cashMovementRoutes);

// --- Rota de Fallback para o Frontend ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

console.log('--- Servidor pronto e escutando... ---');

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${port}`);
});
