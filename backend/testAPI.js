// API ENDPOINT TEST SCRIPT
// Tests all critical API endpoints

const http = require('http');
const https = require('https');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:5000',
  endpoints: []
};

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, TEST_CONFIG.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      timeout: 5000,
      headers: {
        'Content-Type': 'application /json'
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : { status: res.statusCode };
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 API ENDPOINT TESTS');
  console.log('='.repeat(70) + '\n');

  // TEST 1: Health Check
  console.log('📝 TEST 1: Backend Health Check');
  try {
    const res = await makeRequest('GET', '/api');
    if (res.status === 200) {
      console.log(`   ✅ Backend responding`);
      console.log(`      Response: "${res.data}"`);
      results.passed.push('Health Check');
    } else {
      console.log(`   ❌ Unexpected status: ${res.status}`);
      results.failed.push('Health Check: ' + res.status);
    }
  } catch (err) {
    console.log(`   ❌ Cannot connect to backend at ${TEST_CONFIG.baseUrl}`);
    console.log(`      Error: ${err.message}`);
    results.failed.push('Health Check: ' + err.message);
    return; // Exit if backend not running
  }

  // TEST 2: Login Endpoint
  console.log('\n📝 TEST 2: Login Endpoint (POST /api/auth/login)');
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
    
    console.log(`   Status: ${res.status}`);
    if (res.status === 200 && res.data.accessToken) {
      console.log(`   ✅ Login successful`);
      console.log(`      Token: ${res.data.accessToken.substring(0, 20)}...`);
      results.passed.push('Login Endpoint');
      
      // Store token for other tests
      TEST_CONFIG.token = res.data.accessToken;
      TEST_CONFIG.userId = res.data.user ? res.data.user.id : 'unknown';
    } else if (res.status === 400 || res.status === 401) {
      console.log(`   ⚠️  Login failed (expected - no test user in database)`);
      console.log(`      Response: ${typeof res.data === 'string' ? res.data : JSON.stringify(res.data).substring(0, 100)}`);
      results.warnings.push('Login requires existing user');
    } else {
      console.log(`   ❌ Unexpected response`);
      results.failed.push('Login: ' + res.status);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    results.failed.push('Login: ' + err.message);
  }

  // TEST 3: Health check for protected endpoints (without token)
  console.log('\n📝 TEST 3: Protected Endpoint (No Token)');
  try {
    const res = await makeRequest('GET', '/api/vehicles');
    
    console.log(`   Status: ${res.status}`);
    if (res.status === 401 || res.status === 403) {
      console.log(`   ✅ Protected route correctly requires token`);
      results.passed.push('Route Protection');
    } else {
      console.log(`   ⚠️  Expected 401/403, got ${res.status}`);
      results.warnings.push('Route protection status: ' + res.status);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    results.failed.push('Protected Route: ' + err.message);
  }

  // TEST 4: Get Vehicles (if we have a token)
  if (TEST_CONFIG.token) {
    console.log('\n📝 TEST 4: Get Vehicles (GET /api/vehicles)');
    try {
      const res = await makeRequest('GET', '/api/vehicles');
      
      console.log(`   Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ API responding`);
        if (Array.isArray(res.data)) {
          console.log(`      Found ${res.data.length} vehicles`);
          results.passed.push('Get Vehicles');
        } else if (res.data.vehicles && Array.isArray(res.data.vehicles)) {
          console.log(`      Found ${res.data.vehicles.length} vehicles`);
          results.passed.push('Get Vehicles');
        } else {
          console.log(`      Response type: ${typeof res.data}`);
          results.warnings.push('Vehicles response format unexpected');
        }
      } else {
        console.log(`   ⚠️  Status ${res.status}`);
        results.warnings.push('Get Vehicles: ' + res.status);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.failed.push('Get Vehicles: ' + err.message);
    }
  }

  // TEST 5: Get Drivers
  if (TEST_CONFIG.token) {
    console.log('\n📝 TEST 5: Get Drivers (GET /api/drivers)');
    try {
      const res = await makeRequest('GET', '/api/drivers');
      
      console.log(`   Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ API responding`);
        const count = Array.isArray(res.data) ? res.data.length : 
                     (res.data.drivers && Array.isArray(res.data.drivers)) ? res.data.drivers.length : 0;
        console.log(`      Found ${count} drivers`);
        results.passed.push('Get Drivers');
      } else {
        results.warnings.push('Get Drivers: ' + res.status);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.failed.push('Get Drivers: ' + err.message);
    }
  }

  // TEST 6: Get Maintenance
  if (TEST_CONFIG.token) {
    console.log('\n📝 TEST 6: Get Maintenance (GET /api/maintenance)');
    try {
      const res = await makeRequest('GET', '/api/maintenance');
      
      console.log(`   Status: ${res.status}`);
      if (res.status === 200) {
        console.log(`   ✅ API responding`);
        const count = Array.isArray(res.data) ? res.data.length : 
                     (res.data.maintenances && Array.isArray(res.data.maintenances)) ? res.data.maintenances.length : 0;
        console.log(`      Found ${count} maintenance logs`);
        results.passed.push('Get Maintenance');
      } else {
        results.warnings.push('Get Maintenance: ' + res.status);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      results.failed.push('Get Maintenance: ' + err.message);
    }
  }

  // TEST 7: Check specific routes
  console.log('\n📝 TEST 7: Route Endpoints Check');
  const routesToCheck = [
    { method: 'GET', path: '/api/auth/me', name: 'Get Current User' },
    { method: 'GET', path: '/api/uploads', name: 'Get Documents' },
    { method: 'GET', path: '/api/routes', name: 'Get Routes' },
    { method: 'GET', path: '/api/gps/fleet-locations', name: 'GPS Fleet Locations' },
    { method: 'GET', path: '/api/dashboard/overview', name: 'Dashboard Overview' },
    { method: 'GET', path: '/api/reminders', name: 'Get Reminders' },
    { method: 'GET', path: '/api/roles', name: 'Get Roles' },
    { method: 'GET', path: '/api/audit', name: 'Get Audit Logs' }
  ];

  for (const route of routesToCheck) {
    try {
      const res = await makeRequest(route.method, route.path);
      const status = res.status === 200 ? '✅' : res.status === 401 ? '🔒' : res.status === 404 ? '❌' : '⚠️';
      const statusText = res.status === 401 ? 'Auth required' : res.status === 404 ? 'Not found' : `Status ${res.status}`;
      console.log(`   ${status} ${route.name}: ${statusText}`);
      
      if (res.status === 200) {
        results.passed.push(route.name);
      } else if (res.status === 401) {
        // Expected for protected routes without token
      } else if (res.status === 404) {
        results.failed.push(`${route.name}: Not Found`);
      }
    } catch (err) {
      console.log(`   ❌ ${route.name}: ${err.message.substring(0, 40)}...`);
      results.failed.push(`${route.name}: ${err.message}`);
    }
  }

  // SUMMARY
  console.log('\n' + '='.repeat(70));
  console.log('📊 API TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`\n✅ PASSED: ${results.passed.length}`);
  results.passed.forEach(test => console.log(`   ✓ ${test}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
    results.warnings.forEach(w => console.log(`   ⚠ ${w}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`   ✗ ${f}`));
  }

  console.log('\n' + '='.repeat(70));
  const totalTests = results.passed.length + results.failed.length;
  if (totalTests > 0) {
    const passRate = (results.passed.length / totalTests * 100).toFixed(1);
    console.log(`📈 OVERALL: ${results.passed.length}/${totalTests} endpoints working (${passRate}%)`);
  } else {
    console.log('📈 No endpoints could be tested (backend not running?)');
  }
  console.log('='.repeat(70) + '\n');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Add small delay to allow server to be ready
setTimeout(runTests, 1000);
