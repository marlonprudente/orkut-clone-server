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
