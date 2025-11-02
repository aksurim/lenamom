# Sistema de Gestão LENAMOM

## Visão Geral

O **Sistema de Gestão LENAMOM** é uma aplicação web completa para Ponto de Venda (PDV) e gestão de estoque, adaptada especificamente para o modelo de negócio de joias e perfumaria. O sistema é uma evolução direta do projeto base `Loja_Artlicor_Upgrade1.0`, refatorado e aprimorado para oferecer maior flexibilidade, personalização e funcionalidades focadas em negócios online e de venda direta.

---

## Funcionalidades Principais

Além de todas as funcionalidades do sistema base (PDV, controle de caixa, gestão de estoque, CRUDs), o sistema LENAMOM introduz as seguintes melhorias e novidades:

*   **Gestão de Clientes Aprimorada:**
    *   **Data de Nascimento:** Cadastro da data de nascimento para ações de marketing e relacionamento.
    *   **Histórico e Perfil de Compra:** Acesso rápido ao histórico completo de pedidos de um cliente e a um perfil de compra simplificado (produtos mais comprados, frequência), diretamente na tela de clientes.

*   **Gestão de Produtos Avançada:**
    *   **Geração Automática de Código de Barras:** Ao cadastrar um novo produto, o sistema gera e armazena automaticamente um código padrão EAN-13, pronto para uso em etiquetas.
    *   **Simulador de Impressão de Etiqueta:** Função de mock que simula a impressão de uma etiqueta de produto (padrão Tomate MDK-006), exibindo o código de barras e a descrição, facilitando a preparação para impressão física.

*   **Flexibilidade nas Vendas:**
    *   **Campo de Frete:** Adição de um campo de frete no fechamento do pedido, com o valor sendo somado ao total e detalhado nos documentos.

*   **Configuração Dinâmica da Empresa:**
    *   **Módulo de Configurações Centralizado:** Todas as informações da empresa (Nome, Instagram, Contato, Logo) são agora gerenciadas dinamicamente através do menu **Configurações > Geral**. Não é mais necessário alterar arquivos de código para personalizar o sistema.

*   **Design Profissional de Documentos:**
    *   **Templates de PDF Padronizados:** Todos os documentos gerados em PDF (Pedidos de Venda, Relatórios) seguem um padrão visual profissional em preto e branco.
    *   **Cabeçalho e Rodapé Dinâmicos:** Os PDFs utilizam as informações salvas nas configurações para gerar um cabeçalho personalizado com o logo e os dados da empresa, e incluem um rodapé padronizado com informações de desenvolvimento e paginação.

## Tecnologias Utilizadas

| Categoria      | Tecnologia                                      |
| :------------- | :---------------------------------------------- |
| **Frontend**   | React, Vite, TypeScript, Tailwind CSS, shadcn/ui  |
| **Backend**    | Node.js, Express                                |
| **Banco de Dados** | MySQL                                           |
| **Autenticação** | JWT, bcrypt                                     |
| **Hospedagem**   | DirectAdmin (ou similar com suporte a Node.js)    |

---

## Estrutura de Deploy

A arquitetura do projeto base foi mantida, permitindo o deploy de múltiplas instâncias independentes a partir do mesmo código-fonte. A implantação é dividida em **Backend (App Node.js)** e **Frontend (Site Estático)**.

### Parte 1: Deploy do Backend (App Node.js)

1.  **Preparação:** Envie o código-fonte do projeto (exceto `node_modules` e `.env`) para uma pasta não pública no servidor (ex: `/home/user/lenamom_app`).
2.  **Instalação:** Execute `npm install` na raiz do projeto e também no diretório `/server`.
3.  **Configuração (`.env` na pasta `/server`):** Defina as variáveis de ambiente para a conexão com o banco de dados e o segredo JWT.

### Parte 2: Deploy do Frontend (Site Estático)

1.  **Build Local:** Antes de enviar, gere a versão de produção do frontend. No seu computador, edite o arquivo `.env` na **raiz do projeto** e aponte a `VITE_API_BASE_URL` para o domínio do backend.
2.  **Execução do Build:** Rode o comando `npm run build`.
3.  **Upload:** Envie o **conteúdo** da pasta `dist` gerada para a pasta pública do seu domínio/subdomínio (ex: `/domains/lenamom.com/public_html`).

---

## Desenvolvimento Local

Para executar o projeto localmente, siga os passos:

1.  **Dependências:**
    *   `npm install` (na raiz do projeto)
    *   `npm install --prefix server` (para as dependências do backend)

2.  **Variáveis de Ambiente:**
    *   Crie um arquivo `.env` na **raiz** e defina `VITE_API_BASE_URL=http://localhost:3002`.
    *   Crie um arquivo `.env` na pasta `/server` com as credenciais do seu banco de dados local.

3.  **Execução (2 terminais):**
    *   **Backend:** `npm run dev --prefix server`
    *   **Frontend:** `npm run dev`

## Desenvolvido por

**Aksurim Software**
