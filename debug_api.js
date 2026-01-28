const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ipos?limit=1',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.ipos && json.ipos.length > 0) {
            console.log(JSON.stringify(json.ipos[0], null, 2));
        } else {
            console.log('No data');
        }
    });
});
req.end();
