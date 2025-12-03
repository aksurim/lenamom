const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

function generateEAN13(base_code) {
  if (String(base_code).length !== 12) throw new Error("A base para o EAN-13 deve ter 12 dígitos.");
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base_code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base_code + checkDigit;
}

// ROTA COM O LAYOUT FINAL E DEFINITIVO
router.post('/generate-label', protect, async (req, res) => {
    const { productId } = req.body;
    if (!productId) {
        return res.status(400).json({ message: 'O ID do produto é obrigatório.' });
    }

    try {
        const [[product]] = await pool.query('SELECT code, description, barcode, sale_price FROM products WHERE id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }

        const formattedPrice = `R$ ${parseFloat(product.sale_price).toFixed(2).replace('.', ',')}`;

        // Definições de Layout Finais
        const col1_Y = 0;
        const col2_Y = 120;

        const line1_X = 20;
        const line2_X = 50;
        const line3_X = 75;

        const maxChars = 22;

        // Montagem do Comando TSPL
        let tspl = '';
        tspl += 'SIZE 60 mm, 12 mm\r\n';
        tspl += 'GAP 2 mm, 0 mm\r\n';
        tspl += 'CODEPAGE 850\r\n'; // Adicionado para suportar acentuação
        tspl += 'REFERENCE 0,0\r\n';
        tspl += 'DIRECTION 1\r\n';
        tspl += 'CLS\r\n';

        // --- Coluna 1 ---
        tspl += `TEXT ${col1_Y}, ${line1_X}, "1", 0, 1, 2, "LENAMOM"\r\n`;
        tspl += `TEXT ${col1_Y}, ${line3_X}, "1", 0, 1, 2, "${formattedPrice}"\r\n`;

        // --- Coluna 2 ---
        tspl += `BARCODE ${col2_Y}, ${line1_X}, "128", 25, 0, 0, 2, 4, "${product.code}"\r\n`;
        tspl += `TEXT ${col2_Y}, ${line2_X}, "1", 0, 1, 1, "${product.code}"\r\n`;
        tspl += `TEXT ${col2_Y}, ${line3_X}, "1", 0, 1, 1, "${product.description.substring(0, maxChars)}"\r\n`;

        tspl += 'PRINT 1,1\r\n';

        res.status(200).json({
            tsplCommand: tspl,
            labelData: { ...product, sale_price: formattedPrice }
        });

    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar comando da etiqueta.', error: error.message });
    }
});

// Rota para enviar o comando da etiqueta para a impressora (sem alterações)
router.post('/send-label-command', protect, async (req, res) => {
    const { tsplCommand, copies } = req.body;
    if (!tsplCommand || !copies) {
        return res.status(400).json({ message: 'O comando TSPL e o número de cópias são obrigatórios.' });
    }
    const numCopies = parseInt(copies, 10);
    if (isNaN(numCopies) || numCopies <= 0) {
        return res.status(400).json({ message: 'O número de cópias deve ser um número positivo.' });
    }
    try {
        res.status(200).json({ message: `Comando recebido para ${numCopies} cópias. Envio via WebUSB é feito no cliente.` });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.', error: error.message });
    }
});


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

// GET /api/products/search - Rota para busca na TELA DE VENDAS
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

// GET /api/products/search-for-stock - Rota para busca na TELA DE ESTOQUE
router.get('/search-for-stock', protect, async (req, res) => {
  const query = req.query.q || '';
  if (query.length < 2) return res.status(200).json([]);
  try {
    const searchQuery = `%${query}%`;
    // Mesma busca, mas SEM a restrição de 'stock_quantity > 0'
    const [rows] = await pool.query('SELECT * FROM products WHERE (code LIKE ? OR description LIKE ? OR barcode LIKE ?) AND is_active = TRUE LIMIT 10', [searchQuery, searchQuery, searchQuery]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos para estoque', error: error.message });
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

    const internalPrefix = '2811';
    const productCode = String(newProductId).padStart(8, '0');
    const eanBase = internalPrefix + productCode;
    const barcode = generateEAN13(eanBase);
    await connection.query('UPDATE products SET barcode = ? WHERE id = ?', [barcode, newProductId]);

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
