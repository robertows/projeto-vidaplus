const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar histórico financeiro
router.get('/', verificarAutenticacao(['admin']), async (req, res) => {
  try {
    const [resultados] = await db.query(`SELECT * FROM historico_financeiro ORDER BY data DESC`);
    res.json(resultados);
  } catch (err) {
    console.error('Erro ao buscar histórico financeiro:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico financeiro.' });
  }
});

// POST - Adicionar registro financeiro
router.post('/', verificarAutenticacao(['admin']), async (req, res) => {
  const { data, receita = 0, despesa = 0, categoria = 'Outros' } = req.body;

  if (!data || (receita === 0 && despesa === 0)) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  try {
    await db.query(
      `INSERT INTO historico_financeiro (data, receita, despesa, categoria) VALUES (?, ?, ?, ?)`,
      [data, receita, despesa, categoria]
    );
    res.status(201).json({ message: 'Registro financeiro adicionado.' });
  } catch (err) {
    console.error('Erro ao adicionar registro financeiro:', err);
    res.status(500).json({ error: 'Erro ao adicionar registro financeiro.' });
  }
});

// DELETE - Remover registro financeiro por ID
router.delete('/:id', verificarAutenticacao(['admin']), async (req, res) => {
    const { id } = req.params;
  
    try {
      const [resultado] = await db.query('DELETE FROM historico_financeiro WHERE id = ?', [id]);
  
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: 'Registro não encontrado.' });
      }
  
      res.json({ message: 'Registro financeiro excluído com sucesso.' });
    } catch (err) {
      console.error('Erro ao excluir registro financeiro:', err); // ✅ Aqui está o console.error que você pediu
      res.status(500).json({ error: 'Erro ao excluir registro financeiro.' });
    }
  });
  
module.exports = router;
