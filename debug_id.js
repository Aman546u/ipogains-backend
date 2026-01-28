const http = require('http');

http.get('http://localhost:3000/api/ipos?limit=1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.ipos && json.ipos.length > 0) {
                const ipo = json.ipos[0];
                console.log('--- DB RECORD ---');
                console.log('id:', ipo.id, typeof ipo.id);
                console.log('_id:', ipo._id, typeof ipo._id);
                console.log('companyName:', ipo.companyName);
            } else {
                console.log('No IPOs found');
            }
        } catch (e) {
            console.error('Parse Error', e);
        }
    });
});
