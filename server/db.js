// Adiciona o 'path' para garantir que o .env seja encontrado no diretório do servidor
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mysql = require('mysql2/promise');

// Cria um pool de conexões para ser reutilizado
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('Pool de conexões com o MySQL configurado.');

// Exporta o pool para que possa ser usado em outros arquivos
module.exports = pool;
