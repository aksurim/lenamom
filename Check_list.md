# Roteiro de Produção (Check-list)

*Este arquivo contém o passo-a-passo das tarefas a serem executadas no projeto. Marque os itens como concluídos apenas após a validação final.*

## Fase 4: Otimização e Refinamento Final

- [x] **Otimizar Corte de Papel:** Ajustar o comando `SIZE` no script TSPL para que a altura do cupom seja calculada dinamicamente com base no conteúdo, eliminando o desperdício de bobina.
- [ ] **Conectar Banco de Informação:** Garantir que os dados da empresa (nome, contato, etc.) sejam carregados do arquivo de configuração (`company-settings.json`) para a impressão do cupom e do PDF.
  - [x] Adicionar rota `POST` para salvar os dados da empresa, incluindo o campo `instagram`.
  - [x] Corrigir a rota de impressão para ler os dados do arquivo JSON em vez do banco de dados.
  - [ ] **PENDENTE (REGRESSÃO):** Corrigir a rota `POST /api/company-settings` para incluir o `logo_url` no salvamento, evitando que o campo seja apagado.
  - [ ] **PENDENTE:** Unificar o cabeçalho do PDF (`pdfUtils.ts`) para usar os mesmos dados do `company-settings.json`.

## Fase 3: Arquitetura de Impressão Híbrida (WebUSB)

### 3.1 - Backend: Central de Geração de Layout
- [x] **Refatorar Rota de Etiquetas:** Modificar a rota `POST /api/products/generate-label` para gerar e retornar o comando TSPL final.
- [x] **Refatorar Rota de Cupons:** Modificar a rota `POST /api/sales/generate-receipt-command` para gerar e retornar o comando TSPL do cupom.
  - [x] Implementação inicial da geração de TSPL.
  - [x] Correção de erros de `undefined` e `NaN` nos dados.
  - [x] Calibração da largura de impressão para 550 pontos para corrigir o alinhamento.
  - [x] Adição do prefixo "R$" nos valores monetários.
  - [x] **CONCLUÍDO:** Corrigir a busca de dados do cabeçalho para usar os campos de "Dados para Documentos".
  - [x] **CONCLUÍDO:** Validar e ajustar o alinhamento final do layout.
  - [x] **CONCLUÍDO:** Corrigir a geração do PDF de venda no modal pós-venda.

### 3.2 - Frontend: Executor de Impressão
- [x] **Criar Serviço WebUSB:** Implementar o módulo `src/lib/usbPrinter.ts` para comunicação direta com a impressora.
- [x] **Refatorar Impressão de Etiquetas:** Modificar o componente `Products.tsx` para usar o serviço WebUSB.
- [x] **Refatorar Impressão de Cupons:** Modificar o componente `Sales.tsx` para usar o serviço WebUSB.

### 3.3 - Documentação e Limpeza
- [x] **Criar Guia do Cliente:** Gerar o arquivo `INSTRUCOES_IMPRESSORA.md`.
- [x] **Atualizar Documentação do Projeto:** Revisar e atualizar todos os arquivos `.md` para refletir a arquitetura final e o processo de depuração.
  - [x] `Change_log.md` atualizado com o histórico de depuração.
  - [x] `Blueprint.md` atualizado com detalhes de implementação.
  - [x] `README.md` atualizado com notas de desenvolvimento.

---

## Histórico de Fases (Desenvolvimento da Impressão)

- **(Obsoleto)** Fase 2: Refatoração da Arquitetura de Impressão (Backend via Socket)
- **(Obsoleto)** Fase 1: Refatoração do Fluxo de Impressão de Venda (Frontend via PDF)
