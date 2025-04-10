const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// ROTA POST - Cadastrar profissional
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { nome, categoria, especialidade, crm, telefone, email } = req.body;

  if (!nome || !categoria || !telefone || !email) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, categoria, telefone e email.' });
  }

  try {
    await db.query(
      'INSERT INTO profissionais (nome, categoria, especialidade, crm, telefone, email) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, categoria, especialidade, crm, telefone, email]
    );

    res.status(201).json({ message: 'Profissional cadastrado com sucesso.' });
  } catch (err) {
    console.error('Erro ao cadastrar profissional:', err);
    res.status(500).json({ error: 'Erro ao cadastrar profissional.' });
  }
});

// ROTA GET - Listar todos os profissionais
router.get('/', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM profissionais');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar profissionais:', err);
    res.status(500).json({ error: 'Erro ao buscar profissionais.' });
  }
});

// ROTA GET - Buscar profissional por ID
router.get('/:id', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM profissionais WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar profissional:', err);
    res.status(500).json({ error: 'Erro ao buscar profissional.' });
  }
});

// ROTA DELETE - Excluir profissional
router.delete('/:id', verificarAutenticacao('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM profissionais WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado.' });
    }
    res.json({ message: 'Profissional excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir profissional:', err);
    res.status(500).json({ error: 'Erro ao excluir profissional.' });
  }
});

module.exports = router;
