import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Nexa AI API",
      version: "1.0.0",
      description: "API documentation for the Nexa AI platform",
    },

    servers: [
      {
        url: "http://localhost:4000/api/v1",
        description: "Local development server",
      },
    ],
  },

  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
