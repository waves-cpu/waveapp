# Tahap 1: Menginstal dependensi
FROM node:20-slim AS deps
# Menginstal openssl yang dibutuhkan oleh better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends openssl
WORKDIR /app

# Menyalin file package dan menginstal dependensi
COPY package.json package-lock.json* ./
RUN npm install

# Tahap 2: Membangun aplikasi
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Tahap 3: Menjalankan aplikasi
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment untuk menonaktifkan telemetri Next.js
# ENV NEXT_TELEMETRY_DISABLED 1

# Menyalin hasil build dan file yang dibutuhkan
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
