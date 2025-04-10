const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar exames
router.get('/', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  try {
    const [exames] = await db.query(`
      SELECT e.*, p.nome AS paciente
      FROM exames e
      JOIN pacientes p ON e.paciente_id = p.id
      ORDER BY e.data DESC
    `);
    res.json(exames);
  } catch (err) {
    console.error('Erro ao buscar exames:', err);
    res.status(500).json({ error: 'Erro ao buscar exames.' });
  }
});

// GET - Listar exames por paciente (opcional)
router.get('/', verificarAutenticacao(['admin', 'profissional']), async (req, res) => {
  const { paciente_id } = req.query;
  if (paciente_id) {
    try {
      const [rows] = await db.query(`
        SELECT * FROM exames
        WHERE paciente_id = ?
        ORDER BY data DESC
      `, [paciente_id]);
      res.json(rows);
    } catch (err) {
      console.error('Erro ao buscar exames por paciente:', err);
      res.status(500).json({ error: 'Erro ao buscar exames por paciente.' });
    }
  }
});

// POST - Agendar exame
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { paciente_id, tipo, data, resultado } = req.body;

  if (!paciente_id || !tipo || !data) {
    return res.status(400).json({ error: 'Paciente, tipo e data são obrigatórios.' });
  }

  try {
    await db.query(`
      INSERT INTO exames (paciente_id, tipo, data, resultado)
      VALUES (?, ?, ?, ?)
    `, [paciente_id, tipo, data, resultado || null]);

    res.status(201).json({ message: 'Exame agendado com sucesso.' });
  } catch (err) {
    console.error('Erro ao agendar exame:', err);
    res.status(500).json({ error: 'Erro ao agendar exame.' });
  }
});

// DELETE - Excluir exame
router.delete('/:id', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM exames WHERE id = ?', [id]);
    res.json({ message: 'Exame excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir exame:', err);
    res.status(500).json({ error: 'Erro ao excluir exame.' });
  }
});

module.exports = router;
