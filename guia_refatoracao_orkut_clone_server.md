# Guia de Refatoração e Atualização: `orkut-clone-server` (2020 ➔ Atual)

Este guia apresenta o diagnóstico completo dos erros de `npm install` e vulnerabilidades do projeto [GledysonFerreira/orkut-clone-server](https://github.com/GledysonFerreira/orkut-clone-server) e entrega os arquivos refatorados para rodar sem conflitos de dependências (`ERESOLVE`) nas versões atuais do **Node.js (v18/v20/v22 LTS)**, **Apollo Server v4** e **GraphQL v16**.

## 1. Diagnóstico do Log do `npm install`

O log exibido no terminal do Windows (`D:\GIT\orkut-clone-server>npm install`) apresenta dois problemas centrais decorrentes de pacotes de 2020:

1. **Conflito de *Peer Dependencies* (`npm warn ERESOLVE overriding peer dependency`)**:
   * O [package.json original](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/package.json) declara `"apollo-server": "^2.15.1"` junto com `"graphql": "^15.2.0"`.
   * Internamente, o `apollo-server@2.15.1` depende de pacotes legados (`apollo-graphql@0.4.5`, `graphql-subscriptions@1.1.0`, `graphql-tag@2.10.3`, `graphql-upload@8.1.0` e `subscriptions-transport-ws@0.9.16`) que exigem `graphql@^14.0.0` como *peer dependency*.
   * O npm moderno detecta a incompatibilidade entre `graphql@15.2.0` (na raiz) e `graphql@^14` (exigido pelos subpacotes do Apollo v2) e emite os 5 blocos de aviso `ERESOLVE`.
2. **61 Vulnerabilidades de Segurança (sendo 37 altas e 7 críticas)**:
   * O `apollo-server` v2 foi oficialmente descontinuado (End-of-Life em outubro de 2023) e embutia versões antigas do `graphql-upload@8.1.0` e `apollo-engine-reporting`.
   * Pacotes como `axios@0.21.1`, `jsonwebtoken@8.5.1`, `sanitize-html@1.27.1`, `cloudinary@1.22.0` e `sequelize@6.3.0` acumulam CVEs críticas de execução remota, SSRF, ReDoS e bypass de validação de token.

## 2. Comparativo de Bibliotecas (2020 vs. Versões Atuais Recomendadas)

| Biblioteca | Versão de 2020 | Versão Atualizada | Motivo da Atualização e Impacto no Código |
| :--- | :--- | :--- | :--- |
| `apollo-server` | `^2.15.1` | Substituído por `@apollo/server` `^4.11.2` | Remove todos os avisos `ERESOLVE` e pacotes depreciados (`graphql-upload`, `subscriptions-transport-ws`, `apollo-engine-reporting`). |
| `graphql` | `^15.2.0` | `^16.9.0` | Versão estável exigida pelo `@apollo/server` v4 e `graphql-scalars` atual. |
| `graphql-tag` | Embutido no Apollo v2 | `^2.12.6` | No Apollo Server v4, o template literal `gql` é importado de `graphql-tag` em `typeDefs/index.js`. |
| `graphql-scalars` | `^1.2.1` | `^1.23.0` | Compatível com `graphql@16`; mantém os mesmos nomes (`DateResolver`, `DateTimeResolver`, `EmailAddressResolver`, `JSONResolver`). |
| `sequelize` | `^6.3.0` | `^6.37.5` | Corrige vulnerabilidades de injeção e melhora suporte ao PostgreSQL moderno. |
| `pg` / `pg-hstore` | `^8.2.1` / `^2.3.3` | `^8.13.1` / `^2.3.4` | Suporte completo a autenticação `scram-sha-256` (padrão no PostgreSQL 14+) e Node 20/22. |
| `bcrypt` | `^5.0.0` | `^5.1.1` | Fornece binários pré-compilados para Windows nas versões atuais do Node.js sem falhar no `node-gyp`. |
| `jsonwebtoken` | `^8.5.1` | `^9.0.2` | Corrige 4 CVEs de alta gravidade presentes na série 8.x. |
| `sanitize-html` | `^1.27.1` | `^2.13.1` | Corrige vulnerabilidades de XSS e ReDoS da série 1.x. |
| `cloudinary` | `^1.22.0` | `^2.5.1` | Remove dependências transitivas vulneráveis mantendo a API `require("cloudinary").v2`. |
| `axios` (dev) | `^0.21.1` | `^1.7.7` | Elimina vulnerabilidades críticas de SSRF/CSRF apontadas pelo `npm audit`. |
| `dotenv` / `nodemon` | `^8.2.0` / `^2.0.4` | `^16.4.5` / `^3.1.7` | Versões atuais estáveis para ambiente de desenvolvimento. |

## 3. Arquivos Refatorados

### 3.1. `package.json` (Substituir o conteúdo completo)

Substitua o conteúdo de `D:\GIT\orkut-clone-server\package.json` pelo código abaixo:

```json
{
  "name": "orkut",
  "version": "1.0.0",
  "description": "Orkut server clone built with Node, PostgreSQL, Apollo, GraphQL",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "cross-env NODE_ENV=development nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Gledyson Ferreira dos Santos",
  "license": "ISC",
  "dependencies": {
    "@apollo/server": "^4.11.2",
    "bcrypt": "^5.1.1",
    "cloudinary": "^2.5.1",
    "colors": "^1.4.0",
    "dotenv": "^16.4.5",
    "graphql": "^16.9.0",
    "graphql-scalars": "^1.23.0",
    "graphql-tag": "^2.12.6",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.1",
    "pg-hstore": "^2.3.4",
    "sanitize-html": "^2.13.1",
    "sequelize": "^6.37.5"
  },
  "devDependencies": {
    "axios": "^1.7.7",
    "cross-env": "^7.0.3",
    "nodemon": "^3.1.7"
  }
}
```

### 3.2. `index.js` (Migrado para `@apollo/server` v4)

No [index.js original](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/index.js), o `ApolloServer` era importado de `apollo-server`, usava a propriedade obsoleta `engine` e o método `server.listen()`. No Apollo Server v4, utiliza-se `startStandaloneServer` de `@apollo/server/standalone`:

```javascript
if (process.env.NODE_ENV !== "production") require("dotenv").config();
const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
require("colors");

const { sequelize } = require("./models");
const typeDefs = require("./typeDefs");
const resolvers = require("./resolvers");
const context = require("./context");
const clearOldUpdates = require("./utils/clearOldUpdates");

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("📦 Conexão com o PostgreSQL estabelecida com sucesso.".green);

    const { url } = await startStandaloneServer(server, {
      context,
      listen: { port: Number(process.env.PORT) || 4000 },
    });

    console.log(`🚀 Server ready at ${url}`.cyan);
    clearOldUpdates(1000 * 60 * 60 * 6);
  } catch (error) {
    console.error("❌ Erro ao iniciar o servidor:".red, error);
    process.exit(1);
  }
};

startServer();
```

### 3.3. Criar `utils/errors.js` (Camada de Compatibilidade para `UserInputError` e `ApolloError`)

No Apollo Server v4, as classes `UserInputError` e `ApolloError` foram substituídas pela classe padrão `GraphQLError` do pacote `graphql`. Como [resolvers/mutations.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/resolvers/mutations.js) e [resolvers/queries.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/resolvers/queries.js) possuem mais de 50 chamadas `throw new UserInputError(...)` e `throw new ApolloError(...)`, crie o arquivo `D:\GIT\orkut-clone-server\utils\errors.js` abaixo para manter 100% de compatibilidade com o frontend sem precisar reescrever cada `throw`:

```javascript
const { GraphQLError } = require("graphql");

class UserInputError extends GraphQLError {
  constructor(message, extensions = {}) {
    super(message, {
      extensions: {
        code: "BAD_USER_INPUT",
        ...extensions,
      },
    });
  }
}

class ApolloError extends GraphQLError {
  constructor(message, code = "INTERNAL_SERVER_ERROR", extensions = {}) {
    super(typeof message === "string" ? message : message.message || "Erro interno do servidor", {
      extensions: {
        code,
        ...extensions,
      },
    });
  }
}

module.exports = {
  UserInputError,
  ApolloError,
};
```

### 3.4. Atualizar importação em `typeDefs/index.js`, `resolvers/mutations.js` e `resolvers/queries.js`

Faça apenas a troca da linha de importação do `apollo-server` nesses 3 arquivos:

* **Em [typeDefs/index.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/typeDefs/index.js) (Linha 1)**:
  ```javascript
  // Antes:
  // const { gql } = require("apollo-server");

  // Depois:
  const gql = require("graphql-tag");
  ```

* **Em [resolvers/mutations.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/resolvers/mutations.js) (Linha 16)**:
  ```javascript
  // Antes:
  // const { UserInputError, ApolloError } = require("apollo-server");

  // Depois:
  const { UserInputError, ApolloError } = require("../utils/errors");
  ```

* **Em [resolvers/queries.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/resolvers/queries.js) (Linha 18)**:
  ```javascript
  // Antes:
  // const { UserInputError, ApolloError } = require("apollo-server");

  // Depois:
  const { UserInputError, ApolloError } = require("../utils/errors");
  ```

### 3.5. Correção de Bugs em `context/index.js` e `models/index.js`

Durante a análise do código original de 2020, foram identificados dois problemas adicionais que causam falhas em tempo de execução:

1. **Em [context/index.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/context/index.js)**:
   * O `jwt.verify` não estava dentro de um bloco `try/catch` (se o navegador enviar um token expirado, o servidor cai ou bloqueia até mesmo queries públicas).
   * Além disso, quando não há header `authorization`, a função deve retornar `{ currentUser: null }` (objeto válido para o Apollo Server v4).

Substitua o conteúdo de `D:\GIT\orkut-clone-server\context\index.js` por:

```javascript
const jwt = require("jsonwebtoken");
const {
  User,
  Community,
  Scrap,
  Photo,
  Testimonial,
  Update,
  Video,
} = require("../models");

module.exports = async ({ req }) => {
  const auth = req && req.headers ? req.headers.authorization : null;
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    try {
      const decodedToken = jwt.verify(
        auth.substring(7),
        process.env.TOKEN_SECRET
      );
      const currentUser = await User.findByPk(decodedToken.id, {
        attributes: { exclude: ["password"] },
        include: [
          {
            model: Scrap,
            as: "Scraps",
            attributes: ["id"],
            separate: true,
          },
          {
            model: User,
            as: "Friends",
            attributes: ["id", "name", "profile_picture"],
          },
          {
            model: Community,
            as: "Subscriptions",
            attributes: ["id", "title", "picture"],
          },
          {
            model: Photo,
            as: "Photos",
            attributes: ["id", "url", "description", "folderId"],
            separate: true,
          },
          {
            model: Video,
            as: "Videos",
            attributes: ["id", "url"],
            separate: true,
          },
          {
            model: User,
            as: "Requesters",
            attributes: ["id", "name", "profile_picture"],
          },
          {
            model: Testimonial,
            as: "Testimonials",
            attributes: ["id"],
            separate: true,
          },
          {
            model: Update,
            as: "Posts",
            attributes: ["id", "body"],
            separate: true,
          },
        ],
      });
      return { currentUser };
    } catch (err) {
      return { currentUser: null };
    }
  }
  return { currentUser: null };
};
```

2. **Em [models/index.js](https://github.com/GledysonFerreira/orkut-clone-server/blob/master/models/index.js) (Linhas 16–36)**:
   * No bloco `production`, a propriedade `logging: false` estava dentro de `dialectOptions` (onde é ignorada pelo Sequelize) em vez do objeto principal de configuração.
   * No bloco `development`, adicione um fallback `"postgres"` para `DB_DIALECT`:

```javascript
// DB Connection em models/index.js
let sequelize;
if (process.env.NODE_ENV === "production") {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: process.env.DB_DIALECT || "postgres",
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USERNAME,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || "localhost",
      dialect: process.env.DB_DIALECT || "postgres",
      logging: false,
    }
  );
}
```

## 4. Passo a Passo para Executar no Windows (`D:\GIT\orkut-clone-server`)

Após aplicar as alterações acima nos arquivos, execute os comandos abaixo no **Prompt de Comando (CMD)** ou **PowerShell** dentro de `D:\GIT\orkut-clone-server`:

```bat
:: 1. Remova a pasta node_modules e o package-lock.json antigos (de 2020)
rmdir /s /q node_modules
del package-lock.json

:: 2. Instale as novas dependências limpas
npm install

:: 3. Verifique se o arquivo .env existe na raiz com as variáveis do banco e JWT
:: Exemplo de .env:
:: DB_NAME=orkut
:: DB_USERNAME=postgres
:: DB_PASSWORD=sua_senha
:: DB_DIALECT=postgres
:: TOKEN_SECRET=segredo_jwt_super_seguro
:: C_CLOUD_NAME=seu_cloud_name
:: C_API_KEY=sua_api_key
:: C_API_SECRET=seu_api_secret

:: 4. Inicie o servidor em modo de desenvolvimento
npm run dev
```
