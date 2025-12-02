# Blueprint: Sistema de Gestão LENAMOM

## 1. Visão Geral e Objetivo do Projeto

O projeto LENAMOM é um sistema de gestão (ERP/PDV) especializado para um negócio de joias e perfumaria. O objetivo principal é fornecer uma ferramenta robusta para o gerenciamento de clientes (CRM), produtos, vendas e configurações da empresa, com foco em personalização e usabilidade.

## 2. Especificações Técnicas (Stack)

Esta seção define a stack tecnológica aprovada para o projeto.

### 2.1. Frontend
- **Linguagem:** TypeScript
- **Framework Principal:** React 18+
- **Build Tool:** Vite
- **Comunicação com Hardware:** **API WebUSB** (para impressoras térmicas)
- **Componentes de UI:** `shadcn/ui`
- **Gerenciamento de Estado de Servidor:** `@tanstack/react-query`
- **Requisições HTTP:** `axios`
- **Geração de Documentos (Client-side):** `jspdf`, `jspdf-autotable` (para relatórios)

### 2.2. Backend
- **Ambiente de Execução:** Node.js
- **Framework Principal:** Express.js
- **Linguagem:** JavaScript
- **Banco de Dados:** MySQL
- **Linguagem de Impressão (Geração de Layout):** **TSPL** (Tomate Scripting Programming Language)
- **Driver do Banco de Dados:** `mysql2`
- **Autenticação:** JWT (JSON Web Tokens) via `jsonwebtoken`

## 3. Arquitetura da API

- **Estilo:** RESTful
- **Prefixo Base:** `/api`
- **Endpoints Principais Identificados:**
  - `/api/settings`
  - `/api/customers`
  - `/api/products`
  - `/api/products/generate-label` (Gera o comando TSPL para a etiqueta)
  - `/api/sales`
  - `/api/sales/generate-receipt-command` (Gera o comando TSPL para o cupom)
  - `/api/reports`
  - `/api/users`
  - `/api/auth`

## 4. Estrutura do Banco de Dados (Esquema Conhecido)

- **`settings`**: Tabela no formato chave-valor para armazenar configurações globais da aplicação.
- **`customers`**: Armazena dados dos clientes.
- **`products`**: Armazena dados dos produtos, incluindo `code` (código interno) e `barcode` (EAN-13).
- **`sales`**: Registra as transações de venda.
- **`users`**: Tabela para usuários do sistema.

## 5. Escopo de Funcionalidades Definidas

- **Módulo de Configurações:** Permite ao administrador do sistema alterar dinamicamente os dados da empresa.
- **Geração de Documentos PDF:** Sistema padronizado para criar relatórios e outros documentos não-impressos.
- **Arquitetura de Impressão Híbrida (TSPL + WebUSB):**
    - **Backend como Gerador de Layout:** O backend é a "fonte da verdade" para os layouts de impressão. Ele possui rotas que geram a string de comando na linguagem nativa da impressora (TSPL).
    - **Sanitização de Texto:** Para garantir a compatibilidade com uma vasta gama de hardwares de impressão térmica, o backend realiza uma **sanitização** de todo o texto, removendo acentos e caracteres especiais antes de montar o comando TSPL. Isso assegura a impressão legível em qualquer cenário.
    - **Frontend como Executor de Impressão:** O frontend busca a string de comando TSPL do backend e, utilizando a API WebUSB, envia esses dados diretamente para a impressora conectada via USB.
    - **Independência de Driver:** Esta abordagem elimina a necessidade de drivers de impressão complexos, exigindo apenas uma configuração única no cliente (via Zadig) para permitir a comunicação direta do navegador com o hardware.
    - **Impressão de Cupom e Etiquetas:** O sistema imprime cupons de venda e etiquetas de produto com layout preciso.
    - **Refinamento de Layout (Lições Aprendidas):**
        - **Comandos Primitivos:** Para contornar inconsistências de firmware em impressoras, o layout evita comandos complexos como `BAR` (linhas). Em vez disso, linhas divisórias são criadas com caracteres de texto (ex: `========`), garantindo consistência visual.
        - **Controle de Fonte:** Foi adotada uma fonte global de tamanho médio (`"2"`) para melhorar a legibilidade, com espaçamento vertical ajustado para manter a clareza.
        - **Alinhamento Robusto:** O alinhamento à direita é usado para valores numéricos, enquanto textos longos são mantidos à esquerda para evitar cortes, garantindo um layout limpo e profissional.

---
*Este documento é a Fonte da Verdade para todas as especificações técnicas e o escopo do projeto LENAMOM. Ele deve ser mantido atualizado.*
