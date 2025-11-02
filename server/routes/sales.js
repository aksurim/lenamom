const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin, canManageStock } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// POST /api/sales - Requer apenas autenticação
router.post('/', protect, async (req, res) => {
  const { customer_id, payment_method_id, total_amount, paid_amount, change_amount, items, shipping_cost } = req.body;
  if (!payment_method_id || !items || items.length === 0) return res.status(400).json({ message: 'A forma de pagamento e pelo menos um item são obrigatórios.' });
  let c;
  try {
    c = await pool.getConnection();
    await c.beginTransaction();
    const [l] = await c.query('SELECT sale_code FROM sales ORDER BY id DESC LIMIT 1');
    let n = 'PED0001';
    if (l.length > 0) {
      const ln = parseInt(l[0].sale_code.replace('PED', ''));
      n = `PED${String(ln + 1).padStart(4, '0')}`;
    }
    const [sr] = await c.query('INSERT INTO sales (sale_code, customer_id, payment_method_id, total_amount, paid_amount, change_amount, shipping_cost) VALUES (?, ?, ?, ?, ?, ?, ?)', [n, customer_id || null, payment_method_id, total_amount, paid_amount, change_amount, shipping_cost || 0]);
    const sId = sr.insertId;
    for (const i of items) {
      const [[p]] = await c.query('SELECT stock_quantity, cost_price FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE', [i.product_id]);
      if (!p || p.stock_quantity < i.quantity) {
        await c.rollback();
        return res.status(400).json({ message: `Estoque insuficiente para o produto ID ${i.product_id}.` });
      }
      await c.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [i.quantity, i.product_id]);
      await c.query('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, cost_price) VALUES (?, ?, ?, ?, ?, ?)', [sId, i.product_id, i.quantity, i.unit_price, i.subtotal, p.cost_price]);
    }
    await c.commit();

    await c.execute(
      'INSERT INTO movimentos_caixa (tipo_movimento, valor, descricao, forma_pagamento_id, usuario_id, referencia_venda_id, data_hora) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      ['entrada_venda', total_amount, `Venda #${n}`, payment_method_id, req.user.id, sId]
    );

    logAction(req, 'REALIZAR_VENDA', { vendaId: sId, codigoVenda: n, valorTotal: total_amount });

    res.status(201).json({ message: 'Venda realizada com sucesso!', saleId: sId, saleCode: n });
  } catch (e) {
    if (c) await c.rollback();
    res.status(500).json({ message: 'Erro ao processar venda.', error: e.message });
  } finally {
    if (c) c.release();
  }
});

// GET /api/sales/:id/details - Requer apenas autenticação
router.get('/:id/details', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const [[sale]] = await pool.query('SELECT s.id, s.sale_code, s.created_at as sale_date, s.total_amount, s.paid_amount, s.change_amount, s.shipping_cost, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?', [id]);
        if (!sale) return res.status(404).json({ message: 'Venda não encontrada.' });
        const [items] = await pool.query('SELECT si.*, p.description FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', [id]);
        res.status(200).json({ ...sale, items });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes da venda.', error: error.message });
    }
});

// --- Movimentação de Estoque ---

router.get('/stock-movements', protect, async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT sm.*, p.code AS product_code, p.description AS product_description FROM stock_movements sm JOIN products p ON sm.product_id = p.id ORDER BY sm.movement_date DESC`);
        res.status(200).json(rows);
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar movimentações de estoque.', error: e.message});
    }
});

router.post('/stock-movements', protect, canManageStock, async (req, res) => {
    const { product_id, quantity, observation } = req.body;
    const qn = parseInt(quantity, 10);
    if (!product_id || !qn) return res.status(400).json({ message: 'Produto e quantidade são obrigatórios.' });
    const mt = qn > 0 ? 'ENTRADA' : 'SAIDA_MANUAL';
    if (mt === 'SAIDA_MANUAL' && !observation) return res.status(400).json({ message: 'A observação é obrigatória para baixa manual de estoque.' });
    let c;
    try {
        c = await pool.getConnection();
        await c.beginTransaction();
        await c.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [qn, product_id]);
        await c.query('INSERT INTO stock_movements (product_id, quantity, type, observation) VALUES (?, ?, ?, ?)', [product_id, qn, mt, observation || null]);
        await c.commit();

        logAction(req, 'MOVIMENTAR_ESTOQUE', { produtoId: product_id, quantidade: qn, tipo: mt, observacao: observation });

        res.status(201).json({ message: 'Movimentação de estoque registrada com sucesso.' });
    } catch (e) {
        if (c) await c.rollback();
        res.status(500).json({message: 'Erro ao registrar movimentação de estoque.', error: e.message});
    } finally {
        if (c) c.release();
    }
});

module.exports = router;
