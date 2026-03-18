# WaveApp - Smart Inventory Management

This is a Next.js application for managing inventory, sales, and shipping.

## Getting Started

To start the development server, run:

```bash
npm run dev
```

Open [http://localhost:1999](http://localhost:1999) with your browser to see the result.

## Running in Production Mode on a Personal Computer

You can "deploy" or run this application in a production-optimized mode on your personal computer. This is useful for testing the final build or for running it as a local server for your internal network (e.g., for a physical store POS).

### 1. Build the Application

First, you need to create a production build. This command compiles and optimizes your application for the best performance.

```bash
npm run build
```

### 2. Start the Production Server

After the build is complete, run the following command to start the production server:

```bash
npm run start
```

Your application will now be running, optimized for production, at `http://localhost:1999`.

## Accessing from Other Devices

### Accessing on the Same Network

When the server is running (either in dev or production mode), you can access it from other devices on the same Wi-Fi network. This is perfect for using a tablet as a POS or for checking inventory from your phone.

To do this, you need to find your computer's local IP address and use it instead of `localhost`.

1.  **Find Your Computer's IP Address**:
    *   **On Windows**: Open Command Prompt and type `ipconfig`. Look for the "IPv4 Address".
    *   **On macOS/Linux**: Open Terminal and type `ifconfig` or `ip a`. Look for the "inet" address.
    *   It will look something like `192.168.1.5`.

2.  **Use the IP Address**:
    *   On your other device, open a web browser and go to `http://<YOUR_IP_ADDRESS>:1999`.
    *   For example: `http://192.168.1.5:1999`.

### Public Internet Access Options

Untuk mengakses aplikasi Anda dari internet, ada beberapa metode dengan tingkat keamanan dan kemudahan yang berbeda.

#### Metode 1: Layanan Tunnel (Paling Aman & Mudah)

Layanan *tunnel* membuat koneksi keluar yang aman dari komputer Anda ke server mereka, sehingga Anda tidak perlu membuka port apa pun di router Anda. **Ini adalah metode yang paling direkomendasikan.**

1.  **Cloudflare Tunnel (Gratis & Paling Aman)**: Ini adalah solusi yang sangat kuat dan cocok untuk penggunaan jangka panjang, bahkan bisa dianggap setara produksi.
    *   **Cara Kerja**: Anda menjalankan sebuah program kecil (`cloudflared`) di komputer Anda yang akan membuat koneksi aman ke jaringan Cloudflare. Tidak ada port yang dibuka di router Anda.
    *   **Keuntungan**: Anda mendapatkan URL yang permanen, perlindungan DDoS dari Cloudflare, dan sertifikat SSL (HTTPS) secara otomatis, semuanya gratis.
    *   **Langkah-langkah**: Ikuti panduan [Zero Trust / Tunnels](https://developers.cloudflare.com/zerotrust/get-started/get-started-tunnels/) di situs web Cloudflare. Anda akan menghubungkan domain Anda (atau subdomain gratis dari Cloudflare) ke aplikasi lokal Anda di `http://localhost:3000`.

2.  **ngrok (Untuk Pengembangan Cepat)**: `ngrok` sangat bagus untuk pengujian cepat dan sementara. URL publik akan berubah setiap kali Anda menjalankannya (pada versi gratis).

#### Metode 2: Port Forwarding dengan Nginx (Lanjutan, Memerlukan IP Statis)

Jika Anda tetap ingin menggunakan IP publik statis Anda secara langsung, cara yang lebih aman adalah dengan tidak mengekspos aplikasi Next.js Anda, melainkan mengekspos Nginx sebagai *reverse proxy* dan melapisinya dengan enkripsi SSL (HTTPS).

**Prasyarat:**
*   Anda memiliki **IP Publik Statis**.
*   Anda memiliki **nama domain** (misal: `toko-anda.com`).
*   Anda telah mengarahkan domain Anda ke IP publik statis Anda melalui pengaturan DNS provider domain Anda.

**Konsep Keamanan:**
Hanya Nginx yang akan bisa diakses dari internet (di port 80 dan 443). Nginx kemudian akan meneruskan permintaan secara internal ke aplikasi Next.js Anda (di port 3000).

**Langkah-langkah Umum:**

1.  **Jalankan Aplikasi dengan PM2**: Pastikan aplikasi Anda berjalan di port `3000`.
    ```bash
    npm run pm2:start
    ```

2.  **Konfigurasi Port Forwarding di Router**:
    *   Login ke router Anda dan cari menu "Port Forwarding".
    *   Buat dua aturan untuk meneruskan permintaan dari internet ke komputer lokal Anda (tempat Nginx akan berjalan):
        *   **Aturan 1 (HTTP)**: Port Eksternal `80` -> Port Internal `8080` (TCP)
        *   **Aturan 2 (HTTPS)**: Port Eksternal `443` -> Port Internal `8080` (TCP)
    *   Simpan pengaturan router.

3.  **Dapatkan Sertifikat SSL (HTTPS)**:
    *   Cara termudah dan gratis adalah menggunakan **Let's Encrypt**.
    *   Instal **Certbot** di komputer Anda sesuai instruksi di [situs web Certbot](https://certbot.eff.org/).
    *   Jalankan Certbot untuk domain Anda. Certbot dapat secara otomatis mendeteksi Nginx, mendapatkan sertifikat, dan mengkonfigurasi `nginx.conf` Anda untuk menggunakan HTTPS.

4.  **Jalankan Nginx**:
    *   Setelah Certbot selesai, jalankan Nginx dengan konfigurasi yang sudah dimodifikasi.
        ```bash
        # Anda mungkin memerlukan 'sudo'
        nginx -c /path/to/your/project/nginx.conf
        ```

5.  **Akses Aplikasi dengan Aman**:
    *   Sekarang, aplikasi Anda dapat diakses dengan aman melalui nama domain Anda:
        `https://toko-anda.com`

### Using PM2 for a Robust Local Server (Advanced)

PM2 is a process manager that helps keep your application running continuously, even if it crashes.

**1. Starting the App with PM2**

Use the following npm script to build and start your application with PM2. The app will run on `http://localhost:3000`.

```bash
npm run pm2:start
```

You can manage the app using these commands:
- `npm run pm2:stop`: Stops the app.
- `npm run pm2:restart`: Restarts the app.
- `npm run pm2:delete`: Removes the app from PM2's list.

### Running with Nginx Locally (Optional, Advanced)

To mimic the production environment on your local machine, you can run the application behind an Nginx reverse proxy. This is completely optional for local development.

**Prerequisites:**
You must have Nginx installed on your computer. You can find installation instructions for your operating system (macOS, Windows, Linux) on the official Nginx website.

**Step 1: Start the App with PM2**

First, ensure your application is running under PM2 on port 3000:

```bash
npm run pm2:start
```

**Step 2: Start Nginx**

Open a **new terminal window** and run Nginx using the configuration file from this project. You need to provide the absolute path to `nginx.conf`.

*   **On macOS or Linux:**
    ```bash
    # Make sure to replace /path/to/your/project with the actual full path
    nginx -c /path/to/your/project/nginx.conf
    ```
    *Pro Tip: You can use `$(pwd)` to get the current directory path: `nginx -c "$(pwd)/nginx.conf"`*

*   **On Windows (in Command Prompt or PowerShell):**
    ```powershell
    # Make sure to replace C:\path\to\your\project with the actual full path
    # You might need to run this from the directory where nginx.exe is located
    nginx.exe -c C:\path\to\your\project\nginx.conf
    ```

**Step 3: Access Your App**

Your application is now accessible through Nginx at `http://localhost:8080`.

**Managing Nginx**

Here are some common commands to control Nginx (you may need `sudo` on macOS/Linux or run as Administrator on Windows):

*   `nginx -s stop`: To quickly shut down Nginx.
*   `nginx -s reload`: To reload the configuration without stopping the server.
