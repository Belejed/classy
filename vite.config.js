import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import handler from './api/upload-drive.js'

import checkHandler from './api/check-drive-file.js'
import trashHandler from './api/trash-drive-file.js'

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    root: __dirname,
    plugins: [
      react(),
      {
        name: 'generate-version-json',
        buildStart() {
          try {
            const versionInfo = {
              version: Date.now(),
              builtAt: new Date().toISOString()
            };
            const versionPath = path.resolve(__dirname, 'public/version.json');
            fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
            console.log('[Vite] Generated fresh public/version.json with timestamp:', versionInfo.version);
          } catch (err) {
            console.warn('[Vite] Could not write public/version.json:', err);
          }
        }
      },
      {
        name: 'api-dev-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const isUpload = req.url.startsWith('/api/upload-drive');
            const isCheck = req.url.startsWith('/api/check-drive-file');
            const isTrash = req.url.startsWith('/api/trash-drive-file');

            if (isUpload || isCheck || isTrash) {
              if (req.method === 'POST') {
                let bodyStr = '';
                req.on('data', chunk => { bodyStr += chunk; });
                req.on('end', async () => {
                  try {
                    req.body = JSON.parse(bodyStr);
                  } catch {
                    req.body = {};
                  }
                  const fakeRes = {
                    setHeader: (name, val) => res.setHeader(name, val),
                    status: (code) => {
                      res.statusCode = code;
                      return fakeRes;
                    },
                    json: (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    end: () => res.end()
                  };
                  try {
                    if (isUpload) await handler(req, fakeRes);
                    else if (isCheck) await checkHandler(req, fakeRes);
                    else if (isTrash) await trashHandler(req, fakeRes);
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: e.message }));
                  }
                });
                return;
              }
              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }
            }
            next();
          });
        }
      }
    ],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
          }
        }
      }
    }
  };
});
