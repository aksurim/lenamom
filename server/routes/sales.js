const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// Função para gerar o comando TSPL do cupom
const generateReceiptTspl = (saleData) => {
    const { saleCode, customerName, items, total_amount, paid_amount, change_amount, paymentMethod, shipping_cost, sale_date } = saleData;

    const formatCurrency = (value) => (value || 0).toFixed(2).replace('.', ',');
    const saleDate = new Date(sale_date);
    const dateStr = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()}`;
    const timeStr = `${saleDate.getHours().toString().padStart(2, '0')}:${saleDate.getMinutes().toString().padStart(2, '0')}`;

    let tspl = '';
    tspl += 'SIZE 80 mm, 100 mm\r\n';
    tspl += 'GAP 0,0\r\n';
    tspl += 'CODEPAGE 850\r\n'; // Adicionado para suportar acentuação
    tspl += 'CLS\r\n';
    
    // Cabeçalho
    tspl += `TEXT 320,30,"TSS24.BF2",0,1,1,"NOME DA EMPRESA"\r\n`;
    tspl += `TEXT 320,60,"TSS24.BF2",0,1,1,"@seu.instagram"\r\n`;
    tspl += `TEXT 320,90,"TSS24.BF2",0,1,1,"(83) 99123-8327"\r\n`;
    tspl += `BAR 20,120,600,2\r\n`;
    tspl += `TEXT 20,140,"TSS24.BF2",0,1,1,"Pedido: ${saleCode}"\r\n`;
    tspl += `TEXT 20,170,"TSS24.BF2",0,1,1,"Data: ${dateStr} ${timeStr}"\r\n`;
    tspl += `TEXT 20,200,"TSS24.BF2",0,1,1,"Cliente: ${customerName || 'Nao informado'}"\r\n`;
    tspl += `BAR 20,230,600,2\r\n`;

    // Itens
    tspl += `TEXT 20,250,"TSS24.BF2",0,1,1,"Produto"\r\n`;
    tspl += `TEXT 380,250,"TSS24.BF2",0,1,1,"Qtd"\r\n`;
    tspl += `TEXT 500,250,"TSS24.BF2",0,1,1,"Total"\r\n`;
    tspl += `BAR 20,280,600,1\r\n`;

    let y = 300;
    items.forEach(item => {
        const desc = item.description.substring(0, 20);
        tspl += `TEXT 20,${y},"TSS24.BF2",0,1,1,"${desc}"\r\n`;
        tspl += `TEXT 380,${y},"TSS24.BF2",0,1,1,"${item.quantity}"\r\n`;
        tspl += `TEXT 500,${y},"TSS24.BF2",0,1,1,"${formatCurrency(item.subtotal)}"\r\n`;
        y += 30;
    });

    tspl += `BAR 20,${y},600,2\r\n`;
    y += 20;

    // Totais
    const addTotalLine = (label, value) => {
        tspl += `TEXT 20,${y},"TSS24.BF2",0,1,1,"${label}"\r\n`;
        tspl += `TEXT 580,${y},"TSS24.BF2",0,1,2,"${value}"\r\n`;
        y += 30;
    };

    addTotalLine('Subtotal:', formatCurrency(items.reduce((acc, i) => acc + i.subtotal, 0)));
    if (shipping_cost > 0) addTotalLine('Frete:', formatCurrency(shipping_cost));
    addTotalLine('TOTAL:', `R$ ${formatCurrency(total_amount)}`);
    y += 10;
    addTotalLine('Forma Pgto:', paymentMethod);
    addTotalLine('Valor Pago:', `R$ ${formatCurrency(paid_amount)}`);
    if (change_amount > 0) addTotalLine('Troco:', `R$ ${formatCurrency(change_amount)}`);
    
    y += 40;
    tspl += `TEXT 320,${y},"TSS24.BF2",0,1,1,"Obrigado pela preferencia!"\r\n`;
    y += 40;
    tspl += `TEXT 320,${y},"TSS24.BF2",0,1,1,"*** NAO E DOCUMENTO FISCAL ***"\r\n`;

    tspl += `PRINT 1,1\r\n`;
    tspl += `CUT\r\n`;

    return tspl;
};

// POST /api/sales - Finaliza a venda (sem impressão automática)
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

// NOVA ROTA: POST /api/sales/generate-receipt-command - Gera o comando TSPL para um cupom
router.post('/generate-receipt-command', protect, async (req, res) => {
    const { saleId } = req.body;
    if (!saleId) {
        return res.status(400).json({ message: 'O ID da venda é obrigatório.' });
    }

    try {
        const [[sale]] = await pool.query(
            `SELECT s.*, c.name as customer_name, pm.description as payment_method_name 
             FROM sales s 
             LEFT JOIN customers c ON s.customer_id = c.id 
             LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
             WHERE s.id = ?`, [saleId]
        );

        if (!sale) {
            return res.status(404).json({ message: 'Venda não encontrada.' });
        }

        const [items] = await pool.query(
            `SELECT si.*, p.description 
             FROM sale_items si 
             JOIN products p ON si.product_id = p.id 
             WHERE si.sale_id = ?`, [saleId]
        );

        const receiptData = {
            saleCode: sale.sale_code,
            customerName: sale.customer_name,
            items: items,
            total_amount: sale.total_amount,
            paid_amount: sale.paid_amount,
            change_amount: sale.change_amount,
            paymentMethod: sale.payment_method_name,
            shipping_cost: sale.shipping_cost,
            sale_date: sale.created_at,
        };

        const tsplCommand = generateReceiptTspl(receiptData);
        res.status(200).json({ tsplCommand });

    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar comando do cupom.', error: error.message });
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

module.exports = router;
