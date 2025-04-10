const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para verificar autenticação e permissão do usuário
// Recebe como parâmetro a permissão necessária (pode ser string ou array de permissões)
const verificarAutenticacao = (permissaoNecessaria) => (req, res, next) => {
    // Extrai o token JWT do cabeçalho Authorization (formato: "Bearer token")
    const token = req.headers['authorization']?.split(' ')[1];

    // Caso o token não esteja presente, retorna erro de não autorizado
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    try {
        // Verifica e decodifica o token usando a chave secreta definida no .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Adiciona os dados decodificados ao objeto da requisição para uso posterior
        req.user = decoded;

        // Se uma permissão específica for necessária, verifica se o usuário possui essa permissão
        if (permissaoNecessaria) {
            const possuiPermissao = Array.isArray(permissaoNecessaria)
                ? permissaoNecessaria.includes(decoded.permissao) // múltiplas permissões aceitas
                : decoded.permissao === permissaoNecessaria;     // apenas uma permissão específica

            // Caso o usuário não tenha a permissão exigida, retorna erro de acesso negado
            if (!possuiPermissao) {
                return res.status(403).json({ error: 'Permissão insuficiente' });
            }
        }

        // Usuário autenticado e com permissão → prossegue para a próxima função
        next();
    } catch (err) {
        console.error('Erro ao verificar token:', err);
        return res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = verificarAutenticacao;

