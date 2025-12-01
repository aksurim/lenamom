# Histórico de Alterações e Erros (Change Log)

*Este documento é a memória do projeto. Ele registra todas as falhas, bugs e as soluções aplicadas para evitar regressões e documentar o processo de depuração.*

## Registros

- **2024-08-01 - MÓDULO: Backend (Arquitetura de Impressão)**
  - **ERRO:** A impressão de cupons térmicos e etiquetas de produtos estava falhando na impressora Tomate MDK-006. 1) O cupom causava bipes e alimentação excessiva de papel. 2) A etiqueta era impressa com 90 graus de rotação.
  - **CAUSA RAIZ:** A abordagem de gerar PDFs no frontend e enviá-los para a impressora via driver do sistema operacional era incompatível com o hardware. A impressora esperava comandos nativos (TSPL) e não conseguia interpretar corretamente os PDFs, resultando em erros de formatação, tamanho de papel e rotação.
  - **SOLUÇÃO (ARQUITETURAL):** A lógica de impressão foi migrada do Frontend para o Backend.
    1.  **Comunicação Direta:** Foi criado um novo módulo (`server/services/printerService.js`) que envia comandos brutos para a impressora via Socket TCP/IP, eliminando a dependência de drivers.
    2.  **Geração de TSPL (Cupom):** A rota de finalização de venda (`POST /api/sales`) foi alterada para, em vez de gerar um PDF, construir uma string de comando TSPL com o layout do cupom e os comandos `SIZE` e `CUT` corretos.
    3.  **Geração de TSPL (Etiqueta):** Foram criadas novas rotas (`POST /api/products/generate-label` e `POST /api/products/send-label-command`) para gerar o comando TSPL da etiqueta com os parâmetros de `ROTATION` corretos e enviá-lo para a impressora.
  - **STATUS:** Concluído

- **2024-07-31 - MÓDULO: Frontend (Geração de PDF)**
  - **ERRO (REGRESSÃO):** Após uma alteração para abrir os PDFs em uma nova aba, os PDFs gerados passaram a ser exibidos como "folhas em branco".
  - **CAUSA RAIZ:** Repetição da mesma falha de processo anterior, onde o conteúdo das funções de desenho do PDF foi substituído por comentários.
  - **SOLUÇÃO:** Restaurar o conteúdo completo das funções de geração de PDF no arquivo `pdfUtils.ts`.
  - **STATUS:** Corrigido (posteriormente substituído pela solução arquitetural de impressão no backend).

- **2024-07-31 - MÓDULO: Frontend (Página de Vendas)**
  - **ERRO (REGRESSÃO):** A tela do módulo de Vendas (`/sales`) voltou a ficar em branco.
  - **CAUSA RAIZ:** Falha no processo de geração de código, onde o conteúdo JSX principal do componente foi omitido.
  - **SOLUÇÃO:** Restaurar o conteúdo JSX completo do componente `Sales.tsx`.
  - **STATUS:** Corrigido

- **2024-07-30 - MÓDULO: Backend (Script de Seed de Dados)**
  - **ERRO:** Múltiplos erros sequenciais devido à **suposição da estrutura das tabelas**.
  - **SOLUÇÃO:** O processo foi refeito solicitando a estrutura exata das tabelas (`DESCRIBE`).
  - **STATUS:** Corrigido

- **2024-07-29 - MÓDULO: Backend (Configuração de Ambiente)**
  - **ERRO:** O servidor Node.js não conseguia se conectar ao banco de dados (`Access denied`).
  - **SOLUÇÃO:** A configuração do `dotenv` foi corrigida em `server/db.js`.
  - **STATUS:** Corrigido
