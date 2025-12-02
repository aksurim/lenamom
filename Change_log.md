# Histórico de Alterações e Erros (Change Log)

*Este documento é a memória do projeto. Ele registra todas as falhas, bugs e as soluções aplicadas para evitar regressões e documentar o processo de depuração.*

## Registros

- **2024-08-08 - MÓDULO: Backend/Frontend (Configurações da Empresa)**
  - **ERRO (REGRESSÃO):** Após refatorar a lógica para salvar os dados da empresa, o logo desapareceu dos PDFs e os dados do cabeçalho não foram corrigidos como esperado.
  - **CAUSA RAIZ:** A nova rota `POST /api/company-settings` foi criada para salvar os dados da empresa, mas não incluiu o campo `logo_url` na lógica de salvamento. Ao salvar as configurações, o arquivo `company-settings.json` foi sobrescrito sem a informação do logo, causando a quebra da funcionalidade.
  - **STATUS:** Pendente de Correção

- **2024-08-07 - MÓDULO: Backend (Refinamento do Cupom)**
  - **TAREFA:** Realizar uma série de ajustes finos no layout do cupom térmico para atingir um padrão profissional.
  - **PROBLEMAS IDENTIFICADOS:**
    1.  **Centralização e Linhas:** Textos centralizados e linhas divisórias (`BAR`) não se comportavam como esperado devido a inconsistências do firmware da impressora.
    2.  **Alinhamento de Texto Longo:** A "Forma de Pagamento" (ex: "Cartão de Crédito") era cortada ao ser alinhada à direita.
    3.  **Legibilidade:** A fonte padrão era muito pequena.
    4.  **Hierarquia Visual:** O layout era "plano", sem destaque para informações importantes.
  - **SOLUÇÃO (ITERATIVA):**
    1.  **Substituição de `BAR` por Caracteres:** O comando `BAR` foi abandonado em favor de uma linha de caracteres (`=`), dando controle total sobre o alinhamento do separador.
    2.  **Aumento Global da Fonte:** A fonte de todo o cupom foi aumentada para um tamanho mais legível (`"2"`), e o espaçamento vertical foi ajustado para manter a clareza.
    3.  **Reorganização Lógica:** A linha "Forma de Pagamento" foi movida para o final da seção de totais e alinhada à esquerda para evitar cortes.
    4.  **Ajuste de Margem:** A margem direita para os valores totais foi recuada para a esquerda, criando um "respiro" visual mais agradável.
  - **STATUS:** Concluído

- **2024-08-06 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO:** O alinhamento de valores monetários (subtotal, total, etc.) no cupom térmico estava incorreto e quebrava com valores de diferentes comprimentos.
  - **CAUSA RAIZ:** A posição `x` do texto era calculada manualmente, assumindo uma largura de caractere fixa (`charWidth`). Fontes de impressora térmica não são estritamente monoespaçadas, causando desalinhamento.
  - **SOLUÇÃO:** A lógica de alinhamento foi refatorada para usar os comandos `RIGHT` e `LEFT` nativos da linguagem TSPL. Em vez de calcular a posição `x`, o alinhamento é definido como `RIGHT` e a margem direita é usada como coordenada, delegando o trabalho de alinhamento para a própria impressora. Isso garante um alinhamento perfeito independentemente da largura do texto.
  - **STATUS:** Concluído

- **2024-08-05 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO (REGRESSÃO GRAVE):** O servidor Node.js travava repetidamente ao iniciar (`app crashed`) após modificações no arquivo `server/routes/sales.js`.
  - **CAUSA RAIZ:** Múltiplos erros de sintaxe foram introduzidos em tentativas sucessivas de refatoração. A causa fundamental foi a tentativa de aplicar várias melhorias de uma só vez, em vez de seguir um processo incremental. Isso tornou a depuração difícil e levou à reintrodução de erros.
  - **SOLUÇÃO (ESTRATÉGICA):** A estratégia de depuração foi resetada. O arquivo `server/routes/sales.js` foi restaurado para a última versão comprovadamente estável. A partir dessa base, as melhorias foram re-aplicadas de forma incremental e cirúrgica, com validação a cada passo, o que permitiu a correção bem-sucedida do problema.
  - **STATUS:** Concluído

- **2024-08-04 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO (REGRESSÃO):** O servidor Node.js travou ao iniciar (`app crashed`) após uma modificação no arquivo `server/routes/sales.js`.
  - **CAUSA RAIZ:** Erro de sintaxe introduzido durante a refatoração da função `formatCurrency`.
  - **STATUS:** Superado

- **2024-08-03 - MÓDULO: Backend (Impressão de Cupom)**
  - **ERRO:** A impressão do cupom térmico estava sendo cortada prematuramente e o layout estava desalinhado.
  - **CAUSA RAIZ:** Combinação de configurações de impressão incorretas (ex: `PRINT 1` vs `PRINT 1,1`) e o uso de uma largura de trabalho (`paperWidth`) teórica que não correspondia à área de impressão real do hardware.
  - **SOLUÇÃO:** Realização de um teste de calibração para determinar a largura de impressão real (550 pontos). O script TSPL foi ajustado para usar essa largura calibrada e o comando `PRINT 1,1` em conjunto com um `SIZE` de altura fixa, estabilizando o layout.
  - **STATUS:** Concluído

- **2024-08-02 - MÓDULO: Frontend (Arquitetura de Impressão Final)**
  - **ERRO:** A impressão via backend (Socket TCP/IP) falhou devido à impressora do cliente estar conectada via USB, não pela rede.
  - **CAUSA RAIZ:** Premissa incorreta sobre o método de conexão da impressora.
  - **SOLUÇÃO (ARQUITETURAL FINAL):** Migração para uma arquitetura híbrida WebUSB.
  - **STATUS:** Concluído

- **2024-08-01 - MÓDULO: Backend (Arquitetura de Impressão Inicial)**
  - **ERRO:** A impressão de cupons e etiquetas falhava na impressora Tomate MDK-006.
  - **CAUSA RAIZ:** Incompatibilidade entre o PDF gerado e o driver da impressora térmica.
  - **STATUS:** Obsoleto

- **2024-07-31 - MÓDULO: Frontend (Geração de PDF)**
  - **ERRO (REGRESSÃO):** PDFs gerados como "folhas em branco".
  - **CAUSA RAIZ:** Conteúdo das funções de desenho do PDF foi substituído por comentários.
  - **STATUS:** Corrigido (posteriormente tornado obsoleto pela nova arquitetura).

- **2024-07-31 - MÓDULO: Frontend (Página de Vendas)**
  - **ERRO (REGRESSÃO):** A tela do módulo de Vendas (`/sales`) voltou a ficar em branco.
  - **CAUSA RAIZ:** Omissão do conteúdo JSX principal do componente.
  - **STATUS:** Corrigido

- **2024-07-30 - MÓDULO: Backend (Script de Seed de Dados)**
  - **ERRO:** Erros sequenciais devido à suposição da estrutura das tabelas.
  - **STATUS:** Corrigido

- **2024-07-29 - MÓDULO: Backend (Configuração de Ambiente)**
  - **ERRO:** O servidor Node.js não conseguia se conectar ao banco de dados.
  - **STATUS:** Corrigido
