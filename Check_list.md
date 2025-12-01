# Roteiro de Produção (Check-list)

*Este arquivo contém o passo-a-passo das tarefas a serem executadas no projeto. Marque os itens como concluídos apenas após a validação final.*

## Fase 3: Arquitetura de Impressão Híbrida (WebUSB)

### 3.1 - Backend: Central de Geração de Layout
- [x] **Refatorar Rota de Etiquetas:** Modificar a rota `POST /api/products/generate-label` para gerar e retornar o comando TSPL final, com layout, acentuação e densidade de barras corrigidos.
- [x] **Refatorar Rota de Cupons:** Modificar a rota `POST /api/sales` para remover a impressão automática e criar a rota `POST /api/sales/generate-receipt-command` para gerar e retornar o comando TSPL do cupom.

### 3.2 - Frontend: Executor de Impressão
- [x] **Criar Serviço WebUSB:** Implementar o módulo `src/lib/usbPrinter.ts` com as funções `getUsbDevice` e `sendTsplOverUsb` para comunicação direta com a impressora.
- [x] **Refatorar Impressão de Etiquetas:** Modificar o componente `Products.tsx` para usar o serviço WebUSB, obtendo o comando do backend e enviando-o para a impressora.
- [x] **Refatorar Impressão de Cupons:** Modificar o componente `Sales.tsx` para usar o serviço WebUSB, permitindo a reimpressão do cupom a pedido do usuário.

### 3.3 - Documentação e Limpeza
- [x] **Criar Guia do Cliente:** Gerar o arquivo `INSTRUCOES_IMPRESSORA.md` com o passo a passo da configuração do Zadig.
- [x] **Atualizar Documentação do Projeto:** Revisar e atualizar todos os arquivos `.md` para refletir a arquitetura final.
- [x] **Limpar Arquivos de Teste:** Remover ou esvaziar scripts de diagnóstico obsoletos (ex: `test_printer.js`).

---

## Histórico de Fases (Desenvolvimento da Impressão)

- **(Obsoleto)** Fase 2: Refatoração da Arquitetura de Impressão (Backend via Socket)
  - *Esta fase foi um passo intermediário importante para a depuração, mas a abordagem foi substituída pela WebUSB devido à conexão USB da impressora.*

- **(Obsoleto)** Fase 1: Refatoração do Fluxo de Impressão de Venda (Frontend via PDF)
  - *A abordagem inicial de gerar PDFs no frontend se mostrou incompatível com o hardware da impressora térmica.*
