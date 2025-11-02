const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// GET /api/payment-methods - Requer apenas autenticação
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM payment_methods ORDER BY description ASC');
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar formas de pagamento.', error: e.message });
  }
});

// POST /api/payment-methods - Alteração: Requer apenas autenticação
router.post('/', protect, async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ message: 'A descrição é obrigatória.' });
  let c;
  try {
    c = await pool.getConnection();
    await c.beginTransaction();
    const [l] = await c.query('SELECT code FROM payment_methods ORDER BY id DESC LIMIT 1');
    let n = 'PG01';
    if (l.length > 0) {
      const ln = parseInt(l[0].code.replace('PG', ''));
      n = `PG${String(ln + 1).padStart(2, '0')}`;
    }
    const [r] = await c.query('INSERT INTO payment_methods (code, description) VALUES (?, ?)', [n, description]);
    await c.commit();
    const [nr] = await c.query('SELECT * FROM payment_methods WHERE id = ?', [r.insertId]);

    logAction(req, 'CRIAR_FORMA_PAGAMENTO', { formaPagamentoId: nr[0].id, descricao: description });

    res.status(201).json(nr[0]);
  } catch (e) {
    if (c) await c.rollback();
    res.status(500).json({ message: 'Erro ao criar forma de pagamento.', error: e.message });
  } finally {
    if (c) c.release();
  }
});

// PUT /api/payment-methods/:id - Alteração: Requer apenas autenticação
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  if (!description) return res.status(400).json({ message: 'A descrição é obrigatória.' });
  try {
    const [r] = await pool.query('UPDATE payment_methods SET description = ? WHERE id = ?', [description, id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    logAction(req, 'ATUALIZAR_FORMA_PAGAMENTO', { formaPagamentoId: id, descricao: description });

    const [ur] = await pool.query('SELECT * FROM payment_methods WHERE id = ?', [id]);
    res.status(200).json(ur[0]);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.', error: e.message });
  }
});

// DELETE /api/payment-methods/:id - Rota protegida para Admin (sem alterações)
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  try {
    const [[method]] = await pool.query('SELECT description FROM payment_methods WHERE id = ?', [id]);
    if (!method) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    const [r] = await pool.query('DELETE FROM payment_methods WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    logAction(req, 'EXCLUIR_FORMA_PAGAMENTO', `Forma de Pagamento: ${method.description} (ID: ${id})`);

    res.status(200).json({ message: 'Forma de pagamento excluída com sucesso.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao excluir forma de pagamento.', error: e.message });
  }
});

module.exports = router;
