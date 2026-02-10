# 1. Base Image
FROM node:20-bullseye-slim

# 2. Install dependencies
RUN apt-get update && apt-get install -y nginx procps && apt-get clean

# 3. Set working directory
WORKDIR /app

# 4. Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# 5. Copy the rest of the application
COPY . .

# 6. Build the Next.js app
RUN npm run build

# 7. Configure Nginx
COPY nginx.conf /etc/nginx/sites-available/default

# 8. Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 9. Expose port for Nginx
EXPOSE 8080

# 10. Set the entrypoint
CMD ["/app/start.sh"]
