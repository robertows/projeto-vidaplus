// routes/suprimentosRoutes.js
const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// GET - Listar todos os suprimentos
router.get('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  try {
    const [suprimentos] = await db.query('SELECT * FROM suprimentos');
    res.json(suprimentos);
  } catch (err) {
    console.error('Erro ao buscar suprimentos:', err);
    res.status(500).json({ error: 'Erro ao buscar suprimentos.' });
  }
});

// POST - Adicionar suprimento e registrar no histórico financeiro
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
    const { nome, quantidade, preco_unitario } = req.body;
  
    if (!nome || quantidade == null || preco_unitario == null) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
  
    const despesaTotal = quantidade * preco_unitario;
    const dataAtual = new Date().toISOString().split('T')[0];
  
    const connection = await db.getConnection(); // se estiver usando pool
  
    try {
      await connection.beginTransaction();
  
      await connection.query(`
        INSERT INTO suprimentos (nome, quantidade, preco_unitario)
        VALUES (?, ?, ?)
      `, [nome, quantidade, preco_unitario]);
  
      await connection.query(`
        INSERT INTO historico_financeiro (data, receita, despesa, categoria)
        VALUES (?, 0, ?, ?)
      `, [dataAtual, despesaTotal, `Compra de Suprimento: ${nome}`]);
  
      await connection.commit();
      res.status(201).json({ message: 'Suprimento e histórico adicionados com sucesso.' });
    } catch (err) {
      await connection.rollback();
      console.error('Erro ao adicionar suprimento e histórico:', err);
      res.status(500).json({ error: 'Erro ao adicionar suprimento ou histórico financeiro.' });
    } finally {
      connection.release();
    }
  });
// DELETE - Remover suprimento
router.delete('/:id', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM suprimentos WHERE id = ?', [id]);
    res.json({ message: 'Suprimento excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir suprimento:', err);
    res.status(500).json({ error: 'Erro ao excluir suprimento.' });
  }
});

module.exports = router;

