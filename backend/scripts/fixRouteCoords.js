const axios = require('axios');
const connectDB = require('../config/db');
const Route = require('../models/routeModel');

// Simple sleep to respect Nominatim rate limits
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function geocode(query) {
  if (!query || typeof query !== 'string') return null;
  try {
    const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'FleetPro-FixCoords/1.0 (+https://example.com)' }
    });
    if (Array.isArray(resp.data) && resp.data.length > 0) {
      const r = resp.data[0];
      return { latitude: parseFloat(r.lat), longitude: parseFloat(r.lon) };
    }
  } catch (err) {
    console.warn('Geocode error for', query, err.message || err);
  }
  return null;
}

function isDefaultCoord(lat, lng) {
  // detect previous hardcoded defaults (Delhi-like) or nulls
  if (lat == null || lng == null) return true;
  const dLat = Number(lat);
  const dLng = Number(lng);
  if (!isFinite(dLat) || !isFinite(dLng)) return true;
  // previously used defaults in this project: 28.6139,77.2090 and 28.7041,77.1025
  const pairs = [ [28.6139,77.2090], [28.7041,77.1025] ];
  return pairs.some(p => Math.abs(p[0] - dLat) < 0.0005 && Math.abs(p[1] - dLng) < 0.0005);
}

async function fix() {
  await connectDB();
  console.log('Connected to DB — scanning routes');

  const routes = await Route.find({}).limit(1000).lean();
  let updated = 0;

  for (const r of routes) {
    let changed = false;

    // Start
    const s = r.startLocation || {};
    if (isDefaultCoord(s.latitude, s.longitude)) {
      const q = s.name || r.routeCode || '';
      const geo = await geocode(q + '');
      if (geo) {
        await Route.updateOne({ _id: r._id }, { $set: { 'startLocation.latitude': geo.latitude, 'startLocation.longitude': geo.longitude } });
        console.log(`Updated start for ${r.routeCode} -> ${geo.latitude},${geo.longitude}`);
        changed = true;
      } else {
        console.log(`No geocode for start ${r.routeCode} (${q})`);
      }
      await sleep(1100);
    }

    // End
    const e = r.endLocation || {};
    if (isDefaultCoord(e.latitude, e.longitude)) {
      const q = e.name || r.routeCode || '';
      const geo = await geocode(q + '');
      if (geo) {
        await Route.updateOne({ _id: r._id }, { $set: { 'endLocation.latitude': geo.latitude, 'endLocation.longitude': geo.longitude } });
        console.log(`Updated end for ${r.routeCode} -> ${geo.latitude},${geo.longitude}`);
        changed = true;
      } else {
        console.log(`No geocode for end ${r.routeCode} (${q})`);
      }
      await sleep(1100);
    }

    if (changed) updated++;
  }

  console.log(`Done. Routes updated: ${updated}`);
  process.exit(0);
}

fix().catch((e) => {
  console.error('Script failed', e && e.message ? e.message : e);
  process.exit(1);
});
