# Histórico de Alterações e Erros (Change Log)

*Este documento é a memória do projeto. Ele registra todas as falhas, bugs e as soluções aplicadas para evitar regressões e documentar o processo de depuração.*

## Registros

- **2024-08-02 - MÓDULO: Frontend (Arquitetura de Impressão Final)**
  - **ERRO:** A impressão via backend (Socket TCP/IP) falhou devido à impressora do cliente estar conectada via USB, não pela rede. O sistema operacional bloqueava o acesso direto à porta USB pelo driver padrão.
  - **CAUSA RAIZ:** Premissa incorreta sobre o método de conexão da impressora. A arquitetura de impressão via backend não é viável para dispositivos USB controlados pelo cliente.
  - **SOLUÇÃO (ARQUITETURAL FINAL):** A lógica de impressão foi migrada para uma arquitetura híbrida, utilizando a API WebUSB no frontend.
    1.  **Backend como Gerador de Layout:** O backend mantém a responsabilidade de gerar a string de comando TSPL correta, com todos os ajustes de layout, acentuação (`CODEPAGE`) e posicionamento.
    2.  **Frontend como Executor:** O frontend agora busca o comando TSPL do backend e usa a nova função `sendTsplOverUsb` para enviar o comando diretamente para a impressora via WebUSB.
    3.  **Configuração do Cliente:** Para que a WebUSB funcione, o cliente precisa substituir o driver padrão da impressora pelo driver `WinUSB` usando o utilitário **Zadig**. Um guia (`INSTRUCOES_IMPRESSORA.md`) foi criado para este fim.
  - **STATUS:** Concluído

- **2024-08-01 - MÓDULO: Backend (Arquitetura de Impressão Inicial)**
  - **ERRO:** A impressão de cupons e etiquetas falhava na impressora Tomate MDK-006.
  - **CAUSA RAIZ:** Incompatibilidade entre o PDF gerado e o driver da impressora térmica.
  - **SOLUÇÃO (ARQUITETURAL INTERMEDIÁRIA):** A lógica de impressão foi migrada do Frontend para o Backend para usar comunicação direta via Socket TCP/IP. (Esta solução foi posteriormente substituída pela abordagem WebUSB).
  - **STATUS:** Obsoleto

- **2024-07-31 - MÓDULO: Frontend (Geração de PDF)**
  - **ERRO (REGRESSÃO):** PDFs gerados como "folhas em branco".
  - **CAUSA RAIZ:** Conteúdo das funções de desenho do PDF foi substituído por comentários.
  - **SOLUÇÃO:** Restaurar o conteúdo das funções.
  - **STATUS:** Corrigido (posteriormente tornado obsoleto pela nova arquitetura).

- **2024-07-31 - MÓDULO: Frontend (Página de Vendas)**
  - **ERRO (REGRESSÃO):** A tela do módulo de Vendas (`/sales`) voltou a ficar em branco.
  - **CAUSA RAIZ:** Omissão do conteúdo JSX principal do componente.
  - **SOLUÇÃO:** Restaurar o conteúdo JSX do componente `Sales.tsx`.
  - **STATUS:** Corrigido

- **2024-07-30 - MÓDULO: Backend (Script de Seed de Dados)**
  - **ERRO:** Erros sequenciais devido à suposição da estrutura das tabelas.
  - **SOLUÇÃO:** Refeito o processo solicitando a estrutura exata das tabelas.
  - **STATUS:** Corrigido

- **2024-07-29 - MÓDULO: Backend (Configuração de Ambiente)**
  - **ERRO:** O servidor Node.js não conseguia se conectar ao banco de dados.
  - **SOLUÇÃO:** Corrigida a configuração do `dotenv` em `server/db.js`.
  - **STATUS:** Corrigido
