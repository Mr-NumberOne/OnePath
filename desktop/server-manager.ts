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

    return new Promise((resolve, reject) => {
      this.serverProcess = fork(serverJsPath, [], {
        cwd: nextDir,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: this.port!.toString(),
          HOSTNAME: '127.0.0.1',
          ONEPATH_DATA_DIR: dataDir, // Narrowly scoped env var for roadmap data
          AUTH_GOOGLE_ID: CLIENT_ID,
          AUTH_GOOGLE_SECRET: CLIENT_SECRET,
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
      });

      this.serverProcess.stdout?.on('data', (data) => {
        const out = data.toString();
        console.log(`[Next.js] ${out}`);
        // Wait until server is listening
        if (out.includes(`Listening on port`) || out.includes(`http://127.0.0.1:${this.port}`) || out.includes(`Ready in`)) {
          resolve(this.port!);
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[Next.js Error] ${data.toString()}`);
      });

      this.serverProcess.on('error', (err) => {
        console.error('Failed to start Next.js server:', err);
        reject(err);
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`Next.js server exited with code ${code}`);
      });
      
      // Fallback timeout in case output doesn't match
      setTimeout(() => resolve(this.port!), 3000);
    });
  }

  stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }
}
