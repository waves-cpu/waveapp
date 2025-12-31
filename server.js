
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
};

const port = 1999;
const host = '0.0.0.0';

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, host, (err) => {
    if (err) throw err;
    console.log(`> Ready on https://${host}:${port}`);
    // Note: To access from another device on the same network, find your computer's local IP address
    // and access https://<YOUR_LOCAL_IP>:${port}
  });
});
