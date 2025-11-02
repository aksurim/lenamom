
require('dotenv').config();
const mysql = require('mysql2/promise');

const createUsersTable = async () => {
  let connection;
  try {
    // Configuração da conexão com o banco de dados a partir do .env
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    // Query SQL para criar a tabela 'usuarios'
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        perfil ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Executa a query
    await connection.execute(createTableQuery);

    console.log('Tabela "usuarios" criada com sucesso ou já existente.');

  } catch (error) {
    console.error('Erro ao conectar ou criar a tabela de usuários:', error);
  } finally {
    // Fecha a conexão
    if (connection) {
      await connection.end();
      console.log('Conexão com o banco de dados fechada.');
    }
  }
};

// Executa a função
createUsersTable();
