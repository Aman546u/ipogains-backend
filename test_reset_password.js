const http = require('http');

const data = JSON.stringify({
    email: 'aman546u@gmail.com',
    otp: '172733',
    newPassword: 'NewSecurePassword123!'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/reset-password',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
