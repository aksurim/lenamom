const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const { protect, admin } = require('../middleware/authMiddleware');
const { logAction } = require('../services/auditLogService');

// Todas as rotas neste arquivo são protegidas e requerem perfil de admin
router.use(protect, admin);

// GET /api/users - Listar todos os usuários
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, nome, username, perfil, criado_em FROM usuarios ORDER BY nome ASC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários.', error: error.message });
  }
});

// POST /api/users - Criar um novo usuário
router.post('/', async (req, res) => {
  const { nome, username, senha, perfil } = req.body;
  if (!nome || !username || !senha || !perfil) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM usuarios WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Este nome de usuário já está em uso.' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(senha, saltRounds);
    const [result] = await pool.query('INSERT INTO usuarios (nome, username, senha, perfil) VALUES (?, ?, ?, ?)', [nome, username, hashedPassword, perfil]);
    const [[newUser]] = await pool.query('SELECT id, nome, username, perfil, criado_em FROM usuarios WHERE id = ?', [result.insertId]);

    logAction(req, 'CRIAR_USUARIO', { usuarioCriadoId: newUser.id, username: newUser.username });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário.', error: error.message });
  }
});

// PUT /api/users/:id - Atualizar um usuário
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, username, perfil, senha } = req.body;
  if (!nome || !username || !perfil) {
    return res.status(400).json({ message: 'Nome, username e perfil são obrigatórios.' });
  }
  try {
    if (Number(req.user.id) === Number(id) && req.user.perfil === 'admin' && perfil !== 'admin') {
        return res.status(403).json({ message: 'Um administrador não pode remover seu próprio privilégio de administrador.' });
    }
    if (senha) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(senha, saltRounds);
      await pool.query('UPDATE usuarios SET nome = ?, username = ?, perfil = ?, senha = ? WHERE id = ?', [nome, username, perfil, hashedPassword, id]);
    } else {
      await pool.query('UPDATE usuarios SET nome = ?, username = ?, perfil = ? WHERE id = ?', [nome, username, perfil, id]);
    }

    logAction(req, 'ATUALIZAR_USUARIO', { usuarioAlvoId: id, username: username, dados: { nome, username, perfil, senha: senha ? '(alterada)' : '(não alterada)' } });

    const [[updatedUser]] = await pool.query('SELECT id, nome, username, perfil, criado_em FROM usuarios WHERE id = ?', [id]);
    res.json(updatedUser);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Este nome de usuário já está em uso.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar usuário.', error: error.message });
  }
});

// DELETE /api/users/:id - Excluir um usuário
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (Number(req.user.id) === Number(id)) {
    return res.status(403).json({ message: 'Você não pode excluir sua própria conta.' });
  }
  try {
    const [[userToDelete]] = await pool.query('SELECT username FROM usuarios WHERE id = ?', [id]);
    if (!userToDelete) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    logAction(req, 'EXCLUIR_USUARIO', `Usuário: ${userToDelete.username} (ID: ${id})`);

    res.status(200).json({ message: 'Usuário excluído com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir usuário.', error: error.message });
  }
});

module.exports = router;
