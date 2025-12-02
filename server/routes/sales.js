const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');
const fs = require('fs');
const path = require('path');

// --- FUNÇÃO AUXILIAR: SANITIZAÇÃO DE TEXTO ---
const sanitizeText = (str) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, "");
};

// --- FUNÇÃO DE GERAÇÃO DE CUPOM ---
const generateReceiptTspl = (saleData) => {
    const { sale_code, created_at, customerName, items, total_amount, paid_amount, change_amount, paymentMethod, shipping_cost, companySettings } = saleData;

    const formatCurrency = (value) => `R$ ${(Number(value) || 0).toFixed(2).replace('.', ',')}`;
    
    const saleDate = new Date(created_at);
    const dateStr = `${saleDate.getDate().toString().padStart(2, '0')}/${(saleDate.getMonth() + 1).toString().padStart(2, '0')}/${saleDate.getFullYear()}`;
    const timeStr = `${saleDate.getHours().toString().padStart(2, '0')}:${saleDate.getMinutes().toString().padStart(2, '0')}`;

    const paperWidth = 550;
    const margin = 10;
    const right = paperWidth - 60;
    const font = '"2"';
    const charWidth = 12;
    const center = paperWidth / 2;
    const separator = "=".repeat(44);

    const line1 = sanitizeText(companySettings.company_name || 'NOME DA EMPRESA');
    const line2 = sanitizeText(companySettings.instagram || 'Rede Social');
    const line3 = sanitizeText(companySettings.contact || 'Telefone de Contato');
    const safeCustomer = sanitizeText(customerName || 'Nao informado');
    const safePayment = sanitizeText(paymentMethod || 'Nao informado');

    let tspl = '';
    let y = 30;

    let content = '';

    const centerText = (text, yPos) => {
        const startX = Math.max(margin, center - ((text.length * charWidth) / 2));
        return `TEXT ${startX},${yPos},${font},0,1,1,"${text}"\r\n`;
    };

    content += centerText(line1, y); y += 40;
    content += centerText(line2, y); y += 40;
    content += centerText(line3, y); y += 40;
    
    content += `TEXT ${margin},${y},${font},0,1,1,"${separator}"\r\n`; y += 40;

    content += `TEXT ${margin},${y},${font},0,1,1,"Pedido: ${sale_code}"\r\n`; y += 40;
    content += `TEXT ${margin},${y},${font},0,1,1,"Data: ${dateStr} ${timeStr}"\r\n`; y += 40;
    content += `TEXT ${margin},${y},${font},0,1,1,"Cliente: ${safeCustomer}"\r\n`; y += 40;
    content += `TEXT ${margin},${y},${font},0,1,1,"${separator}"\r\n`; y += 40;

    const colProd = margin;
    const colQtd = 380;
    const colTotal = right;
    const totalLabel = "Total";

    content += `TEXT ${colProd},${y},${font},0,1,1,"Produto"\r\n`;
    content += `TEXT ${colQtd},${y},${font},0,1,1,"Qtd"\r\n`;
    content += `RIGHT\r\n`;
    content += `TEXT ${colTotal},${y},${font},0,1,1,"${totalLabel}"\r\n`;
    content += `LEFT\r\n`;
    y += 40;
    content += `TEXT ${margin},${y},${font},0,1,1,"${separator}"\r\n`; y += 30;

    items.forEach(item => {
        const rawDesc = item.description || 'Produto sem descricao';
        const cleanDesc = sanitizeText(rawDesc);
        const desc = cleanDesc.length > 22 ? cleanDesc.substring(0, 22) + '...' : cleanDesc;
        const subtotalStr = formatCurrency(item.subtotal);
        
        y += 40;
        content += `TEXT ${colProd},${y},${font},0,1,1,"${desc}"\r\n`;
        content += `TEXT ${colQtd},${y},${font},0,1,1,"${item.quantity}"\r\n`;
        content += `RIGHT\r\n`;
        content += `TEXT ${colTotal},${y},${font},0,1,1,"${subtotalStr}"\r\n`;
        content += `LEFT\r\n`;
    });
    y += 30;
    content += `TEXT ${margin},${y},${font},0,1,1,"${separator}"\r\n`; y += 40;

    const addTotalLine = (label, value) => {
        const sanitizedLabel = sanitizeText(label);
        let line = `TEXT ${margin},${y},${font},0,1,1,"${sanitizedLabel}"\r\n`;
        line += `RIGHT\r\n`;
        line += `TEXT ${right},${y},${font},0,1,1,"${value}"\r\n`;
        line += `LEFT\r\n`;
        y += 40;
        return line;
    };

    const subtotalValue = items.reduce((acc, i) => acc + Number(i.subtotal || 0), 0);
    content += addTotalLine('Subtotal:', formatCurrency(subtotalValue));
    if (Number(shipping_cost) > 0) content += addTotalLine('Frete:', formatCurrency(shipping_cost));
    content += addTotalLine('TOTAL:', formatCurrency(total_amount));
    y += 15;

    content += addTotalLine('Valor Pago:', formatCurrency(paid_amount));
    if (Number(change_amount) > 0) content += addTotalLine('Troco:', formatCurrency(change_amount));
    
    content += `TEXT ${margin},${y},${font},0,1,1,"Forma Pgto: ${safePayment}"\r\n`; y += 40;
    
    y += 50;

    content += centerText("Obrigado pela preferencia!", y); y += 40;
    content += centerText("*** NAO E DOCUMENTO FISCAL ***", y);
    
    // AJUSTE FINO: Adiciona um espaço extra (equivalente a uma linha) antes do corte.
    const finalHeight = y + 80; 

    tspl += `SIZE 80 mm, ${Math.ceil(finalHeight / 8)} mm\r\n`; 
    tspl += 'DIRECTION 1\r\n';
    tspl += 'GAP 0,0\r\n';
    tspl += 'CODEPAGE 850\r\n';
    tspl += 'CLS\r\n';
    tspl += 'REFERENCE 0,0\r\n';
    tspl += content;
    tspl += `PRINT 1,1\r\n`;
    tspl += `CUT\r\n`;

    return tspl;
};

// Rota de geração de comando
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
        if (!sale) return res.status(404).json({ message: 'Venda não encontrada.' });

        const [items] = await pool.query(
            `SELECT si.*, p.description 
             FROM sale_items si 
             JOIN products p ON si.product_id = p.id 
             WHERE si.sale_id = ?`, [saleId]
        );

        const settingsPath = path.join(__dirname, '..', 'company-settings.json');
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const companySettings = JSON.parse(settingsData);

        const receiptData = {
            ...sale,
            customerName: sale.customer_name,
            paymentMethod: sale.payment_method_name,
            items: items,
            companySettings: companySettings,
        };

        const tsplCommand = generateReceiptTspl(receiptData);
        res.status(200).json({ tsplCommand });

    } catch (error) {
        console.error('Erro detalhado ao gerar cupom:', error);
        res.status(500).json({ message: 'Erro ao gerar comando do cupom.', error: error.message });
    }
});


// POST /api/sales - Finaliza a venda
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

// GET /api/sales/:id/details
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
