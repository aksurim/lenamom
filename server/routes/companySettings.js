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
        // Se o arquivo não existir, retorna um objeto vazio para não quebrar o frontend
        if (err.code === 'ENOENT') {
          return res.status(200).json({});
        }
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
  // Coleta todos os campos que podem vir do frontend
  const { company_name, cnpj, address, contact, instagram, logo_url } = req.body;

  try {
    // Lê o arquivo atual para garantir que nenhum campo seja perdido
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err && err.code !== 'ENOENT') {
        console.error("Erro ao ler arquivo para atualização:", err);
        return res.status(500).json({ message: 'Erro ao ler configurações existentes.' });
      }

      const currentSettings = data ? JSON.parse(data) : {};

      // Cria o novo objeto de configurações, mesclando o antigo com o novo.
      // Se um campo não vier na requisição, mantém o valor antigo.
      const newSettings = {
        ...currentSettings,
        company_name: company_name !== undefined ? company_name : currentSettings.company_name,
        cnpj: cnpj !== undefined ? cnpj : currentSettings.cnpj,
        address: address !== undefined ? address : currentSettings.address,
        contact: contact !== undefined ? contact : currentSettings.contact,
        instagram: instagram !== undefined ? instagram : currentSettings.instagram,
        logo_url: logo_url !== undefined ? logo_url : currentSettings.logo_url,
      };

      // Salva o arquivo JSON completo e atualizado
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
