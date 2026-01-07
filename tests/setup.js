const mongoose = require('mongoose');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    await mongoose.connection.close();
});

afterEach(async () => {
    // optional: cleanup data
    // await User.deleteMany(); 
});
