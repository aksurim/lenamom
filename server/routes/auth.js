const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Precisaremos criar este arquivo de conexão com o BD

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, senha } = req.body;

  if (!username || !senha) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Usuário não encontrado
    }

    const user = rows[0];

    // Compara a senha enviada com o hash armazenado
    const isPasswordCorrect = await bcrypt.compare(senha, user.senha);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Senha incorreta
    }

    // Gera o token JWT
    const payload = {
      id: user.id,
      username: user.username,
      perfil: user.perfil,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      message: 'Login bem-sucedido!',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        username: user.username,
        perfil: user.perfil
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

module.exports = router;
