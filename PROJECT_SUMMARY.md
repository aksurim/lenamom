# Resumo do Projeto: Sistema de Gestão LENAMOM

Este documento detalha as principais evoluções técnicas e de arquitetura implementadas no sistema LENAMOM, partindo do código-base `Loja_Artlicor_Upgrade1.0`.

## 1. Visão Geral da Refatoração

O objetivo principal foi adaptar um sistema de PDV genérico para as necessidades específicas de um negócio de joias e perfumaria, com foco em vendas online e gestão de relacionamento com o cliente. As mudanças visaram aumentar a flexibilidade, a personalização e a usabilidade do sistema.

## 2. Principais Alterações de Arquitetura e Funcionalidades

### 2.1. Módulo de Configurações Dinâmicas

A mudança mais impactante foi a eliminação de configurações estáticas em arquivos (`company-settings.json`).

*   **Arquitetura Anterior:** Dados da empresa (nome, logo, etc.) eram armazenados em um arquivo JSON no backend, exigindo intervenção no código para qualquer alteração.
*   **Nova Arquitetura:**
    *   **Backend:** A tabela `settings` (chave-valor) existente no MySQL foi aproveitada. As rotas `GET /api/settings` e `PUT /api/settings` foram mantidas, pois seu design flexível já suportava a adição de novas chaves sem alterações no código.
    *   **Frontend:** A página de **Configurações** (`src/pages/Settings.tsx`) foi expandida com uma nova seção "Dados da Empresa para Documentos". Os novos campos (`company_name`, `instagram`, `contact`, `logo_url`) são salvos diretamente no banco de dados através da rota `PUT /api/settings`.
    *   **Impacto:** O sistema tornou-se 100% personalizável pelo usuário administrador, sem necessidade de deploy ou alteração de código para mudar informações vitais da empresa.

### 2.2. Refatoração da Geração de Documentos (PDF)

O sistema de geração de PDFs foi centralizado e padronizado.

*   **Arquitetura Anterior:** Múltiplos componentes chamavam uma função genérica `generatePdf` que possuía lógica de layout dispersa.
*   **Nova Arquitetura:**
    *   **`src/lib/pdfUtils.ts`:** A função foi reescrita como `generateStandardPdf`. Esta nova função é agora responsável por toda a estrutura do documento (cabeçalho e rodapé).
    *   **Busca de Dados Dinâmica:** `generateStandardPdf` agora busca as informações da empresa (logo, nome, instagram) diretamente da rota `/api/settings` antes de desenhar o PDF.
    *   **Layout Padronizado:** O cabeçalho é gerado com os dados da empresa e o rodapé com informações fixas da Aksurim Software e paginação. O conteúdo específico de cada documento (tabelas, resumos) é injetado pela função que o chama (`drawContent`).
    *   **Impacto:** Garantiu uma identidade visual consistente em todos os documentos e simplificou a criação de novos relatórios no futuro.

### 2.3. Expansão dos Modelos e Rotas

*   **Clientes (`customers`):
    *   **Banco de Dados:** Adicionada a coluna `birth_date` (DATE) à tabela `customers`.
    *   **Backend:** A rota `PUT /api/customers/:id` foi corrigida para tratar corretamente a formatação de data (`YYYY-MM-DD`) e valores nulos, resolvendo um bug crítico de atualização. A rota `DELETE` foi aprimorada para impedir a exclusão de clientes com histórico de vendas.
    *   **Novas Rotas:** Foram criados os endpoints `GET /api/customers/:id/purchase-history` e `GET /api/customers/:id/purchase-profile` para alimentar a nova funcionalidade de perfil do cliente.

*   **Produtos (`products`):
    *   **Banco de Dados:** Adicionada a coluna `barcode` (VARCHAR(13)) à tabela `products`.
    *   **Backend:** A rota `POST /api/products` agora gera um código EAN-13 único para cada novo produto, usando o ID do produto como base, e o salva no banco.

*   **Vendas (`sales`):
    *   **Banco de Dados:** Adicionada a coluna `shipping_cost` (DECIMAL) à tabela `sales`.
    *   **Backend:** A rota `POST /api/sales` foi atualizada para receber e salvar o `shipping_cost`.

### 2.4. Melhorias na Interface do Usuário (Frontend)

*   **Página de Clientes:**
    *   Adicionado um botão de "Histórico" que abre um modal com duas abas: uma para o histórico detalhado de compras e outra para o perfil de compra (produtos mais comprados e frequência).
    *   Corrigido bug crítico que impedia a alteração de clientes.

*   **Página de Vendas:**
    *   Adicionado campo de "Frete" no resumo do pedido.
    *   Corrigido bug de usabilidade no input de frete, aplicando a mesma lógica de formatação dos campos de preço.
    *   O layout do PDF do pedido foi completamente refeito para seguir o padrão profissional P&B, incluindo dados do cliente (com telefone), resumo financeiro detalhado (com frete, valor pago e troco) e tabela de itens.

*   **Página de Produtos:**
    *   Adicionado botão de "Imprimir Etiqueta" que aciona a função mock `print_label_mdk006`, simulando a impressão de uma etiqueta com código de barras e descrição.

## 3. Conclusão Técnica

O projeto LENAMOM representa uma maturação significativa do sistema base. A transição de configurações estáticas para um modelo dinâmico via banco de dados e a padronização da geração de documentos são as melhorias de arquitetura mais relevantes, garantindo escalabilidade e facilidade de manutenção para o futuro.

---
*Este documento reflete o estado atual do projeto. Para o histórico de implementações, consulte os commits no repositório Git.*
