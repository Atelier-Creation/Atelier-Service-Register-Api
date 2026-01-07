const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Digital Service Register API',
            version: '1.0.0',
            description: 'API documentation for the Digital Service Register application',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server',
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
            schemas: {
                Job: {
                    type: 'object',
                    properties: {
                        jobId: { type: 'string' },
                        customerName: { type: 'string' },
                        phone: { type: 'string' },
                        deviceType: { type: 'string' },
                        brand: { type: 'string' },
                        model: { type: 'string' },
                        issue: { type: 'string' },
                        status: { type: 'string', enum: ['received', 'in-progress', 'waiting', 'ready', 'delivered', 'outsourced'] },
                        totalAmount: { type: 'number' },
                        advanceAmount: { type: 'number' },
                        outsourced: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                cost: { type: 'number' }
                            }
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        username: { type: 'string' },
                        name: { type: 'string' },
                        role: { type: 'string' }
                    }
                }
            }
        },
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
