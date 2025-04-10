const express = require('express');
const router = express.Router();
const verificarAutenticacao = require('../middlewares/authMiddleware');
const db = require('../db');

// ✅ ROTA GET - Listar consultas presenciais
router.get('/', verificarAutenticacao(['admin', 'atendente', 'profissional']), async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, p.nome AS paciente, pr.nome AS profissional
            FROM consultas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN profissionais pr ON c.profissional_id = pr.id
            ORDER BY c.data DESC, c.hora DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar consultas:', err);
        res.status(500).json({ error: 'Erro ao buscar consultas.' });
    }
});

// ✅ ROTA POST - Criar nova consulta
router.post('/', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
    const { paciente_id, profissional_id, especialidade, data, hora } = req.body;

    if (!paciente_id || !profissional_id || !especialidade || !data || !hora) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        await db.query(`
            INSERT INTO consultas (paciente_id, profissional_id, especialidade, data, hora)
            VALUES (?, ?, ?, ?, ?)
        `, [paciente_id, profissional_id, especialidade, data, hora]);

        res.status(201).json({ message: 'Consulta cadastrada com sucesso.' });
    } catch (err) {
        console.error('Erro ao cadastrar consulta:', err);
        res.status(500).json({ error: 'Erro ao cadastrar consulta.' });
    }
});

// ✅ ROTA DELETE - Excluir consulta
router.delete('/:id', verificarAutenticacao(['admin', 'atendente']), async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM consultas WHERE id = ?', [id]);
        res.json({ message: 'Consulta excluída com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir consulta:', err);
        res.status(500).json({ error: 'Erro ao excluir consulta.' });
    }
});

module.exports = router;
