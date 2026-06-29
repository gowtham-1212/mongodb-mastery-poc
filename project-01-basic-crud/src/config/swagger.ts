import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Project 01 Basic CRUD API',
    version: '1.0.0',
    description:
      'Express.js API demonstrating MongoDB comparison, logical, element, array, and update operators.',
  },
  servers: [
    {
      url: process.env.SWAGGER_SERVER_URL || 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Comparison', description: 'Comparison operator endpoints' },
    { name: 'Logical', description: 'Logical operator endpoints' },
    { name: 'Element', description: 'Element operator endpoints' },
    { name: 'Array', description: 'Array operator endpoints' },
    { name: 'Update', description: 'Update operator endpoints' },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'integer' },
          isActive: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          preferences: {
            type: 'object',
            properties: {
              newsletter: { type: 'boolean' },
              notifications: { type: 'boolean' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          sku: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'integer' },
          category: { type: 'string' },
          isActive: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: {
            type: 'object',
            properties: {
              weight: { type: 'number' },
              dimensions: {
                type: 'object',
                properties: {
                  length: { type: 'number' },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
            },
          },
          reviews: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                rating: { type: 'integer' },
                comment: { type: 'string' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      QueryResponseArray: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { type: 'object' } },
          count: { type: 'integer' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      QueryResponseObject: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          statusCode: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      SetPreferencesBody: {
        type: 'object',
        required: ['newsletter', 'notifications'],
        properties: {
          newsletter: { type: 'boolean' },
          notifications: { type: 'boolean' },
        },
      },
      AddReviewBody: {
        type: 'object',
        required: ['userId', 'rating', 'comment'],
        properties: {
          userId: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
        },
      },
      ArrayTagsBody: {
        type: 'object',
        required: ['tags'],
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;