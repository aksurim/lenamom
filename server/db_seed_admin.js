require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

const seedAdminUser = async () => {
  const username = 'admin';
  const plainPassword = 'admin123';
  const profile = 'admin';

  try {
    // Verifica se o usuário admin já existe
    const [users] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);

    if (users.length > 0) {
      console.log(`O usuário "${username}" já existe. Nenhum novo usuário foi criado.`);
      return;
    }

    // Gera o hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Insere o novo usuário admin no banco de dados
    await db.query(
      'INSERT INTO usuarios (nome, username, senha, perfil) VALUES (?, ?, ?, ?)',
      ['Administrador Padrão', username, hashedPassword, profile]
    );

    console.log(`Usuário administrador "${username}" criado com sucesso!`);
    console.log('Por favor, anote a senha padrão: admin123');

  } catch (error) {
    console.error('Erro ao criar o usuário administrador:', error);
  } finally {
    // Encerra o pool de conexões para que o script termine
    await db.end();
  }
};

seedAdminUser();
