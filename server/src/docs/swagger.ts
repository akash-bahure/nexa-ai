import swaggerJsdoc from "swagger-jsdoc";

const isProduction = process.env.NODE_ENV === "production";

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
        url: isProduction
          ? "https://nexa-ai-backend-dmo5.onrender.com/api/v1"
          : "http://localhost:4000/api/v1",
        description: isProduction ? "Production server" : "Development server",
      },
    ],
  },

  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
