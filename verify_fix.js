const http = require('http');

http.get('http://localhost:3000/api/ipos?limit=1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.ipos && json.ipos.length > 0) {
                const ipo = json.ipos[0];
                console.log('--- DB CHECK ---');
                console.log('id:', ipo.id); // Should be string
                console.log('_id:', ipo._id); // Should be string
            } else {
                console.log('No IPOs');
            }
        } catch (e) { console.error(e); }
    });
});
