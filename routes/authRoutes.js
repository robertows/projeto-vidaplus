// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db'); // Conexão com o banco de dados
require('dotenv').config();

// Rota de login do sistema
// Verifica as credenciais do usuário e gera um token JWT se estiverem corretas
router.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    // Verifica se os campos obrigatórios foram preenchidos
    if (!usuario || !senha) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    try {
        console.log('🔐 Tentando login com usuário:', usuario); // Log para debug

        // Busca o usuário no banco de dados pelo nome de usuário informado
        const [rows] = await db.query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
        const user = rows[0];

        // Verifica se o usuário existe
        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        // Compara a senha fornecida com a senha criptografada armazenada no banco
        const senhaCorreta = await bcrypt.compare(senha, user.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // Gera o token JWT com as informações do usuário e uma validade de 8 horas
        const token = jwt.sign({
            id: user.id,
            usuario: user.usuario,
            permissao: user.permissao
        }, process.env.JWT_SECRET, { expiresIn: '8h' });

        // 📝 REGISTRA LOGIN NA AUDITORIA
        await db.query('INSERT INTO auditoria (usuario, acao) VALUES (?, ?)', [usuario, `Login realizado por ${usuario}`]);
      

        // Retorna o token e os dados básicos do usuário autenticado
        res.json({
            token,
            usuario: user.usuario,
            permissao: user.permissao
        });
    } catch (err) {
        console.error('🔥 Erro no login:', err);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

module.exports = router;

