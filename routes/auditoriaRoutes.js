const express = require('express');
const router = express.Router();
const db = require('../db');
require('dotenv').config();

// Rota para registrar auditoria
router.post('/', async (req, res) => {
    const { usuario, acao } = req.body;

    if (!usuario || !acao) {
        return res.status(400).json({ error: 'Usuário e ação são obrigatórios.' });
    }

    try {
        await db.query('INSERT INTO auditoria (usuario, acao) VALUES (?, ?)', [usuario, acao]);
        res.status(201).json({ message: 'Auditoria registrada com sucesso.' });
    } catch (err) {
        console.error('Erro ao registrar auditoria:', err);
        res.status(500).json({ error: 'Erro ao registrar auditoria.' });
    }
});

// Rota para listar auditorias
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM auditoria ORDER BY data DESC'); // 🔧 REMOVIDO .promise()
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar auditorias:', err);
        res.status(500).json({ error: 'Erro ao buscar auditorias.' });
    }
});

module.exports = router;
