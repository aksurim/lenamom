const express = require('express');
const router = express.Router();
const db = require('../db'); // Assumindo que db.js exporta a conexão com o banco
const { protect, admin } = require('../middleware/authMiddleware'); // Importa os middlewares de autenticação

// @desc    Registrar uma nova entrada avulsa no caixa
// @route   POST /api/cash-movements/entry
// @access  Private (apenas usuários logados)
router.post('/entry', protect, async (req, res) => {
  const { valor, descricao, forma_pagamento_id } = req.body;
  const usuario_id = req.user.id; // ID do usuário logado, definido pelo middleware protect

  if (!valor || !descricao || !forma_pagamento_id) {
    return res.status(400).json({ message: 'Por favor, forneça valor, descrição e forma de pagamento.' });
  }

  if (valor <= 0) {
    return res.status(400).json({ message: 'O valor da entrada deve ser positivo.' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO movimentos_caixa (tipo_movimento, valor, descricao, forma_pagamento_id, usuario_id) VALUES (?, ?, ?, ?, ?)',
      ['entrada_avulsa', valor, descricao, forma_pagamento_id, usuario_id]
    );

    res.status(201).json({
      message: 'Entrada avulsa registrada com sucesso.',
      movimentoId: result.insertId,
    });
  } catch (error) {
    console.error('Erro ao registrar entrada avulsa:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar entrada avulsa.' });
  }
});

// @desc    Registrar uma nova saída (despesa) do caixa
// @route   POST /api/cash-movements/expense
// @access  Private (apenas usuários logados)
router.post('/expense', protect, async (req, res) => {
  // ALTERAÇÃO: Adicionado forma_pagamento_id
  const { valor, descricao, forma_pagamento_id } = req.body;
  const usuario_id = req.user.id; // ID do usuário logado, definido pelo middleware protect

  // ALTERAÇÃO: Adicionada validação para forma_pagamento_id
  if (!valor || !descricao || !forma_pagamento_id) {
    return res.status(400).json({ message: 'Por favor, forneça valor, descrição e forma de pagamento para a saída.' });
  }

  if (valor <= 0) {
    return res.status(400).json({ message: 'O valor da saída deve ser positivo.' });
  }

  try {
    // ALTERAÇÃO: Adicionado forma_pagamento_id ao INSERT
    const [result] = await db.execute(
      'INSERT INTO movimentos_caixa (tipo_movimento, valor, descricao, forma_pagamento_id, usuario_id) VALUES (?, ?, ?, ?, ?)',
      ['saida', valor, descricao, forma_pagamento_id, usuario_id]
    );

    res.status(201).json({
      message: 'Saída registrada com sucesso.',
      movimentoId: result.insertId,
    });
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar saída.' });
  }
});

// @desc    Obter movimentos de caixa (do dia ou por período)
// @route   GET /api/cash-movements
// @access  Private (apenas usuários logados)
router.get('/', protect, async (req, res) => {
  const { startDate, endDate } = req.query; // Parâmetros opcionais para filtrar por período
  const usuario_id = req.user.id; // Para futuras restrições, se necessário

  let query = `
    SELECT
        mc.id,
        mc.data_hora,
        mc.tipo_movimento,
        mc.valor,
        mc.descricao,
        mc.detalhes,
        u.nome AS usuario_nome,
        pm.description AS forma_pagamento_descricao,
        mc.referencia_venda_id
    FROM
        movimentos_caixa mc
    LEFT JOIN
        usuarios u ON mc.usuario_id = u.id
    LEFT JOIN
        payment_methods pm ON mc.forma_pagamento_id = pm.id
    WHERE 1=1
  `;
  const params = [];

  if (startDate && endDate) {
    query += ' AND mc.data_hora BETWEEN ? AND ?';
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  } else {
    // Se não houver período, busca os movimentos do dia atual
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    query += ' AND mc.data_hora BETWEEN ? AND ?';
    params.push(`${today} 00:00:00`, `${today} 23:59:59`);
  }

  query += ' ORDER BY mc.data_hora DESC';

  try {
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar movimentos de caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar movimentos de caixa.' });
  }
});

// @desc    Excluir um movimento avulso do caixa (apenas para administradores)
// @route   DELETE /api/cash-movements/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  const { id } = req.params;

  try {
    // Verifica se o movimento existe e se é um tipo que pode ser excluído (entrada_avulsa ou saida)
    const [movimento] = await db.execute(
      'SELECT tipo_movimento FROM movimentos_caixa WHERE id = ?',
      [id]
    );

    if (movimento.length === 0) {
      return res.status(404).json({ message: 'Movimento de caixa não encontrado.' });
    }

    if (movimento[0].tipo_movimento === 'entrada_venda') {
      return res.status(403).json({ message: 'Não é permitido excluir movimentos de caixa gerados por vendas.' });
    }

    const [result] = await db.execute(
      'DELETE FROM movimentos_caixa WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Movimento de caixa não encontrado ou já excluído.' });
    }

    res.json({ message: 'Movimento de caixa excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir movimento de caixa:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao excluir movimento de caixa.' });
  }
});


module.exports = router;
