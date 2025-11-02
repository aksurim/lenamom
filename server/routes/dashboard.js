const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');

// Todas as rotas do painel requerem autenticação
router.use(protect);

router.get('/stats', async (req, res) => {
    try {
        const [cs] = await pool.query(`SELECT SUM(total_amount) as r, COUNT(id) as s FROM sales WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`);
        const [ps] = await pool.query(`SELECT SUM(total_amount) as r, COUNT(id) as s FROM sales WHERE MONTH(created_at) = MONTH(NOW() - INTERVAL 1 MONTH) AND YEAR(created_at) = YEAR(NOW() - INTERVAL 1 MONTH)`);
        const [cust] = await pool.query(`SELECT COUNT(id) as n FROM customers WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`);
        const cr = parseFloat(cs[0].r) || 0;
        const pr = parseFloat(ps[0].r) || 0;
        const csc = parseInt(cs[0].s) || 0;
        const psc = parseInt(ps[0].s) || 0;
        const ch = (p, c) => { if(c===0) return p>0?100:0; return ((p-c)/c)*100; };
        res.status(200).json({
            monthlyRevenue: cr,
            monthlySales: csc,
            newCustomers: parseInt(cust[0].n) || 0,
            averageTicket: csc > 0 ? cr / csc : 0,
            revenueChange: ch(cr, pr),
            salesChange: ch(csc, psc)
        });
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar estatísticas do painel.', error: e.message});
    }
});

router.get('/sales-over-time', async (req, res) => {
    try {
        const [sd] = await pool.query(`SELECT DATE(created_at) as date, SUM(total_amount) as total FROM sales WHERE created_at >= NOW() - INTERVAL 30 DAY GROUP BY DATE(created_at) ORDER BY date ASC`);
        const dm = new Map();
        for (let i=29;i>=0;i--) {
            const d=new Date();
            d.setDate(d.getDate()-i);
            const ds=d.toISOString().split('T')[0];
            dm.set(ds, {date:`${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`, total:0});
        }
        sd.forEach(r => {
            const ds=new Date(r.date).toISOString().split('T')[0];
            if(dm.has(ds)) dm.set(ds, {...dm.get(ds), total:parseFloat(r.total)});
        });
        res.status(200).json(Array.from(dm.values()));
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar dados de vendas ao longo do tempo.', error: e.message});
    }
});

router.get('/top-products', async (req, res) => {
    try {
        const [r] = await pool.query(`SELECT p.description, SUM(si.subtotal) as total_sold FROM sale_items si JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE MONTH(s.created_at) = MONTH(NOW()) AND YEAR(s.created_at) = YEAR(NOW()) GROUP BY p.id, p.description ORDER BY total_sold DESC LIMIT 5`);
        res.status(200).json(r);
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar produtos mais vendidos.', error: e.message});
    }
});

router.get('/low-stock-alerts', async (req, res) => {
    try {
        const [r] = await pool.query(`SELECT code, description, stock_quantity, min_quantity FROM products WHERE stock_quantity <= min_quantity AND min_quantity > 0 ORDER BY (stock_quantity - min_quantity) ASC`);
        res.status(200).json(r);
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar alertas de estoque baixo.', error: e.message});
    }
});

router.get('/stagnant-stock', async (req, res) => {
    try {
        const [[s]] = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'stagnant_stock_days'");
        const d = s ? parseInt(s.setting_value, 10) : 90;
        const [r] = await pool.query(`SELECT p.code, p.description, p.stock_quantity, MAX(s.created_at) as last_sale_date FROM products p LEFT JOIN sale_items si ON p.id = si.product_id LEFT JOIN sales s ON si.sale_id = s.id WHERE p.stock_quantity > 0 GROUP BY p.id HAVING last_sale_date IS NULL OR last_sale_date < NOW() - INTERVAL ? DAY ORDER BY p.stock_quantity DESC`, [d]);
        res.status(200).json(r);
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar estoque parado.', error: e.message});
    }
});

module.exports = router;
