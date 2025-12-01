# Blueprint: Sistema de Gestão LENAMOM

## 1. Visão Geral e Objetivo do Projeto

O projeto LENAMOM é um sistema de gestão (ERP/PDV) especializado para um negócio de joias e perfumaria. O objetivo principal é fornecer uma ferramenta robusta para o gerenciamento de clientes (CRM), produtos, vendas e configurações da empresa, com foco em personalização e usabilidade. O sistema é uma evolução de um PDV genérico (`Loja_Artlicor_Upgrade1.0`).

## 2. Especificações Técnicas (Stack)

Esta seção define a stack tecnológica aprovada para o projeto. Nenhuma outra biblioteca ou tecnologia deve ser introduzida sem atualização prévia deste documento.

### 2.1. Frontend
- **Linguagem:** TypeScript
- **Framework Principal:** React 18+
- **Build Tool / Servidor de Desenvolvimento:** Vite
- **Roteamento:** `react-router-dom`
- **Componentes de UI:** `shadcn/ui`
- **Ícones:** `lucide-react`
- **Gerenciamento de Estado de Servidor:** `@tanstack/react-query`
- **Requisições HTTP:** `axios`
- **Geração de Documentos (Client-side):** `jspdf`, `jspdf-autotable` (para relatórios e pré-visualizações)
- **Geração de Código de Barras:** `jsbarcode`
- **Estilização:** Tailwind CSS

### 2.2. Backend
- **Ambiente de Execução:** Node.js
- **Framework Principal:** Express.js
- **Linguagem:** JavaScript
- **Banco de Dados:** MySQL
- **Comunicação com Impressora:** Socket TCP/IP (via módulo `net`)
- **Linguagem de Impressão:** TSPL (Tomate Scripting Programming Language)
- **Driver do Banco de Dados:** `mysql2`
- **Autenticação:** JWT (JSON Web Tokens) via `jsonwebtoken`
- **Hashing de Senhas:** `bcrypt`
- **Middleware Essencial:** `cors`, `dotenv`

## 3. Arquitetura da API

- **Estilo:** RESTful
- **Prefixo Base:** Todas as rotas da API são prefixadas com `/api`.
- **Porta Padrão:** `3002`
- **Endpoints Principais Identificados:**
  - `GET, PUT /api/settings`
  - `GET, POST, PUT, DELETE /api/customers`
  - `GET, POST, PUT, DELETE /api/products`
  - `POST /api/products/generate-label`
  - `POST /api/products/send-label-command`
  - `GET, POST /api/sales`
  - `GET /api/reports`
  - `GET, POST /api/users`
  - `POST /api/auth`

## 4. Estrutura do Banco de Dados (Esquema Conhecido)

- **`settings`**: Tabela no formato chave-valor para armazenar configurações globais (ex: `company_name`, `logo_url`, `instagram`, `printer_ip`, `printer_port`).
- **`customers`**: Armazena dados dos clientes.
- **`products`**: Armazena dados dos produtos.
- **`sales`**: Registra as transações de venda.
- **`users`**: Tabela para usuários do sistema.

## 5. Escopo de Funcionalidades Definidas

- **Módulo de Configurações:** Permite ao administrador do sistema alterar dinamicamente os dados da empresa e as **configurações de conexão da impressora térmica (IP/Porta)**.
- **Geração de Documentos PDF:** Sistema padronizado para criar PDFs (ex: relatórios de vendas) com cabeçalho e rodapé dinâmicos. A geração de documentos para impressão direta foi substituída.
- **Gestão de Clientes (CRM):** CRUD completo de clientes.
- **Gestão de Produtos:** CRUD de produtos com geração automática de código de barras.
- **Gestão de Vendas:** Interface para registrar novas vendas e calcular totais.
- **Arquitetura de Impressão Direta (Backend):**
    - **Comunicação via Socket:** O backend se comunica diretamente com a impressora térmica em sua rede local (via IP/Porta) para enviar comandos de impressão, eliminando a necessidade de drivers no cliente.
    - **Impressão de Cupom Não Fiscal:** Ao finalizar uma venda, o sistema gera comandos na linguagem TSPL e os envia diretamente para a impressora, garantindo a formatação correta e o corte do papel.
    - **Impressão de Etiquetas de Produto:** O sistema gera o comando TSPL para o layout da etiqueta, com a rotação correta, permitindo a impressão direta a partir do backend.

---
*Este documento é a Fonte da Verdade para todas as especificações técnicas e o escopo do projeto LENAMOM. Ele deve ser mantido atualizado.*
