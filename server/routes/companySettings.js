const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');

// GET /api/company-settings
router.get('/', protect, (req, res) => {
  try {
    const filePath = path.join(__dirname, '../company-settings.json');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error("Erro ao ler arquivo de configurações:", err);
        return res.status(500).json({ message: 'Erro ao buscar as configurações da empresa.' });
      }
      res.status(200).json(JSON.parse(data));
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
  }
});

module.exports = router;
