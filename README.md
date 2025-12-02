# Sistema de Gestão LENAMOM

## Visão Geral

O **Sistema de Gestão LENAMOM** é uma aplicação web completa para Ponto de Venda (PDV) e gestão de estoque, adaptada especificamente para o modelo de negócio de joias e perfumaria.

---

## Funcionalidades Principais

*   **Gestão de Clientes, Produtos e Vendas:** CRUDs completos para a operação do negócio.
*   **Geração de Código de Barras:** O sistema gera um código interno (`LENXXXX`) e um código EAN-13 para cada produto, garantindo compatibilidade interna e externa.
*   **Arquitetura de Impressão Híbrida (TSPL + WebUSB):**
    *   **Backend Inteligente:** O servidor Node.js é responsável por gerar os layouts de impressão na linguagem nativa da impressora (TSPL), garantindo formatação, posicionamento e sanitização de texto para máxima compatibilidade.
    *   **Frontend com Acesso Direto:** O sistema utiliza a API WebUSB do navegador para se comunicar diretamente com a impressora térmica conectada via USB, eliminando a necessidade de drivers de impressão e resolvendo problemas de compatibilidade.
    *   **Impressão Robusta:** A impressão de cupons e etiquetas é feita de forma precisa e confiável.
*   **Geração de Relatórios em PDF:** O sistema mantém a capacidade de gerar relatórios complexos para visualização em tela ou impressão convencional.

## Tecnologias Utilizadas

| Categoria      | Tecnologia                                      |
| :------------- | :---------------------------------------------- |
| **Frontend**   | React, Vite, TypeScript, WebUSB, Tailwind CSS     |
| **Backend**    | Node.js, Express, TSPL (Geração de Layout)        |
| **Banco de Dados** | MySQL                                           |
| **Comunicação**  | REST API                                        |
| **Autenticação** | JWT, bcrypt                                     |

---

## Estrutura de Deploy

### Requisitos Críticos

*   **HTTPS para o Frontend:** A API WebUSB, por motivos de segurança, **só funciona se o site do frontend for servido via HTTPS**. O seu provedor de hospedagem deve ter um certificado SSL (ex: Let's Encrypt) instalado para o domínio.
*   **Configuração do Cliente:** Cada computador que for imprimir precisará de uma configuração única, descrita no arquivo `INSTRUCOES_IMPRESSORA.md`.

### Passos do Deploy

1.  **Backend (App Node.js):**
    *   Envie o código da pasta `/server` para seu servidor.
    *   Execute `npm install`.
    *   Configure o arquivo `.env` com as credenciais do banco de dados e o segredo JWT.

2.  **Frontend (Site Estático):**
    *   Edite o arquivo `.env` na raiz do projeto e aponte a `VITE_API_BASE_URL` para o domínio do seu backend.
    *   Execute o comando `npm run build`.
    *   Envie o **conteúdo** da pasta `dist` gerada para a pasta pública do seu domínio (que deve estar configurado com HTTPS).

---

## Desenvolvimento Local

1.  **Dependências:**
    *   `npm install` (na raiz)
    *   `npm install --prefix server` (no backend)

2.  **Configuração da Impressora (Obrigatório):**
    *   Siga as instruções do arquivo `INSTRUCOES_IMPRESSORA.md` para configurar o driver da sua impressora USB com o Zadig. Este passo é essencial para que o navegador possa se comunicar com ela.

3.  **Variáveis de Ambiente:**
    *   **Raiz do Projeto (`.env`):**
        *   `VITE_API_BASE_URL=http://localhost:3002`
    *   **Backend (`/server/.env`):**
        *   Credenciais do banco de dados (DB_HOST, DB_USER, etc.).
        *   `JWT_SECRET=seu_segredo_jwt`

4.  **Execução (2 terminais):**
    *   **Backend:** `npm run dev --prefix server`
    *   **Frontend:** `npm run dev`
    *   **Nota Importante:** O servidor de backend (`nodemon`) não recarrega automaticamente quando as dependências ou arquivos fora da sua árvore de execução são modificados. Após fazer alterações significativas no backend (como `npm install` no servidor ou modificar arquivos de rota), é uma boa prática reiniciar manualmente o servidor (`Ctrl + C` e `npm run dev --prefix server`) para garantir que todas as mudanças sejam aplicadas.

## Desenvolvido por

**Aksurim Software**
