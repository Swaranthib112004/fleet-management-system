const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost', port: 8000, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = http.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => { console.log(`POST ${path} → ${res.statusCode}: ${d.slice(0, 120)}`); resolve(); });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function getVehicles() {
    return new Promise((resolve) => {
        http.get('http://localhost:8000/api/vehicles', res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const parsed = JSON.parse(d);
                resolve(parsed.vehicles || []);
            });
        });
    });
}

async function main() {
    const vehicles = await getVehicles();
    console.log('Found vehicles:', vehicles.map(v => v.registration));

    const regs = vehicles.map(v => v.registration);
    const v0 = regs[0] || 'KA-01-MA-2024';
    const v1 = regs[1] || 'DL-5C-AB-7890';
    const v2 = regs[2] || 'MH-12-NX-5599';

    const logs = [
        {
            vehicle: v0,
            type: 'Oil Change',
            date: '2026-01-20',
            cost: 2500,
            mechanic: 'City Auto Service',
            status: 'Completed',
            notes: 'Replaced engine oil and oil filter. Checked brake pads — within tolerance.'
        },
        {
            vehicle: v1,
            type: 'Tyre Rotation & Alignment',
            date: '2026-02-05',
            cost: 1800,
            mechanic: 'SpeedFit Garage',
            status: 'Completed',
            notes: 'All four tyres rotated. Front-end alignment calibrated to manufacturer spec.'
        },
        {
            vehicle: v2,
            type: 'AC Servicing',
            date: '2026-02-25',
            cost: 3200,
            mechanic: 'Coolzone Auto Works',
            status: 'In Progress',
            notes: 'Refrigerant refill and condenser cleaning in progress. Expected completion: 28-Feb.'
        }
    ];

    for (const log of logs) {
        await post('/api/maintenance', log);
    }
    console.log('Done seeding maintenance logs!');
}

main().catch(console.error);
