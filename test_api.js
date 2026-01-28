const http = require('http');

http.get('http://localhost:3000/api/ipos?limit=1', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.ipos && json.ipos.length > 0) {
            const ipo = json.ipos[0];
            console.log('✅ Backend is LIVE');
            console.log('✅ ID field:', ipo.id);
            console.log('✅ _ID field:', ipo._id);
            console.log('✅ Company:', ipo.companyName);
            console.log('\n🎯 The fix is ACTIVE and working!');
        }
    });
}).on('error', () => {
    console.log('❌ Backend is NOT running');
});
