const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');

// Alteração: Todas as rotas de relatórios requerem apenas autenticação
router.use(protect);

router.get('/sales-history', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Data de início e data de fim são obrigatórias.' });
    try {
        const query = `SELECT s.id, s.sale_code, s.created_at as sale_date, s.total_amount, s.paid_amount, s.change_amount, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.created_at BETWEEN ? AND ? ORDER BY s.created_at DESC`;
        const [rows] = await pool.query(query, [startDate, `${endDate} 23:59:59`]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar histórico de vendas.', error: error.message });
    }
});

router.get('/sales-by-product', async (req, res) => {
    const { startDate, endDate, productId, supplierId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Data de início e data de fim são obrigatórias.' });
    }
    let query = ` SELECT p.id as product_id, p.code as product_code, p.description as product_description, SUM(si.quantity) as total_quantity_sold, SUM(si.subtotal) as total_amount_invoiced FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id WHERE s.created_at BETWEEN ? AND ?`;
    const params = [startDate, `${endDate} 23:59:59`];
    if (productId && productId !== 'all') {
        query += ` AND p.id = ?`;
        params.push(productId);
    }
    if (supplierId && supplierId !== 'all') {
        query += ` AND p.supplier_id = ?`;
        params.push(supplierId);
    }
    query += ` GROUP BY p.id, p.code, p.description ORDER BY total_amount_invoiced DESC`;
    try {
        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar relatório de vendas por produto.', error: error.message });
    }
});

router.get('/stock-balance', async (req, res) => {
    const { supplierId } = req.query; // Pega o ID do fornecedor da query
    try {
        let query = `
            SELECT 
                code, 
                description, 
                stock_quantity, 
                cost_price, 
                sale_price, 
                (stock_quantity * cost_price) as total_cost_value, 
                (stock_quantity * sale_price) as total_sale_value 
            FROM products 
            WHERE is_active = TRUE`;
        
        const params = [];

        if (supplierId && supplierId !== 'all') {
            query += ` AND supplier_id = ?`;
            params.push(supplierId);
        }

        query += ` ORDER BY description ASC`;

        const [products] = await pool.query(query, params);
        
        const totals = products.reduce((acc, product) => {
            acc.totalCost += parseFloat(product.total_cost_value) || 0;
            acc.totalSale += parseFloat(product.total_sale_value) || 0;
            return acc;
        }, { totalCost: 0, totalSale: 0 });

        res.status(200).json({ products, totals });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar relatório de balanço de estoque.', error: error.message });
    }
});

router.get('/stock-for-counting', async (req, res) => {
  try {
    const query = `SELECT code, description, stock_quantity, is_active FROM products ORDER BY description ASC`;
    const [rows] = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar produtos para contagem de estoque.', error: error.message });
  }
});

router.get('/profitability-by-product', async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) { return res.status(400).json({ message: 'Data de início e data de fim são obrigatórias.' }); }
    try {
        const query = ` SELECT p.code as product_code, p.description as product_description, SUM(si.quantity) as total_quantity_sold, SUM(si.subtotal) as total_revenue, SUM(si.quantity * si.cost_price) as total_cost, SUM(si.subtotal) - SUM(si.quantity * si.cost_price) as total_profit FROM sale_items si JOIN sales s ON si.sale_id = s.id JOIN products p ON si.product_id = p.id WHERE s.created_at BETWEEN ? AND ? GROUP BY p.id, p.code, p.description ORDER BY total_profit DESC `;
        const [rows] = await pool.query(query, [startDate, `${endDate} 23:59:59`]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar relatório de lucratividade.', error: error.message });
    }
});

module.exports = router;
