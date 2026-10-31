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
