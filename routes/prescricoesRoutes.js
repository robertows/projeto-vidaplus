const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// POST - Adicionar prescrição
router.post('/', verificarAutenticacao(['admin', 'profissional']), async (req, res) => {
  const { paciente_id, profissional_id, medicamento, dosagem, instrucoes, data, tipo_consulta } = req.body;

  if (!paciente_id || !profissional_id || !medicamento || !dosagem || !instrucoes || !data || !tipo_consulta) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    await db.query(`
      INSERT INTO prescricoes (paciente_id, profissional_id, medicamento, dosagem, instrucoes, data, tipo_consulta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [paciente_id, profissional_id, medicamento, dosagem, instrucoes, data, tipo_consulta]);

    res.status(201).json({ message: 'Prescrição adicionada com sucesso.' });
  } catch (err) {
    console.error('Erro ao adicionar prescrição:', err);
    res.status(500).json({ error: 'Erro ao adicionar prescrição.' });
  }
});

// GET - Listar prescrições (todas ou por paciente)
router.get('/', verificarAutenticacao(['admin', 'profissional']), async (req, res) => {
  const { paciente_id } = req.query;

  try {
    let query = `
      SELECT pr.*, p.nome AS paciente, prof.nome AS profissional
      FROM prescricoes pr
      JOIN pacientes p ON pr.paciente_id = p.id
      JOIN profissionais prof ON pr.profissional_id = prof.id
    `;
    let params = [];

    if (paciente_id) {
      query += ' WHERE pr.paciente_id = ?';
      params.push(paciente_id);
    }

    query += ' ORDER BY pr.data DESC';

    const [prescricoes] = await db.query(query, params);
    res.json(prescricoes);
  } catch (err) {
    console.error('Erro ao buscar prescrições:', err);
    res.status(500).json({ error: 'Erro ao buscar prescrições.' });
  }
});

// DELETE - Excluir prescrição por ID
router.delete('/:id', verificarAutenticacao(['admin', 'profissional']), async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM prescricoes WHERE id = ?', [id]);
    res.json({ message: 'Prescrição excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir prescrição:', err);
    res.status(500).json({ error: 'Erro ao excluir prescrição.' });
  }
});

module.exports = router;
