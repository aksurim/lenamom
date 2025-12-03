# Roteiro de Produção (Check-list)

*Este arquivo contém o passo-a-passo das tarefas a serem executadas no projeto. Marque os itens como concluídos apenas após a validação final.*

## Fase 6: Correções e Melhorias de Estoque e UI (Sessão Atual)

- [x] **Melhorar UI da Entrada de Estoque:** Substituir o dropdown de seleção de produtos por um campo de busca inteligente.
  - [x] Reutilizar o componente `ProductSearch` da tela de Vendas na página `StockEntry.tsx`.
- [x] **Corrigir Bug Crítico ao Salvar Entrada de Estoque:** Resolver o erro 404 que impedia o registro de novas movimentações.
  - [x] Criar o arquivo de rotas `server/routes/stock-movements.js` com a lógica de GET e POST.
  - [x] Registrar a nova rota `/api/stock-movements` no `server/index.js`.
  - [x] Corrigir as chamadas da API no frontend (`StockEntry.tsx`) para usar a URL correta.
- [x] **Corrigir Bug 500 ao Salvar Entrada de Estoque:** Resolver o erro de servidor causado por incompatibilidade com o banco de dados.
  - [x] Investigar e identificar a coluna `user_id` como a causa da falha no `INSERT`.
  - [x] Remover a coluna `user_id` da query na rota `POST /api/stock-movements`.
- [x] **Corrigir Lógica de Busca de Produtos para Estoque:** Permitir a busca de produtos com estoque zerado ou negativo na tela de entrada.
  - [x] Criar uma nova rota no backend (`/api/products/search-for-stock`) que não filtra por `stock_quantity`.
  - [x] Atualizar o `ProductSearch` em `StockEntry.tsx` para usar a nova rota.
- [x] **Melhorar Relatório de Balanço de Estoque:** Adicionar filtro por fornecedor.
  - [x] Alterar a API (`/reports/stock-balance`) para aceitar um `supplierId`.
  - [x] Adicionar um dropdown de fornecedores na UI do relatório.
- [x] **Ajustar Título da Aplicação:** Corrigir o título exibido na aba do navegador.
  - [x] Modificar a tag `<title>` no arquivo `index.html`.

## Fase 5: Modernização do PDF de Venda

- [x] **Modernizar Layout do PDF de Venda:** Unificar e redesenhar o PDF de recibo de venda para um padrão profissional.
  - [x] Enriquecer a API (`/api/sales/:id/details`) para incluir dados de entrega do cliente e forma de pagamento.
  - [x] Criar uma função centralizada (`generateSaleReceiptPdf`) para o novo layout.
  - [x] Implementar o novo layout, incluindo "boxes" de divisão, cabeçalho de tabela preto e informações de pagamento.
  - [x] Integrar a nova função na página de Vendas e no Histórico de Vendas.
  - [x] Corrigir bugs de regressão (`generateStandardPdf` ausente, `toFixed` em `string`, e coluna SQL incorreta).

## Fase 4: Otimização e Refinamento Final

- [x] **Otimizar Corte de Papel:** Ajustar o comando `SIZE` no script TSPL para que a altura do cupom seja calculada dinamicamente com base no conteúdo, eliminando o desperdício de bobina.
- [x] **Conectar Banco de Informação:** Garantir que os dados da empresa (nome, contato, etc.) sejam carregados do arquivo de configuração (`company-settings.json`) para a impressão do cupom e do PDF.
  - [x] Adicionar rota `POST` para salvar os dados da empresa, incluindo o campo `instagram`.
  - [x] Corrigir a rota de impressão para ler os dados do arquivo JSON em vez do banco de dados.
  - [x] **CONCLUÍDO (REGRESSÃO):** Corrigir a rota `POST /api/company-settings` para incluir o `logo_url` no salvamento, evitando que o campo seja apagado.
  - [x] **CONCLUÍDO:** Unificar o cabeçalho do PDF (`pdfUtils.ts`) para usar os mesmos dados do `company-settings.json`.
  - [x] **CONCLUÍDO:** Registrar a rota `/api/company-settings` no `server/index.js` para corrigir o erro 404.

## Fase 3: Arquitetura de Impressão Híbrida (WebUSB)

- [x] **CONCLUÍDO**

---

## Histórico de Fases (Desenvolvimento da Impressão)

- **(Obsoleto)** Fase 2: Refatoração da Arquitetura de Impressão (Backend via Socket)
- **(Obsoleto)** Fase 1: Refatoração do Fluxo de Impressão de Venda (Frontend via PDF)
