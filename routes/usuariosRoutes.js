// Autor: RU:4334534 ROBERTO CARVALHO
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar todos os usuários (apenas admins)
router.get('/', verificarAutenticacao(['admin']), async (req, res) => {
  try {
    const [usuarios] = await db.query('SELECT id, usuario, permissao FROM usuarios ORDER BY id DESC');
    res.json(usuarios);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// POST - Adicionar novo usuário (apenas admins)
router.post('/', verificarAutenticacao(['admin']), async (req, res) => {
  const { usuario, senha, permissao } = req.body;

  if (!usuario || !senha || !permissao) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Verifica se o usuário já existe
    const [existe] = await db.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existe.length > 0) {
      return res.status(409).json({ error: 'Usuário já existe.' });
    }

    const hash = await bcrypt.hash(senha, 10);
    await db.query(
      'INSERT INTO usuarios (usuario, senha, permissao) VALUES (?, ?, ?)',
      [usuario, hash, permissao]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso.' });
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }
});

// DELETE - Excluir usuário (apenas admins)
router.delete('/:id', verificarAutenticacao(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
});

module.exports = router;


