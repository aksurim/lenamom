const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// GET /api/suppliers - Requer apenas autenticação
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar fornecedores.', error: e.message });
  }
});

// POST /api/suppliers - Alteração: Requer apenas autenticação
router.post('/', protect, async (req, res) => {
  const { name, document, sales_person, email, phone1, phone2, phone3, address_street, address_number, address_neighborhood, address_state } = req.body;
  if (!name) return res.status(400).json({ message: 'O nome do fornecedor é obrigatório.' });
  let c;
  try {
    c = await pool.getConnection();
    await c.beginTransaction();
    const [l] = await c.query('SELECT code FROM suppliers ORDER BY id DESC LIMIT 1');
    let n = 'FORN0001';
    if (l.length > 0) {
      const ln = parseInt(l[0].code.replace('FORN', ''));
      n = `FORN${String(ln + 1).padStart(4, '0')}`;
    }
    const [r] = await c.query('INSERT INTO suppliers (code, name, document, sales_person, email, phone1, phone2, phone3, address_street, address_number, address_neighborhood, address_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [n, name, document, sales_person, email, phone1, phone2, phone3, address_street, address_number, address_neighborhood, address_state]);
    await c.commit();
    const [nr] = await c.query('SELECT * FROM suppliers WHERE id = ?', [r.insertId]);

    logAction(req, 'CRIAR_FORNECEDOR', { fornecedorId: nr[0].id, nome: name });

    res.status(201).json(nr[0]);
  } catch (e) {
    if (c) await c.rollback();
    res.status(500).json({ message: 'Erro ao criar fornecedor.', error: e.message });
  } finally {
    if (c) c.release();
  }
});

// PUT /api/suppliers/:id - Alteração: Requer apenas autenticação
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { name, document, sales_person, email, phone1, phone2, phone3, address_street, address_number, address_neighborhood, address_state } = req.body;
  if (!name) return res.status(400).json({ message: 'O nome do fornecedor é obrigatório.' });
  try {
    const [r] = await pool.query('UPDATE suppliers SET name = ?, document = ?, sales_person = ?, email = ?, phone1 = ?, phone2 = ?, phone3 = ?, address_street = ?, address_number = ?, address_neighborhood = ?, address_state = ? WHERE id = ?', [name, document, sales_person, email, phone1, phone2, phone3, address_street, address_number, address_neighborhood, address_state, id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    logAction(req, 'ATUALIZAR_FORNECEDOR', { fornecedorId: id, nome: name });

    const [ur] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.status(200).json(ur[0]);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao atualizar fornecedor.', error: e.message });
  }
});

// DELETE /api/suppliers/:id - Rota protegida para Admin (sem alterações)
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  try {
    const [[supplier]] = await pool.query('SELECT name FROM suppliers WHERE id = ?', [id]);
    if (!supplier) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    const [r] = await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    logAction(req, 'EXCLUIR_FORNECEDOR', `Fornecedor: ${supplier.name} (ID: ${id})`);

    res.status(200).json({ message: 'Fornecedor excluído com sucesso.' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(400).json({ message: 'Não é possível excluir o fornecedor: ele está associado a um ou mais produtos.' });
    res.status(500).json({ message: 'Erro ao excluir fornecedor.', error: e.message });
  }
});

module.exports = router;
