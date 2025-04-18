const express = require('express');
const router = express.Router();
const db = require('../db'); // Importa a conexão com o banco de dados
require('dotenv').config(); // Carrega variáveis do arquivo .env

// ✅ ROTA POST – Registrar nova auditoria no banco
router.post('/', async (req, res) => {
    const { usuario, acao } = req.body; // Extrai os dados enviados no corpo da requisição

    // Verifica se os campos obrigatórios foram preenchidos
    if (!usuario || !acao) {
        return res.status(400).json({ error: 'Usuário e ação são obrigatórios.' });
    }

    try {
        // Insere o registro na tabela auditoria
        await db.query('INSERT INTO auditoria (usuario, acao) VALUES (?, ?)', [usuario, acao]);
        res.status(201).json({ message: 'Auditoria registrada com sucesso.' });
    } catch (err) {
        console.error('Erro ao registrar auditoria:', err);
        res.status(500).json({ error: 'Erro ao registrar auditoria.' });
    }
});

// ✅ ROTA GET – Buscar auditorias com filtro unificado (usuario, ação ou data)
router.get('/', async (req, res) => {
    const { filtro } = req.query;

    let query = 'SELECT * FROM auditoria';
    const params = [];

    if (filtro) {
        const likeFiltro = `%${filtro}%`;
        query += ' WHERE usuario LIKE ? OR acao LIKE ? OR data LIKE ?';
        params.push(likeFiltro, likeFiltro, likeFiltro);
    }

    query += ' ORDER BY data DESC';

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar auditorias:', err.message, err.stack);
        res.status(500).json({ error: 'Erro ao buscar auditorias.' });
    }
});


module.exports = router; // Exporta o router para ser usado no app principal



