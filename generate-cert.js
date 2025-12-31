
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const pems = selfsigned.generate(
  [{ name: 'commonName', value: 'localhost' }],
  {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
  }
);

const certPath = path.join(__dirname);

fs.writeFileSync(path.join(certPath, 'localhost.pem'), pems.cert);
fs.writeFileSync(path.join(certPath, 'localhost-key.pem'), pems.private);

console.log('HTTPS certificate and key generated!');
console.log(`- Certificate: ${path.join(certPath, 'localhost.pem')}`);
console.log(`- Key: ${path.join(certPath, 'localhost-key.pem')}`);
