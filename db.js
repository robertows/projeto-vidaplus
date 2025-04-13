// Autor: RU:4334534 ROBERTO CARVALHO

// Importa o módulo mysql2/promise para trabalhar com MySQL de forma assíncrona
const mysql = require('mysql2/promise'); 

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Debug opcional para ver os dados carregados do .env
console.log('🔌 Conectando com DB:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Cria um pool de conexões MySQL com as configurações fornecidas
const pool = mysql.createPool({
    // Host do banco de dados, usa variável de ambiente ou 'localhost' como padrão
    host: process.env.DB_HOST || 'localhost',
    // Usuário do banco de dados, usa variável de ambiente ou 'root' como padrão
    user: process.env.DB_USER || 'root',
    // Senha do banco de dados, usa variável de ambiente ou vazio como padrão
    password: process.env.DB_PASSWORD || '',
    // Nome do banco de dados, usa variável de ambiente ou 'vidaplus_db' como padrão
    database: process.env.DB_NAME || 'vidaplus_db',
    // Porta do banco de dados, converte a variável de ambiente para número ou usa 3306 como padrão
    port: Number(process.env.DB_PORT) || 3306, // 👈 conversão obrigatória
    // Aguarda por conexões disponíveis no pool
    waitForConnections: true,
    // Define o limite máximo de 10 conexões simultâneas
    connectionLimit: 10,
    // Define que não há limite para a fila de espera de conexões
    queueLimit: 0
});

// Exporta o pool de conexões para ser utilizado em outros módulos do projeto
module.exports = pool;


