# Sistema de Gestão LENAMOM

## Visão Geral

O **Sistema de Gestão LENAMOM** é uma aplicação web completa para Ponto de Venda (PDV) e gestão de estoque, adaptada especificamente para o modelo de negócio de joias e perfumaria. O sistema é uma evolução direta do projeto base `Loja_Artlicor_Upgrade1.0`, refatorado e aprimorado para oferecer maior flexibilidade, personalização e funcionalidades focadas em negócios online e de venda direta.

---

## Funcionalidades Principais

*   **Gestão de Clientes Aprimorada:**
    *   Cadastro de data de nascimento, histórico e perfil de compra.

*   **Gestão de Produtos Avançada:**
    *   Geração automática de código de barras EAN-13 no cadastro de produtos.

*   **Impressão Térmica Direta (Backend):**
    *   **Arquitetura Robusta:** O sistema envia comandos de impressão (linguagem TSPL) diretamente do servidor Node.js para a impressora térmica (ex: Tomate MDK-006) via Socket TCP/IP.
    *   **Independência de Driver:** Esta abordagem elimina a necessidade de drivers de impressão no computador do cliente, resolvendo problemas de compatibilidade, formatação e rotação.
    *   **Impressão de Cupom de Venda:** Ao finalizar uma venda, o cupom não fiscal é impresso automaticamente, com formatação e corte de papel precisos.
    *   **Impressão de Etiquetas:** Geração de etiquetas de produto com layout e rotação corretos, prontas para serem enviadas para a impressora.

*   **Flexibilidade nas Vendas:**
    *   Adição de campo de frete no fechamento do pedido.

*   **Configuração Dinâmica da Empresa:**
    *   Módulo de configurações para gerenciar dados da empresa e, crucialmente, as **configurações de rede da impressora (IP e Porta)**.

*   **Geração de Relatórios em PDF:**
    *   O sistema mantém a capacidade de gerar relatórios complexos e documentos para visualização em formato PDF.

## Tecnologias Utilizadas

| Categoria      | Tecnologia                                      |
| :------------- | :---------------------------------------------- |
| **Frontend**   | React, Vite, TypeScript, Tailwind CSS, shadcn/ui  |
| **Backend**    | Node.js, Express, TSPL                            |
| **Banco de Dados** | MySQL                                           |
| **Comunicação**  | REST API, Socket TCP/IP                         |
| **Autenticação** | JWT, bcrypt                                     |

---

## Estrutura de Deploy

A implantação é dividida em **Backend (App Node.js)** e **Frontend (Site Estático)**.

### Parte 1: Deploy do Backend (App Node.js)

1.  **Preparação:** Envie o código-fonte do projeto (exceto `node_modules` e `.env`) para uma pasta não pública no servidor.
2.  **Instalação:** Execute `npm install` na raiz do projeto e também no diretório `/server`.
3.  **Configuração (`.env` na pasta `/server`):** Defina as variáveis de ambiente para a conexão com o banco de dados, o segredo JWT e as **configurações da impressora**.

### Parte 2: Deploy do Frontend (Site Estático)

1.  **Build Local:** Edite o arquivo `.env` na raiz do projeto e aponte a `VITE_API_BASE_URL` para o domínio do backend.
2.  **Execução do Build:** Rode o comando `npm run build`.
3.  **Upload:** Envie o **conteúdo** da pasta `dist` gerada para a pasta pública do seu domínio.

---

## Desenvolvimento Local

1.  **Dependências:**
    *   `npm install` (na raiz)
    *   `npm install --prefix server` (no backend)

2.  **Variáveis de Ambiente:**
    *   **Raiz do Projeto (`.env`):**
        *   `VITE_API_BASE_URL=http://localhost:3002`
    *   **Backend (`/server/.env`):**
        *   Credenciais do banco de dados (DB_HOST, DB_USER, etc.).
        *   `JWT_SECRET=seu_segredo_jwt`
        *   `PRINTER_IP=192.168.1.100` (IP da sua impressora térmica)
        *   `PRINTER_PORT=9100` (Porta padrão, geralmente 9100)

3.  **Execução (2 terminais):**
    *   **Backend:** `npm run dev --prefix server`
    *   **Frontend:** `npm run dev`

## Desenvolvido por

**Aksurim Software**
