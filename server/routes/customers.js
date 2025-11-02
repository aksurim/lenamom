const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// Função auxiliar para formatar a data
const formatDateForDb = (dateString) => {
  if (!dateString) {
    return null;
  }
  // A data pode vir como 'YYYY-MM-DD' ou no formato ISO 'YYYY-MM-DDTHH:mm:ss.sssZ'
  // Pegamos apenas a parte da data.
  return dateString.split('T')[0];
};

// GET /api/customers - Requer apenas autenticação
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY name ASC');
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar clientes.', error: e.message });
  }
});

// POST /api/customers - Alteração: Requer apenas autenticação
router.post('/', protect, async (req, res) => {
  const { name, document, phone, email, address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode, birth_date } = req.body;
  if (!name) return res.status(400).json({ message: 'O nome do cliente é obrigatório.' });
  let c;
  try {
    c = await pool.getConnection();
    await c.beginTransaction();
    const [l] = await c.query('SELECT code FROM customers ORDER BY id DESC LIMIT 1');
    let n = 'CLI001';
    if (l.length > 0) {
      const ln = parseInt(l[0].code.replace('CLI', ''));
      n = `CLI${String(ln + 1).padStart(3, '0')}`;
    }
    const finalBirthDate = formatDateForDb(birth_date);
    const [r] = await c.query('INSERT INTO customers (code, name, document, phone, email, address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode, birth_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [n, name, document, phone, email, address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode, finalBirthDate]);
    await c.commit();
    const [nr] = await c.query('SELECT * FROM customers WHERE id = ?', [r.insertId]);

    logAction(req, 'CRIAR_CLIENTE', { clienteId: nr[0].id, nome: name });

    res.status(201).json(nr[0]);
  } catch (e) {
    if (c) await c.rollback();
    console.error("ERRO AO CRIAR CLIENTE:", e);
    res.status(500).json({ message: 'Erro ao criar cliente.', error: e.message });
  } finally {
    if (c) c.release();
  }
});

// PUT /api/customers/:id - Alteração: Requer apenas autenticação
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { name, document, phone, email, address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode, birth_date } = req.body;
  if (!name) return res.status(400).json({ message: 'O nome do cliente é obrigatório.' });

  try {
    const finalBirthDate = formatDateForDb(birth_date);

    const [r] = await pool.query(
      'UPDATE customers SET name = ?, document = ?, phone = ?, email = ?, address_street = ?, address_number = ?, address_neighborhood = ?, address_city = ?, address_state = ?, address_zipcode = ?, birth_date = ? WHERE id = ?',
      [name, document, phone, email, address_street, address_number, address_neighborhood, address_city, address_state, address_zipcode, finalBirthDate, id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });

    logAction(req, 'ATUALIZAR_CLIENTE', { clienteId: id, nome: name });

    const [ur] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    res.status(200).json(ur[0]);
  } catch (e) {
    console.error("ERRO AO ATUALIZAR CLIENTE:", e);
    res.status(500).json({ message: 'Erro ao atualizar cliente.', error: e.message });
  }
});

// DELETE /api/customers/:id - Rota protegida para Admin
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  try {
    const [[customer]] = await pool.query('SELECT name FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    const [sales] = await pool.query('SELECT id FROM sales WHERE customer_id = ? LIMIT 1', [id]);
    if (sales.length > 0) {
      return res.status(400).json({ message: 'Este cliente não pode ser excluído, pois possui um histórico de compras registrado.' });
    }

    const [r] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado para exclusão.' });
    }

    logAction(req, 'EXCLUIR_CLIENTE', `Cliente: ${customer.name} (ID: ${id})`);

    res.status(200).json({ message: 'Cliente excluído com sucesso.' });
  } catch (e) {
    console.error("ERRO AO EXCLUIR CLIENTE:", e);
    res.status(500).json({ message: 'Erro no servidor ao tentar excluir o cliente.', error: e.message });
  }
});

// GET /api/customers/:id/purchase-history - Requer apenas autenticação
router.get('/:id/purchase-history', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const [[customer]] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    const [sales] = await pool.query(
      'SELECT id, sale_code, created_at, total_amount FROM sales WHERE customer_id = ? ORDER BY created_at DESC',
      [id]
    );

    const salesWithItems = await Promise.all(sales.map(async (sale) => {
      const [items] = await pool.query(
        'SELECT si.quantity, si.unit_price, si.subtotal, p.description FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?',
        [sale.id]
      );
      return { ...sale, items };
    }));

    res.status(200).json(salesWithItems);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar histórico de compras.', error: e.message });
  }
});

// GET /api/customers/:id/purchase-profile - Requer apenas autenticação
router.get('/:id/purchase-profile', protect, async (req, res) => {
    const { id } = req.params;
    try {
        const [mostPurchased] = await pool.query(`
            SELECT p.description, SUM(si.quantity) as total_quantity
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.customer_id = ?
            GROUP BY p.id, p.description
            ORDER BY total_quantity DESC
            LIMIT 5
        `, [id]);

        const [sales] = await pool.query('SELECT created_at FROM sales WHERE customer_id = ? ORDER BY created_at ASC', [id]);
        const purchaseCount = sales.length;
        let frequency = 'N/A';
        if (purchaseCount > 1) {
            const firstPurchase = new Date(sales[0].created_at);
            const lastPurchase = new Date(sales[purchaseCount - 1].created_at);
            const diffTime = Math.abs(lastPurchase - firstPurchase);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) {
                frequency = `${(purchaseCount / (diffDays / 30)).toFixed(2)} compras/mês`;
            } else {
                frequency = `${purchaseCount} compras no mesmo dia`;
            }
        } else if (purchaseCount === 1) {
            frequency = '1 compra registrada';
        }

        res.status(200).json({
            mostPurchased,
            purchaseCount,
            frequency
        });

    } catch (e) {
        res.status(500).json({ message: 'Erro ao gerar relatório de perfil de compra.', error: e.message });
    }
});

module.exports = router;
