require('dotenv').config();
const mysql = require('mysql2/promise');

const createAuditLogTable = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Conexão com o banco de dados estabelecida com sucesso.');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS auditoria_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT,
        usuario_nome VARCHAR(255),
        acao VARCHAR(100) NOT NULL,
        detalhes TEXT,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `;

    await connection.execute(createTableQuery);

    console.log('Tabela "auditoria_logs" criada com sucesso ou já existente.');

  } catch (error) {
    console.error('Erro ao conectar ou criar a tabela de logs de auditoria:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexão com o banco de dados fechada.');
    }
  }
};

createAuditLogTable();
