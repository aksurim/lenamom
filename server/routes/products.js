const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// --- Função para Geração de Código de Barras EAN-13 ---
function generateEAN13(base_code) {
  if (String(base_code).length !== 12) throw new Error("A base para o EAN-13 deve ter 12 dígitos.");
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base_code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base_code + checkDigit;
}

// GET /api/products - Rota pública para listar produtos
router.get('/', async (req, res) => {
  const { includeInactive } = req.query;
  let query = `SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id`;
  if (includeInactive !== 'true') {
    query += ` WHERE p.is_active = TRUE`;
  }
  query += ` ORDER BY p.code ASC`;
  try {
    const [rows] = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos', error: error.message });
  }
});

// GET /api/products/search - Rota pública para buscar produtos
router.get('/search', async (req, res) => {
  const query = req.query.q || '';
  if (query.length < 2) return res.status(200).json([]);
  try {
    const searchQuery = `%${query}%`;
    const [rows] = await pool.query('SELECT * FROM products WHERE (code LIKE ? OR description LIKE ? OR barcode LIKE ?) AND stock_quantity > 0 AND is_active = TRUE LIMIT 10', [searchQuery, searchQuery, searchQuery]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos', error: error.message });
  }
});

// POST /api/products - Alteração: Requer apenas autenticação
router.post('/', protect, async (req, res) => {
  const { description, unit, cost_price, sale_price, min_quantity, supplier_id } = req.body;
  if (description == null || unit == null || cost_price == null || sale_price == null || min_quantity == null || supplier_id == null) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [lastProduct] = await connection.query('SELECT code FROM products ORDER BY id DESC LIMIT 1');
    let newCode = 'LEN0001';
    if (lastProduct.length > 0) {
      const lastCode = lastProduct[0].code;
      const lastNumber = parseInt(lastCode.replace('LEN', ''));
      newCode = `LEN${String(lastNumber + 1).padStart(4, '0')}`;
    }
    const [result] = await connection.query('INSERT INTO products (code, description, unit, cost_price, sale_price, min_quantity, stock_quantity, supplier_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)', [newCode, description, unit, parseFloat(cost_price), parseFloat(sale_price), parseInt(min_quantity), 0, parseInt(supplier_id)]);
    const newProductId = result.insertId;

    // --- Geração do Código de Barras ---
    const companyPrefix = '78989012'; // 8 dígitos (País + Empresa)
    const productCode = String(newProductId).padStart(4, '0'); // 4 dígitos para o produto
    const eanBase = companyPrefix + productCode;
    const barcode = generateEAN13(eanBase);
    await connection.query('UPDATE products SET barcode = ? WHERE id = ?', [barcode, newProductId]);
    // --- Fim da Geração ---

    await connection.commit();
    const [newProductRows] = await connection.query('SELECT * FROM products WHERE id = ?', [newProductId]);

    logAction(req, 'CRIAR_PRODUTO', { produtoId: newProductRows[0].id, nome: newProductRows[0].description });

    res.status(201).json(newProductRows[0]);
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Erro ao criar produto', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT /api/products/:id - Alteração: Requer apenas autenticação
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { description, unit, cost_price, sale_price, min_quantity, supplier_id, is_active } = req.body;

  try {
    const [[productBefore]] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!productBefore) return res.status(404).json({ message: 'Produto não encontrado' });

    let query, params;
    if (is_active !== undefined) {
      if (req.user.perfil !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem alterar o status do produto.' });
      }
      query = 'UPDATE products SET is_active = ? WHERE id = ?';
      params = [is_active, id];
      logAction(req, is_active ? 'REATIVAR_PRODUTO' : 'INATIVAR_PRODUTO', `Produto: ${productBefore.description} (ID: ${id})`);
    } else {
      if (description == null || unit == null || cost_price == null || sale_price == null || min_quantity == null || supplier_id == null) {
          return res.status(400).json({ message: 'Todos os campos obrigatórios para atualização devem ser fornecidos.' });
      }
      query = 'UPDATE products SET description = ?, unit = ?, cost_price = ?, sale_price = ?, min_quantity = ?, supplier_id = ? WHERE id = ?';
      params = [description, unit, parseFloat(cost_price), parseFloat(sale_price), parseInt(min_quantity), parseInt(supplier_id), id];
      logAction(req, 'ATUALIZAR_PRODUTO', { produtoId: id, nome: description, dados: req.body });
    }

    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Produto não encontrado' });

    const [updatedProductRows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    res.status(200).json(updatedProductRows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar produto', error: error.message });
  }
});

// DELETE /api/products/:id - Rota protegida para Admin (sem alterações)
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;
  try {
    const [[product]] = await pool.query('SELECT description FROM products WHERE id = ?', [id]);
    if (!product) return res.status(404).json({ message: 'Produto não encontrado' });

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    logAction(req, 'EXCLUIR_PRODUTO', `Produto: ${product.description} (ID: ${id})`);
    res.status(200).json({ message: 'Produto excluído permanentemente com sucesso.' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      try {
        const [[product]] = await pool.query('SELECT description FROM products WHERE id = ?', [id]);
        await pool.query('UPDATE products SET is_active = false WHERE id = ?', [id]);
        logAction(req, 'INATIVAR_PRODUTO_POR_DEPENDENCIA', `Produto: ${product.description} (ID: ${id})`);
        return res.status(200).json({ message: 'Produto inativado com sucesso pois possui histórico de movimentações.' });
      } catch (inactivateError) {
        return res.status(500).json({ message: 'Erro ao tentar inativar o produto.', error: inactivateError.message });
      }
    }
    res.status(500).json({ message: 'Erro ao excluir produto.', error: error.message });
  }
});

module.exports = router;
