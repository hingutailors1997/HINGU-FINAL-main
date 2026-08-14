const assert = require('assert');
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
const port = 5011;

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (err) {
      // keep polling
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Server did not start in time');
}

(async () => {
  const child = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });

  try {
    await waitForServer(`http://127.0.0.1:${port}/api/status`);

    const payload = {
      personalDetails: {
        fullName: 'Test Customer',
        mobile: '9876543210',
        email: 'test@example.com'
      },
      measurementDetails: {
        garmentType: 'Shirt',
        measurements: {}
      }
    };

    const response = await fetch(`http://127.0.0.1:${port}/api/customers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    console.log('Status:', response.status);
    console.log(JSON.stringify(body, null, 2));
    assert.strictEqual(response.status, 201, `Expected 201 but got ${response.status}`);
    assert.strictEqual(body.success, true, 'Expected registration to succeed');
    assert.ok(body.data && body.data._id, 'Expected saved customer id in response');
    console.log('Customer registration regression test passed.');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
})();
