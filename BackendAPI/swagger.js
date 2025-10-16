const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Network Device Inventory Backend API',
      version: '1.0.0',
      description:
        'RESTful API for managing network devices, supporting CRUD operations, device status checks, and API documentation.',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local development server' },
      { url: '/api', description: 'Relative base path' },
    ],
    tags: [
      { name: 'Devices', description: 'Operations related to network devices' },
      { name: 'Ping', description: 'Device status check operations' },
      { name: 'Health', description: 'Service health checks' },
    ],
    components: {
      schemas: {
        Device: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            ip_address: { type: 'string', format: 'ipv4' },
            mac_address: { type: 'string' },
            device_type: { type: 'string' },
            location: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'unknown'] },
            last_ping: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'name',
            'ip_address',
            'mac_address',
            'device_type',
            'location',
            'status',
            'last_ping',
          ],
        },
        DeviceCreate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            ip_address: { type: 'string', format: 'ipv4' },
            mac_address: { type: 'string' },
            device_type: { type: 'string' },
            location: { type: 'string' },
          },
          required: ['name', 'ip_address', 'mac_address', 'device_type', 'location'],
        },
        DeviceUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            ip_address: { type: 'string', format: 'ipv4' },
            mac_address: { type: 'string' },
            device_type: { type: 'string' },
            location: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'unknown'] },
            last_ping: { type: 'string', format: 'date-time' },
          },
        },
        DeviceStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['online', 'offline', 'unknown'] },
            last_ping: { type: 'string', format: 'date-time' },
          },
          required: ['status', 'last_ping'],
        },
        Error: {
          type: 'object',
          properties: {
            error_code: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'string' },
          },
          required: ['error_code', 'message'],
        },
      },
      responses: {
        BadRequest: {
          description: 'Invalid request parameters or payload.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        UnprocessableEntity: {
          description: 'Validation failed for input data.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Resource not found.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        InternalError: {
          description: 'Internal server error.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
      securitySchemes: {},
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
