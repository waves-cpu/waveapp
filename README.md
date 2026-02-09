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

### 3. Accessing from Other Devices (e.g., Mobile Phones, Other Computers)

When the server is running (either in dev or production mode), you can access it from other devices on the same Wi-Fi network. This is perfect for using a tablet as a POS or for checking inventory from your phone.

To do this, you need to find your computer's local IP address and use it instead of `localhost`.

1.  **Find Your Computer's IP Address**:
    *   **On Windows**: Open Command Prompt and type `ipconfig`. Look for the "IPv4 Address".
    *   **On macOS/Linux**: Open Terminal and type `ifconfig` or `ip a`. Look for the "inet" address.
    *   It will look something like `192.168.1.5`.

2.  **Use the IP Address**:
    *   On your other device, open a web browser and go to `http://<YOUR_IP_ADDRESS>:1999`.
    *   For example: `http://192.168.1.5:1999`.

### Using PM2 for Local Deployment (Advanced)

PM2 is a process manager that helps keep your application running continuously. If you want a more robust local deployment that automatically restarts on crashes, you can use PM2.

1.  **Install PM2 globally (if you haven't already)**:
    ```bash
    npm install pm2 -g
    ```

2.  **Build the Application**:
    ```bash
    npm run build
    ```

3.  **Start with PM2**:
    From your project directory, run:
    ```bash
    pm2 start ecosystem.config.js
    ```

Your application will now be running in the background, managed by PM2. You can use commands like `pm2 list` to see its status or `pm2 stop waveapp` to stop it.