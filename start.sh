#!/bin/sh
set -ex

# Start Nginx in the background
nginx

# Start the Next.js app with PM2 in the foreground
exec pm2-runtime start /app/ecosystem.config.js
