<div align="center">
  <h1 align="center">Sistema de Gestão LENAMOM</h1>
  <p align="center">
    Uma solução completa de Ponto de Venda (PDV) e gestão de estoque, desenvolvida sob medida para o setor de joias e perfumaria.
  </p>
</div>

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-green.svg)

</div>

---

## 🎯 Sobre o Projeto

O **Sistema de Gestão LENAMOM** é uma aplicação web robusta que centraliza as operações de um negócio de varejo, oferecendo ferramentas intuitivas para o gerenciamento de clientes (CRM), produtos, estoque e vendas. O projeto se destaca por sua arquitetura de impressão híbrida, que resolve problemas crônicos de compatibilidade de hardware ao comunicar-se diretamente com impressoras térmicas via WebUSB.

---

## ✨ Funcionalidades Principais

-   **Gestão Completa:** CRUDs para Clientes, Fornecedores, Produtos e Formas de Pagamento.
-   **Módulo de Vendas (PDV):**
    -   Interface rápida para adicionar produtos ao carrinho.
    -   Busca inteligente de produtos por código ou descrição.
    -   Cálculo de totais, frete, troco e finalização de compra.
-   **Módulo de Estoque:**
    -   Entrada e Saída manual de produtos.
    -   Busca de produtos otimizada para o contexto de estoque (incluindo itens zerados).
    -   Histórico detalhado de todas as movimentações.
-   **Relatórios Gerenciais:**
    -   **Balanço de Estoque:** Relatório detalhado com valores de custo, potencial de venda e **filtro por fornecedor**.
    -   **Vendas por Período:** Histórico de vendas com totalizadores.
    -   **Vendas por Produto:** Ranking de produtos mais vendidos.
-   **Arquitetura de Impressão Híbrida:**
    -   **Geração de Layout no Backend (TSPL):** O servidor gera o comando de impressão na linguagem nativa da impressora, garantindo layouts precisos para cupons e etiquetas.
    -   **Impressão Direta via WebUSB:** O frontend envia os comandos diretamente para a impressora USB, eliminando a necessidade de drivers complexos.
-   **Geração de Documentos:**
    -   **Recibo de Venda (A4):** Geração de um PDF profissional e modernizado para recibos de venda.
    -   **Etiquetas de Produto:** Impressão de etiquetas com código de barras e preço.
-   **Segurança:** Autenticação baseada em JWT com perfis de usuário (Admin, Vendedor).

---

## 🛠️ Stack Tecnológica

| Categoria        | Tecnologia                                                               |
| :--------------- | :----------------------------------------------------------------------- |
| **Frontend**     | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Axios  |
| **Backend**      | Node.js, Express.js, JavaScript                                          |
| **Banco de Dados** | MySQL                                                                    |
| **Impressão**    | **TSPL** (linguagem de layout), **WebUSB** (comunicação com hardware)      |
| **Autenticação** | JWT (JSON Web Tokens), bcrypt                                            |

---

## 🚀 Começando

Siga os passos abaixo para configurar e executar o projeto em seu ambiente local.

### Pré-requisitos

-   **Node.js:** Versão 18.x ou superior.
-   **MySQL:** Uma instância do banco de dados em execução.
-   **Impressora Térmica (Opcional):** Se desejar testar a impressão, siga as instruções no arquivo `INSTRUCOES_IMPRESSORA.md`.

### Instalação

1.  **Clone o repositório:**
    ```sh
    git clone https://github.com/seu-usuario/lenamom_v2.git
    cd lenamom_v2
    ```

2.  **Instale as dependências do Frontend e Backend:**
    ```sh
    npm install
    npm install --prefix server
    ```

3.  **Configure as Variáveis de Ambiente:**
    -   Crie o arquivo `.env` na raiz do projeto e adicione:
        ```
        VITE_API_BASE_URL=http://localhost:3002
        ```
    -   Crie o arquivo `.env` dentro da pasta `/server` e adicione as credenciais do seu banco de dados e um segredo JWT:
        ```
        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=sua_senha
        DB_NAME=lenamom_v2
        JWT_SECRET=seu_segredo_super_secreto
        ```

4.  **Execute o projeto (requer 2 terminais):**
    -   **Terminal 1 (Backend):**
        ```sh
        npm run dev --prefix server
        ```
    -   **Terminal 2 (Frontend):**
        ```sh
        npm run dev
        ```

5.  Acesse `http://localhost:5173` em seu navegador.

---

## 📂 Estrutura do Projeto

```
/
├── dist/                # Build de produção do frontend
├── server/              # Código-fonte do backend (Node.js/Express)
│   ├── routes/          # Definição das rotas da API
│   ├── middleware/      # Middlewares de autenticação, etc.
│   ├── services/        # Lógicas de serviço (ex: auditoria)
│   └── index.js         # Ponto de entrada do servidor
├── src/                 # Código-fonte do frontend (React/Vite)
│   ├── components/      # Componentes reutilizáveis (UI)
│   ├── contexts/        # Contextos do React (ex: Auth)
│   ├── lib/             # Funções utilitárias (API, PDF, etc.)
│   ├── pages/           # Componentes de página (rotas)
│   └── App.tsx          # Componente principal do frontend
├── .env                 # Variáveis de ambiente do frontend
├── Check_list.md        # Roteiro de produção
├── Blueprint.md         # Especificações técnicas
└── README.md            # Este arquivo
```

---

## 📜 Scripts Essenciais

| Comando                      | Descrição                                            |
| :--------------------------- | :--------------------------------------------------- |
| `npm run dev`                | Inicia o servidor de desenvolvimento do frontend.    |
| `npm run build`              | Gera o build de produção do frontend na pasta `dist`.|
| `npm run dev --prefix server`| Inicia o servidor de desenvolvimento do backend com `nodemon`.|

---

<div align="center">
  Desenvolvido por <strong>Aksurim Software</strong>
</div>
