const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar consultas online
router.get('/', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  try {
    const [consultas] = await db.query(`
      SELECT c.*, p.nome AS paciente, prof.nome AS profissional
      FROM consultas c
      JOIN pacientes p ON c.paciente_id = p.id
      JOIN profissionais prof ON c.profissional_id = prof.id
      WHERE tipo_consulta = 'Online'
      ORDER BY c.data DESC
    `);
    res.json(consultas);
  } catch (err) {
    console.error('Erro ao buscar consultas online:', err);
    res.status(500).json({ error: 'Erro ao buscar consultas online.' });
  }
});

// GET - Buscar consulta online por ID
router.get('/:id', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(`
      SELECT * FROM consultas
      WHERE id = ? AND tipo_consulta = 'Online'
    `, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada.' });
    }

    res.json(result[0]);
  } catch (err) {
    console.error('Erro ao buscar consulta online por ID:', err);
    res.status(500).json({ error: 'Erro ao buscar consulta online por ID.' });
  }
});

// POST - Agendar consulta online
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { paciente_id, profissional_id, especialidade, data, hora } = req.body;

  if (!paciente_id || !profissional_id || !data || !hora) {
    return res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
  }

  try {
    await db.query(`
      INSERT INTO consultas (paciente_id, profissional_id, especialidade, data, hora, tipo_consulta)
      VALUES (?, ?, ?, ?, ?, 'Online')
    `, [paciente_id, profissional_id, especialidade, data, hora]);

    res.status(201).json({ message: 'Consulta online agendada com sucesso.' });
  } catch (err) {
    console.error('Erro ao agendar consulta online:', err);
    res.status(500).json({ error: 'Erro ao agendar consulta online.' });
  }
});

// DELETE - Excluir consulta online
router.delete('/:id', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM consultas WHERE id = ? AND tipo_consulta = "Online"', [id]);
    res.json({ message: 'Consulta online excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir consulta online:', err);
    res.status(500).json({ error: 'Erro ao excluir consulta online.' });
  }
});

module.exports = router;
