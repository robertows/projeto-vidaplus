const mysql = require('mysql2/promise'); 
require('dotenv').config();

// Debug opcional para ver os dados carregados do .env
console.log('🔌 Conectando com DB:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vidaplus_db',
    port: Number(process.env.DB_PORT) || 3306, // 👈 conversão obrigatória
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;


