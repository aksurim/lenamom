const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware'); // Removido 'admin' pois a lógica de perfil está no corpo
const { logAction } = require('../services/auditLogService');

// GET /api/stock-movements - Listar todas as movimentações
router.get('/', protect, async (req, res) => {
  try {
    const query = `
      SELECT 
        sm.id,
        p.code as product_code,
        p.description as product_description,
        sm.quantity,
        sm.type,
        sm.observation,
        sm.movement_date
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.movement_date DESC
    `;
    const [movements] = await pool.query(query);
    res.status(200).json(movements);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar movimentações de estoque.', error: error.message });
  }
});

// POST /api/stock-movements - Criar uma nova movimentação
router.post('/', protect, async (req, res) => {
  const { product_id, quantity, observation } = req.body;
  const quantityNum = parseInt(quantity, 10);

  if (!product_id || !quantity || isNaN(quantityNum) || quantityNum === 0) {
    return res.status(400).json({ message: 'ID do produto e quantidade (diferente de zero) são obrigatórios.' });
  }

  // Apenas admins podem fazer saídas manuais
  if (quantityNum < 0 && req.user.perfil !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem registrar saídas de estoque.' });
  }
  
  if (quantityNum < 0 && !observation) {
    return res.status(400).json({ message: 'A observação é obrigatória para saídas de estoque.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [[product]] = await connection.query('SELECT stock_quantity, description FROM products WHERE id = ? FOR UPDATE', [product_id]);
    if (!product) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    if (quantityNum < 0 && product.stock_quantity < Math.abs(quantityNum)) {
      await connection.rollback();
      return res.status(400).json({ message: `Estoque insuficiente para o produto "${product.description}". Em estoque: ${product.stock_quantity}` });
    }

    await connection.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [quantityNum, product_id]);

    const movementType = quantityNum > 0 ? 'ENTRADA' : 'SAIDA_MANUAL';
    
    // CORREÇÃO: Removida a coluna 'user_id' da query
    await connection.query(
      'INSERT INTO stock_movements (product_id, quantity, type, observation, movement_date) VALUES (?, ?, ?, ?, NOW())',
      [product_id, quantityNum, movementType, observation || null]
    );
    
    await connection.commit();

    // Log de auditoria (sem user_id direto na tabela, mas ainda registrando a ação)
    const logMessage = `${movementType}: ${quantityNum}x ${product.description} (Usuário: ${req.user.username})`;
    logAction(req, 'MOVIMENTACAO_ESTOQUE', { logMessage, details: req.body });

    res.status(201).json({ message: 'Movimentação de estoque registrada com sucesso.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro detalhado ao registrar movimentação:", error); // Adicionado log de erro detalhado
    res.status(500).json({ message: 'Erro ao registrar movimentação de estoque.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
