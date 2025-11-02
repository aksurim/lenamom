const jwt = require('jsonwebtoken');

// Middleware para proteger rotas verificando o token JWT
const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrai o token do cabeçalho 'Authorization: Bearer TOKEN'
      token = req.headers.authorization.split(' ')[1];

      // Verifica a validade do token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Anexa os dados do usuário (payload do token) ao objeto da requisição
      req.user = decoded;

      next(); // Continua para a próxima função (a rota principal)
    } catch (error) {
      console.error('Erro de autenticação do token:', error);
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  } else {
    return res.status(401).json({ message: 'Não autorizado, nenhum token fornecido.' });
  }
};

// Middleware para verificar se o usuário é um administrador
const admin = (req, res, next) => {
  // Este middleware deve ser usado *depois* do middleware 'protect'
  if (req.user && req.user.perfil === 'admin') {
    next(); // Se for admin, continua
  } else {
    res.status(403).json({ message: 'Acesso negado. Requer perfil de Administrador.' });
  }
};

// Middleware para permissões de movimentação de estoque
const canManageStock = (req, res, next) => {
    // Deve ser usado depois de 'protect'
    const { perfil } = req.user;
    const { quantity } = req.body;

    // Admins podem fazer tudo
    if (perfil === 'admin') {
        return next();
    }

    // Usuários padrão só podem fazer entradas (quantidade positiva)
    if (perfil === 'usuario' && parseInt(quantity, 10) < 0) {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar baixa de estoque.' });
    }

    next();
};


module.exports = { protect, admin, canManageStock };
