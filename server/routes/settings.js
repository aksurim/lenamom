const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, admin } = require('../middleware/authMiddleware');

// Todas as rotas de configurações requerem perfil de Admin
router.use(protect, admin);

router.get('/', async (req, res) => {
    try {
        const [r] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const s = r.reduce((a, c) => { a[c.setting_key] = c.setting_value; return a; }, {});
        res.status(200).json(s);
    } catch (e) {
        res.status(500).json({message: 'Erro ao buscar configurações.', error: e.message});
    }
});

router.put('/', async (req, res) => {
    const stu = req.body;
    let c;
    try {
        c = await pool.getConnection();
        await c.beginTransaction();
        for (const k in stu) {
            if (Object.hasOwnProperty.call(stu, k)) {
                await c.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [k, stu[k], stu[k]]);
            }
        }
        await c.commit();
        res.status(200).json({ message: 'Configurações atualizadas com sucesso.' });
    } catch (e) {
        if (c) await c.rollback();
        res.status(500).json({message: 'Erro ao atualizar configurações.', error: e.message});
    } finally {
        if (c) c.release();
    }
});

module.exports = router;
