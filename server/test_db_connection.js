// Arquivo de teste temporário para verificar a conexão com o banco de dados.

const pool = require('./db'); // Importa a configuração do pool de conexões

async function testConnection() {
  let connection;
  try {
    console.log('Tentando obter uma conexão do pool...');
    connection = await pool.getConnection();
    console.log('Conexão obtida com sucesso!');

    console.log('Executando uma consulta de teste (SELECT 1)...');
    const [rows] = await connection.query('SELECT 1');
    console.log('Consulta executada com sucesso. Resultado:', rows);

    console.log('\n✅ SUCESSO: A conexão com o banco de dados foi estabelecida corretamente.');

  } catch (error) {
    console.error('\n❌ FALHA: Não foi possível conectar ao banco de dados.');
    console.error('Detalhes do erro:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }

  } finally {
    if (connection) {
      console.log('Liberando a conexão de volta para o pool...');
      connection.release();
    }
    // Encerra o pool para que o script possa terminar a execução.
    await pool.end();
    console.log('Pool de conexões encerrado.');
  }
}

testConnection();
