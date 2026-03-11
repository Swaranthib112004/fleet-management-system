const mongoose = require('mongoose');
const Route = require('./models/routeModel');
const fs = require('fs');
require('dotenv').config();

async function check() {
    let output = '';
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const routes = await Route.find({ isOptimized: true }).sort({ updatedAt: -1 }).limit(5);
        output += `Found ${routes.length} optimized routes\n`;
        routes.forEach(r => {
            output += `Route: ${r.routeCode}, Status: ${r.status}, Polyline Count: ${r.routePolyline?.length || 0}\n`;
            if (r.routePolyline && r.routePolyline.length > 0) {
                output += `Points: ${JSON.stringify(r.routePolyline.slice(0, 3))} ... ${JSON.stringify(r.routePolyline.slice(-1))}\n`;
            }
        });
    } catch (err) {
        output += err.stack;
    } finally {
        await mongoose.disconnect();
        fs.writeFileSync('db_check_result_detailed.txt', output);
    }
}

check();
