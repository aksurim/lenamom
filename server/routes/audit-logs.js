const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');

// Todas as rotas neste arquivo são protegidas e requerem perfil de admin
router.use(protect, admin);

// GET /api/audit-logs - Listar todos os logs de auditoria
router.get('/', async (req, res) => {
  try {
    const [logs] = await pool.query('SELECT al.id, al.usuario_id, al.acao, al.detalhes, al.data_hora, COALESCE(u.nome, al.usuario_nome) AS usuario_nome FROM auditoria_logs al LEFT JOIN usuarios u ON al.usuario_id = u.id ORDER BY al.data_hora DESC');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar logs de auditoria.', error: error.message });
  }
});

module.exports = router;
