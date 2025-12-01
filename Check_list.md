# Roteiro de Produção (Check-list)

*Este arquivo contém o passo-a-passo das tarefas a serem executadas no projeto. Marque os itens como concluídos apenas após a validação final.*

## Fase 2: Refatoração da Arquitetura de Impressão (Backend)

### 2.1 - Criação do Serviço de Impressão
- [x] **Identificar Diretório:** Localizar o diretório de serviços do backend (`server/services`).
- [x] **Criar Módulo de Comunicação:** Implementar o `printerService.js` com a função `sendCommandToPrinter` utilizando o módulo `net` para comunicação via Socket TCP/IP.

### 2.2 - Refatoração da Impressão de Cupom (Vendas)
- [x] **Identificar Rota:** Localizar a rota de finalização de venda (`POST /api/sales`).
- [x] **Substituir Geração de PDF:** Remover a lógica de geração de PDF para cupons.
- [x] **Implementar Geração de TSPL:** Na rota, construir a string de comando TSPL para o cupom, incluindo `SIZE`, `GAP` e `CUT` para corrigir os problemas de hardware.
- [x] **Integrar Serviço de Impressão:** Chamar `sendCommandToPrinter` para enviar o comando TSPL diretamente para a impressora após a venda ser confirmada.

### 2.3 - Refatoração da Impressão de Etiquetas (Produtos)
- [x] **Criar Rota de Geração de Comando:** Implementar a rota `POST /api/products/generate-label` para gerar a string de comando TSPL da etiqueta, incluindo o parâmetro de `ROTATION` para corrigir a impressão transversal.
- [x] **Criar Rota de Envio de Comando:** Implementar a rota `POST /api/products/send-label-command` que recebe o comando TSPL e o número de cópias, e chama o serviço de impressão em loop.

---

## Fase 1: Refatoração do Fluxo de Impressão de Venda (Frontend - Legado)

*Esta fase foi substituída pela arquitetura de impressão no backend.*

### 1.1 - Limpeza da Configuração Antiga
- [x] **Remover do Frontend:** Em `Settings.tsx`, remover o card "Configurações de Impressão" e o estado `default_printer_type`.
- [ ] **Remover do Backend:** Embora não seja crítico, a chave `default_printer_type` se tornará obsoleta no banco de dados. (Ação manual opcional).

### 1.2 - Implementação do Modal de Impressão
- [x] **Criar Componente Modal:** Em `Sales.tsx`, criar um novo componente `PrintReceiptModal`.
- [x] **Adicionar Estado de Controle:** Criar um estado para controlar a visibilidade do modal.
- [x] **Implementar Layout do Modal:** Adicionar um título, um `RadioGroup` e os botões "Imprimir" e "Cancelar".
- [x] **Refatorar `onSuccess` da Venda:** Modificar a `saleMutation` para abrir o modal.
- [x] **Implementar Lógica de Impressão:** Adicionar a lógica que chama a função de geração de PDF.

### 1.3 - Ajuste Fino da Etiqueta de Joia
- [x] **Ajustar Dimensões:** Modificar a função `generateJewelryLabelPdf` para usar a área de impressão útil de 60mm x 12mm.
- [x] **Implementar Truncamento de Texto:** Adicionar lógica para truncar descrições de produtos.

---

## Histórico de Tarefas Concluídas

- **(Concluído)** Fase 2: Melhorias de Funcionalidade
- **(Legado)** Fase 1: Ajustes Finais Pós-Teste (Abordagem anterior, substituída)
- **(Legado)** Fase de Implementação de Impressão Especializada (Implementação inicial)
- **(Legado)** Fase de Correções Pós-Teste (Implementação inicial)
