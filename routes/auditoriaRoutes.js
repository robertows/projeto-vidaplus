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

// ✅ ROTA GET – Buscar auditorias com filtros opcionais
router.get('/', async (req, res) => {
    // Captura os parâmetros de filtro da URL (ex: ?usuario=admin&data=2025-04-15)
    const { usuario, acao, data } = req.query;

    // Monta a base da consulta SQL (o WHERE 1=1 permite adicionar filtros depois)
    let query = 'SELECT * FROM auditoria WHERE 1=1';
    const params = []; // Armazena os valores para a consulta

    // Adiciona filtro por usuário, se fornecido
    if (usuario) {
        query += ' AND usuario LIKE ?';
        params.push(`%${usuario}%`);
    }

    // Adiciona filtro por ação, se fornecido
    if (acao) {
        query += ' AND acao LIKE ?';
        params.push(`%${acao}%`);
    }

    // Adiciona filtro por data exata (formato esperado: YYYY-MM-DD)
    if (data) {
        query += ' AND DATE(data) = ?';
        params.push(data);
    }

    // Ordena os registros da auditoria da mais recente para a mais antiga
    query += ' ORDER BY data DESC';

    try {
        // Executa a consulta no banco com os filtros aplicados
        const [rows] = await db.query(query, params);
        res.json(rows); // Retorna os registros encontrados
    } catch (err) {
        console.error('Erro ao buscar auditorias:', err);
        res.status(500).json({ error: 'Erro ao buscar auditorias.' });
    }
});

module.exports = router; // Exporta o router para ser usado no app principal


