const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Auth Endpoints', () => {

    // Cleanup users before tests
    beforeEach(async () => {
        await User.deleteMany({});
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                password: 'password123',
                name: 'Test User',
                role: 'technician'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('username', 'testuser');
    });

    it('should login an existing user', async () => {
        // Register first
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'loginuser',
                password: 'password123',
                name: 'Login User'
            });

        // Try login
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'loginuser',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'wronguser',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
    });
});
