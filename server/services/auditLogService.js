const pool = require('../db');

/**
 * Registra uma ação de auditoria no banco de dados.
 * Esta função é "fire-and-forget" para não bloquear a resposta da API.
 * @param {object} req - O objeto da requisição do Express, deve conter `req.user`.
 * @param {string} acao - O tipo de ação realizada (ex: 'CRIAR_PRODUTO').
 * @param {object | string} detalhes - Um objeto ou string com os detalhes da ação.
 */
const logAction = (req, acao, detalhes) => {
  // Executa a lógica de log sem esperar pela sua conclusão (fire-and-forget)
  setImmediate(async () => {
    try {
      const usuario_id = req.user?.id || null;
      const usuario_nome = req.user?.nome || 'Sistema'; // 'Sistema' se a ação for anônima
      const detalhesString = typeof detalhes === 'object' ? JSON.stringify(detalhes) : detalhes;

      await pool.query(
        'INSERT INTO auditoria_logs (usuario_id, usuario_nome, acao, detalhes) VALUES (?, ?, ?, ?)',
        [usuario_id, usuario_nome, acao, detalhesString]
      );
    } catch (error) {
      // Como é uma operação em segundo plano, apenas logamos o erro no console
      // para não quebrar a aplicação principal.
      console.error('Falha ao registrar o log de auditoria:', error);
    }
  });
};

module.exports = { logAction };
