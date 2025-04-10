const mysql = require('mysql2/promise'); 
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

// Criação do pool de conexões com o banco de dados
// O pool permite reutilizar conexões abertas, melhorando a performance da aplicação
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',         // Endereço do servidor MySQL
    user: process.env.DB_USER || 'root',              // Usuário do banco de dados
    password: process.env.DB_PASSWORD || '',          // Senha do banco de dados
    database: process.env.DB_NAME || 'vidaplus_db',   // Nome do banco de dados
    waitForConnections: true,                         // Aguarda conexões se o limite for atingido
    connectionLimit: 10,                              // Número máximo de conexões simultâneas
    queueLimit: 0                                     // Número máximo de conexões na fila (0 = ilimitado)
});

// Exporta o pool para ser usado em outras partes da aplicação (ex: rotas e controladores)
module.exports = pool;

