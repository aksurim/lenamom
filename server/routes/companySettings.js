const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect, admin } = require('../middleware/authMiddleware');

const filePath = path.join(__dirname, '../company-settings.json');

// GET /api/company-settings
router.get('/', protect, (req, res) => {
  try {
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

// POST /api/company-settings - SALVA AS CONFIGURAÇÕES DA EMPRESA
router.post('/', protect, admin, (req, res) => {
  const { company_name, cnpj, address, contact, instagram } = req.body;

  try {
    // Lê o arquivo atual para não sobrescrever campos existentes como o logo_url
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') {
        console.error("Erro ao ler arquivo para atualização:", err);
        return res.status(500).json({ message: 'Erro ao ler configurações existentes.' });
      }

      const currentSettings = data ? JSON.parse(data) : {};

      const newSettings = {
        ...currentSettings, // Mantém campos existentes
        company_name: company_name || currentSettings.company_name,
        cnpj: cnpj || currentSettings.cnpj,
        address: address || currentSettings.address,
        contact: contact || currentSettings.contact,
        instagram: instagram || currentSettings.instagram, // Adiciona o campo instagram
      };

      fs.writeFile(filePath, JSON.stringify(newSettings, null, 2), (err) => {
        if (err) {
          console.error("Erro ao salvar arquivo de configurações:", err);
          return res.status(500).json({ message: 'Erro ao salvar as configurações da empresa.' });
        }
        res.status(200).json({ message: 'Configurações da empresa atualizadas com sucesso.' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
  }
});

module.exports = router;
