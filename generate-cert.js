const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

// Attributes for the certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];

// Options for selfsigned
const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 365, // Certificate is valid for 1 year
  keySize: 2048,
  extensions: [
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS
          value: 'localhost',
        },
        {
          type: 7, // IP Address
          ip: '127.0.0.1',
        },
      ],
    },
  ],
});

// Write the files
fs.writeFileSync(path.join(__dirname, 'localhost-key.pem'), pems.private);
fs.writeFileSync(path.join(__dirname, 'localhost.pem'), pems.cert);

console.log('Successfully generated localhost-key.pem and localhost.pem');
