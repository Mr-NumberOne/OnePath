import { ChildProcess, fork } from 'child_process';
import path from 'path';
import net from 'net';
import { app } from 'electron';
import fs from 'fs';
import { CLIENT_ID, CLIENT_SECRET } from './env';

export async function findFreePort(startPort: number = 3000): Promise<number> {
  return new Promise((resolve, reject) => {
    let port = startPort;
    const server = net.createServer();
    
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve(port));
      server.close();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findFreePort(port + 1));
      } else {
        reject(err);
      }
    });
  });
}

const SERVER_START_TIMEOUT_MS = 30_000;
const SERVER_POLL_INTERVAL_MS = 250;

// Polls the server until it answers an HTTP request. Rejects if getError()
// reports that the process failed, or when the timeout runs out.
async function waitForServer(url: string, getError: () => Error | null, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const error = getError();
    if (error) throw error;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (res.status < 500) return;
    } catch {
      // Not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
  }
  throw new Error(`Next.js server did not respond within ${timeoutMs / 1000}s`);
}

export class ServerManager {
  private serverProcess: ChildProcess | null = null;
  public port: number | null = null;

  async startServer(): Promise<number> {
    this.port = await findFreePort(3000);
    
    // In production, Next.js standalone server.js is located relative to the app execution
    // In development (when running from source), it might not exist yet if not built.
    const isProd = app.isPackaged;
    
    // The standalone output structure places `server.js` at the root of the `.next/standalone` copy.
    // When packaged with electron-builder (assuming we copy standalone files into resources/app/standalone), 
    // it will be at `path.join(process.resourcesPath, 'app', 'standalone', 'server.js')` or similar.
    let serverJsPath = '';
    let nextDir = '';
    
    if (isProd) {
      // In bundled electron-builder app, resources are in process.resourcesPath/app.asar
      // If we don't pack standalone into asar (recommended for node servers):
      serverJsPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'standalone', 'server.js');
      nextDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'standalone');
      
      // Fallback if packed entirely inside asar, though executing child_process on asar can be tricky
      if (!fs.existsSync(serverJsPath)) {
        serverJsPath = path.join(__dirname, '..', '..', 'standalone', 'server.js');
        nextDir = path.join(__dirname, '..', '..', 'standalone');
      }
    } else {
      // Development mode
      serverJsPath = path.join(__dirname, '..', '..', '.next', 'standalone', 'server.js');
      nextDir = path.join(__dirname, '..', '..', '.next', 'standalone');
    }

    if (!fs.existsSync(serverJsPath)) {
      throw new Error(`Standalone Next.js server not found at: ${serverJsPath}. Did you run 'npm run build'?`);
    }

    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const port = this.port;
    const serverProcess = fork(serverJsPath, [], {
      cwd: nextDir,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: port.toString(),
        HOSTNAME: '127.0.0.1',
        ONEPATH_DATA_DIR: dataDir, // Narrowly scoped env var for roadmap data
        AUTH_GOOGLE_ID: CLIENT_ID,
        AUTH_GOOGLE_SECRET: CLIENT_SECRET,
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    this.serverProcess = serverProcess;

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Next.js] ${data.toString()}`);
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Next.js Error] ${data.toString()}`);
    });

    // Fails fast if the server can't be spawned or dies before it is ready
    let exitError: Error | null = null;
    serverProcess.on('error', (err) => {
      console.error('Failed to start Next.js server:', err);
      exitError = err;
    });
    serverProcess.on('exit', (code) => {
      console.log(`Next.js server exited with code ${code}`);
      exitError ??= new Error(`Next.js server exited with code ${code} before it was ready`);
      if (this.serverProcess === serverProcess) this.serverProcess = null;
    });

    await waitForServer(`http://127.0.0.1:${port}/api/auth/providers`, () => exitError, SERVER_START_TIMEOUT_MS);
    return port;
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}
