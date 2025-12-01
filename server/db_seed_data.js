// --- Script para popular o banco de dados com dados de teste (seeding) ---

const pool = require('./db');
const bcrypt = require('bcrypt'); // Importar bcrypt para criptografar a senha

// --- DADOS DE TESTE (Versão Final Corrigida) ---

const FORNECEDORES = [
  { id: 1, code: 'FOR-001', name: 'Fornecedor de Joias Finas', sales_person: 'Carlos', email: 'contato@joiasfinas.com', phone1: '11987654321' },
  { id: 2, code: 'FOR-002', name: 'Essências do Brasil', sales_person: 'Ana', email: 'vendas@essenciasbr.com', phone1: '21912345678' },
];

const METODOS_PAGAMENTO = [
  { id: 1, code: 'DIN', description: 'Dinheiro' },
  { id: 2, code: 'CC', description: 'Cartão de Crédito' },
  { id: 3, code: 'CD', description: 'Cartão de Débito' },
  { id: 4, code: 'PIX', description: 'PIX' },
];

const CLIENTES = [
  { id: 1, code: 'CLI-001', name: 'João da Silva', email: 'joao.silva@example.com', phone: '83988887777', birth_date: '1990-05-15' },
  { id: 2, code: 'CLI-002', name: 'Maria Oliveira', email: 'maria.oliveira@example.com', phone: '83999998888', birth_date: '1985-11-22' },
  { id: 3, code: 'CLI-003', name: 'Cliente Balcão', email: 'cliente@balcao.com', phone: '00000000000', birth_date: null },
];

const PRODUTOS = [
  // CORRIGIDO: Adicionado o campo 'code'
  { code: 'PROD-001', description: 'Colar de Prata 925 com Pingente', unit: 'UND', cost_price: 75.50, sale_price: 149.90, stock_quantity: 15, min_quantity: 5, supplier_id: 1, is_active: 1 },
  { code: 'PROD-002', description: 'Brinco de Ouro 18k Pequeno', unit: 'UND', cost_price: 120.00, sale_price: 249.90, stock_quantity: 10, min_quantity: 3, supplier_id: 1, is_active: 1 },
  { code: 'PROD-003', description: 'Perfume Floral Amadeirado 50ml', unit: 'UND', cost_price: 45.00, sale_price: 99.00, stock_quantity: 30, min_quantity: 10, supplier_id: 2, is_active: 1 },
  { code: 'PROD-004', description: 'Caixa de Presente Especial', unit: 'CX', cost_price: 5.00, sale_price: 15.00, stock_quantity: 50, min_quantity: 20, supplier_id: 2, is_active: 1 },
];

const USUARIO_ADMIN = {
    nome: 'Administrador',
    username: 'admin',
    senhaPlana: 'admin', // Senha em texto plano que será criptografada
    perfil: 'admin'
};


async function seedDatabase() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Conexão com o banco de dados obtida.');

    await connection.beginTransaction();
    console.log('Transação iniciada.');

    console.log('Desativando verificação de chaves estrangeiras...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('Limpando dados de todas as tabelas relevantes...');
    const tablesToClean = ['sale_items', 'stock_movements', 'sales', 'products', 'customers', 'suppliers', 'payment_methods', 'movimentos_caixa', 'auditoria_logs', 'usuarios'];
    for (const table of tablesToClean) {
        await connection.query(`TRUNCATE TABLE ${table}`);
        console.log(`Tabela ${table} limpa e AUTO_INCREMENT resetado.`);
    }

    console.log('Reativando verificação de chaves estrangeiras...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // --- INSERINDO DADOS COM ESTRUTURA CORRETA ---

    console.log('Inserindo Fornecedores...');
    const fornecedoresValues = FORNECEDORES.map(f => [f.id, f.code, f.name, f.sales_person, f.email, f.phone1]);
    await connection.query('INSERT INTO suppliers (id, code, name, sales_person, email, phone1) VALUES ?', [fornecedoresValues]);

    console.log('Inserindo Métodos de Pagamento...');
    const metodosValues = METODOS_PAGAMENTO.map(m => [m.id, m.code, m.description]);
    await connection.query('INSERT INTO payment_methods (id, code, description) VALUES ?', [metodosValues]);

    console.log('Inserindo Clientes...');
    const clientesValues = CLIENTES.map(c => [c.id, c.code, c.name, c.email, c.phone, c.birth_date]);
    await connection.query('INSERT INTO customers (id, code, name, email, phone, birth_date) VALUES ?', [clientesValues]);

    console.log('Inserindo Produtos...');
    const produtosValues = PRODUTOS.map(p => [p.code, p.description, p.unit, p.cost_price, p.sale_price, p.stock_quantity, p.min_quantity, p.supplier_id, p.is_active]);
    await connection.query('INSERT INTO products (code, description, unit, cost_price, sale_price, stock_quantity, min_quantity, supplier_id, is_active) VALUES ?', [produtosValues]);

    console.log('Criando usuário Administrador...');
    const salt = await bcrypt.genSalt(10);
    const senhaCriptografada = await bcrypt.hash(USUARIO_ADMIN.senhaPlana, salt);
    const adminValues = [USUARIO_ADMIN.nome, USUARIO_ADMIN.username, senhaCriptografada, USUARIO_ADMIN.perfil];
    await connection.query('INSERT INTO usuarios (nome, username, senha, perfil) VALUES (?)', [adminValues]);
    console.log(`Usuário '${USUARIO_ADMIN.username}' criado com a senha '${USUARIO_ADMIN.senhaPlana}'.`);


    await connection.commit();
    console.log('\n✅ SUCESSO: Transação confirmada. O banco de dados foi populado com dados de teste, incluindo o usuário admin.');

  } catch (error) {
    console.error('\n❌ FALHA: Ocorreu um erro ao popular o banco de dados.');
    console.error('Detalhes do erro:', error.message);
    if (connection) {
      console.log('Revertendo a transação (rollback)...');
      await connection.rollback();
    }
  } finally {
    if (connection) {
      console.log('Liberando a conexão.');
      connection.release();
    }
    await pool.end();
    console.log('Pool de conexões encerrado.');
  }
}

seedDatabase();
