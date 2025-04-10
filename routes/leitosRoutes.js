const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar todos os leitos
router.get('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  try {
    const [leitos] = await db.query('SELECT * FROM leitos');
    res.json(leitos);
  } catch (err) {
    console.error('Erro ao buscar leitos:', err);
    res.status(500).json({ error: 'Erro ao buscar leitos.' });
  }
});

// PUT - Atualizar status de um leito
router.put('/:id', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { id } = req.params;
  const { status, data_ocupacao, data_liberacao } = req.body;

  if (!status || !['Disponível', 'Ocupado'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    await db.query(`
      UPDATE leitos
      SET status = ?, data_ocupacao = ?, data_liberacao = ?
      WHERE id = ?
    `, [status, data_ocupacao || null, data_liberacao || null, id]);

    res.json({ message: 'Leito atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar leito:', err);
    res.status(500).json({ error: 'Erro ao atualizar leito.' });
  }
});

module.exports = router;
