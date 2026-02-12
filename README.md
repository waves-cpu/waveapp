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
