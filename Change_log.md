# Histórico de Alterações e Erros (Change Log)

*Este documento é a memória do projeto. Ele registra todas as falhas, bugs e as soluções aplicadas para evitar regressões e documentar o processo de depuração.*

## Registros

- **2024-08-10 - MÓDULO: Frontend/Backend (Busca de Estoque)**
  - **ERRO:** A busca de produtos na tela de "Entrada de Estoque" não encontrava produtos com estoque zerado ou negativo.
  - **CAUSA RAIZ:** A tela de Estoque estava utilizando a mesma rota da API de Vendas (`/api/products/search`), que por design filtra produtos com `stock_quantity > 0`.
  - **SOLUÇÃO:**
    1.  **Backend:** Foi criada uma nova rota dedicada, `/api/products/search-for-stock`, que busca produtos sem a restrição de quantidade em estoque.
    2.  **Frontend:** O componente de busca na página `StockEntry.tsx` foi atualizado para consumir a nova rota, corrigindo a lógica de negócio.
  - **STATUS:** Concluído

- **2024-08-10 - MÓDULO: Backend/Estoque (`stock-movements`)**
  - **ERRO:** Ao registrar uma nova movimentação de estoque, a API retornava `Erro 500 (Internal Server Error)`.
  - **CAUSA RAIZ:** A instrução `INSERT` no arquivo `server/routes/stock-movements.js` tentava inserir um valor na coluna `user_id`, que não existe na tabela `stock_movements` do banco de dados. A presunção da estrutura da tabela pelo agente causou a falha.
  - **SOLUÇÃO:** A query `INSERT` foi corrigida, removendo a coluna `user_id` para alinhar o código com a estrutura real da tabela.
  - **AÇÃO ADICIONAL:** Uma nova regra foi adicionada ao `Regras_Projeto.md` para exigir a verificação da estrutura do banco de dados antes de codificar interações com ele.
  - **STATUS:** Concluído

- **2024-08-09 - MÓDULO: Frontend/Backend (Modernização do PDF de Venda)**
  - **TAREFA:** Modernizar o PDF de venda (A4) para um layout profissional, unificando a geração para a pós-venda e a reimpressão do histórico.
  - **MELHORIAS:**
    1.  **Dados de Entrega:** A API foi enriquecida para fornecer o endereço completo e o telefone do cliente.
    2.  **Layout Profissional:** Uma nova função centralizada (`generateSaleReceiptPdf`) foi criada para renderizar o PDF, incluindo:
        - "Boxes" com bordas arredondadas para separar os dados do cliente e o resumo financeiro.
        - Cabeçalho da tabela de itens estilizado com fundo preto e texto branco.
        - Inclusão da forma de pagamento no resumo financeiro.
    3.  **Correção de Bugs em Cascata:** Durante o desenvolvimento, uma série de bugs foram identificados e corrigidos, incluindo uma coluna inexistente na consulta SQL (`address_complement`) e a conversão de tipos de dados (`string` para `number`) para valores monetários.
  - **STATUS:** Concluído

- **2024-08-08 - MÓDULO: Backend/Frontend (Configurações da Empresa)**
  - **ERRO (REGRESSÃO):** Após refatorar a lógica para salvar os dados da empresa, a funcionalidade parou de funcionar, retornando um erro `404 (Not Found)` no frontend.
  - **CAUSA RAIZ:** A investigação revelou uma cascata de erros:
    1.  A rota `POST /api/company-settings` foi criada, mas não foi registrada no arquivo principal do servidor (`server/index.js`), tornando-a inacessível.
    2.  A página de configurações (`Settings.tsx`) não estava apontando para a nova rota, e sua lógica de salvamento estava misturada com outras configurações.
    3.  A rotina de salvamento inicial não preservava campos existentes (como `logo_url`), causando perda de dados.
  - **SOLUÇÃO (FINAL):**
    1.  **Registro da Rota:** A rota `/api/company-settings` foi devidamente importada e registrada no `server/index.js`.
    2.  **Refatoração do Frontend:** O componente `Settings.tsx` foi refatorado para separar a lógica de "Dados da Empresa" das "Configurações Gerais", com botões de salvar distintos e apontando para as rotas corretas.
    3.  **Lógica de Salvamento Robusta:** A rota `POST /api/company-settings` foi aprimorada para ler o arquivo existente antes de salvar, mesclando os dados antigos e novos para garantir que nenhum campo seja perdido acidentalmente.
  - **STATUS:** Concluído

- **2024-08-07 - MÓDULO: Backend (Refinamento do Cupom)**
  - **TAREFA:** Realizar uma série de ajustes finos no layout do cupom térmico para atingir um padrão profissional.
  - **STATUS:** Concluído

- **2024-08-06 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO:** O alinhamento de valores monetários no cupom térmico estava incorreto.
  - **SOLUÇÃO:** A lógica de alinhamento foi refatorada para usar os comandos `RIGHT` e `LEFT` nativos da linguagem TSPL.
  - **STATUS:** Concluído

- **2024-08-05 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO (REGRESSÃO GRAVE):** O servidor Node.js travava repetidamente ao iniciar.
  - **SOLUÇÃO (ESTRATÉGICA):** O arquivo `server/routes/sales.js` foi restaurado para uma versão estável e as melhorias foram re-aplicadas de forma incremental.
  - **STATUS:** Concluído
... (registros anteriores omitidos para brevidade)
