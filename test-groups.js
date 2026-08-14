const http = require('http');

http.get('http://127.0.0.1:5000/api/groups', (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Body:', data));
}).on('error', err => console.log('Error:', err.message));
