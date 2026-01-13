import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Eat and Run',
      version: '1.0.0',
      description: 'Documentación de los endpoints del backend de Eat and Run.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local server',
      },
      {
        url: 'https://eatandrun-back-production.up.railway.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
