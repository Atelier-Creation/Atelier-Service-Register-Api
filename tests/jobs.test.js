const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Job = require('../src/models/Job');

let token;

describe('Job Endpoints', () => {

    beforeAll(async () => {
        await User.deleteMany({});
        await Job.deleteMany({});

        // Create a user and get token
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'jobtester',
                password: 'password123',
                name: 'Job Tester',
                role: 'admin'
            });
        token = res.body.token;
    });

    it('should create a new job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customerName: 'John Doe',
                phone: '1234567890',
                deviceType: 'Mobile',
                brand: 'Apple',
                model: 'iPhone 13',
                issue: 'Screen Broken',
                estimatedDelivery: '2025-01-10',
                totalAmount: 5000
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('jobId');
        expect(res.body.customerName).toEqual('John Doe');
    });

    it('should get all jobs', async () => {
        const res = await request(app)
            .get('/api/jobs')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body.length).toBeGreaterThan(0);
    });
});
