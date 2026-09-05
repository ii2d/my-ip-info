#!/usr/bin/env node

/**
 * deploy-and-sync.mjs
 * 
 * Orchestrates serverless deployments and synchronizes assigned endpoint URLs
 * directly into apps/web/.env.local so the Web UI immediately communicates with
 * your deployed clouds without manual copy-pasting.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webEnvPath = path.resolve(rootDir, 'apps', 'web', '.env.local');

const isSyncOnly = process.argv.includes('--sync-only');

// =============================================================================
// 1. Environment Loading (.env & .env.local)
// =============================================================================
function loadEnvFiles() {
  const loadedFiles = [];
  const candidateFiles = ['.env', '.env.local'];

  for (const file of candidateFiles) {
    const fullPath = path.resolve(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    loadedFiles.push(file);

    // Try Node.js built-in process.loadEnvFile (Node >= 20.6.0)
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(fullPath);
      } catch {
        // Fall back to line parser if loadEnvFile encountered format issues
        parseAndLoadEnv(fullPath);
      }
    } else {
      parseAndLoadEnv(fullPath);
    }
  }

  return loadedFiles;
}

function parseAndLoadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const firstEq = trimmed.indexOf('=');
      if (firstEq === -1) continue;
      const key = trimmed.slice(0, firstEq).trim();
      const val = trimmed.slice(firstEq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    // Ignore file reading errors
  }
}

const loadedEnvFiles = loadEnvFiles();

console.log('🚀 my-ip-info Deployment & Endpoint Sync Utility');
console.log('─'.repeat(60));

if (loadedEnvFiles.length > 0) {
  console.log(`📁 Loaded environment files: ${loadedEnvFiles.join(', ')}`);
} else {
  console.log('ℹ️  No root .env or .env.local found. Using current system environment.');
}

const endpoints = {
  VITE_CLOUDFLARE_URL: '',
  VITE_FIREBASE_URL: '',
  VITE_LAMBDA_URL: '',
};

// Read existing apps/web/.env.local if present to preserve values
if (fs.existsSync(webEnvPath)) {
  const content = fs.readFileSync(webEnvPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (key && key in endpoints) {
      endpoints[key] = val;
    }
  }
}

// =============================================================================
// 2. Deploy Cloudflare Worker (apps/server-cloudflare)
// =============================================================================
if (!isSyncOnly) {
  console.log('\n📦 [1/2] Deploying Cloudflare Worker (apps/server-cloudflare)...');

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log('   ℹ️  CLOUDFLARE_ACCOUNT_ID is not set in .env.');
    console.log('      If you have multiple Cloudflare accounts, set it in .env to prevent prompts.');
    console.log('      Run `npx wrangler whoami` to find your account IDs.\n');
  }

  try {
    const cfDir = path.resolve(rootDir, 'apps', 'server-cloudflare');
    const output = execSync('npx wrangler deploy', {
      cwd: cfDir,
      encoding: 'utf8',
      env: process.env,
    });
    console.log(output);

    // Extract https://*.workers.dev from output
    const match = output.match(/https:\/\/[a-zA-Z0-9-_\.]+\.workers\.dev/);
    if (match) {
      endpoints.VITE_CLOUDFLARE_URL = match[0];
      console.log(`✅ Detected Cloudflare Worker URL: ${endpoints.VITE_CLOUDFLARE_URL}`);
    }
  } catch (err) {
    console.warn('⚠️ Cloudflare deployment failed or was cancelled.');
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.warn('👉 Action needed: Check your Cloudflare credentials (`npx wrangler login`) or account ID in .env.\n');
  }

  // ===========================================================================
  // 3. Deploy Firebase Functions (apps/server-firebase)
  // ===========================================================================
  console.log('\n📦 [2/2] Deploying Firebase Function (apps/server-firebase)...');
  const fbDir = path.resolve(rootDir, 'apps', 'server-firebase');
  const fbRcPath = path.resolve(fbDir, '.firebaserc');

  const firebaseProject = process.env.FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const hasFirebaseRc = fs.existsSync(fbRcPath);

  if (!firebaseProject && !hasFirebaseRc) {
    console.warn('⚠️  Firebase deployment skipped: Missing Firebase Project configuration.');
    console.warn('   ─────────────────────────────────────────────────────────────');
    console.warn('   To deploy Firebase Functions, you need a project configured:');
    console.warn('   1. Set FIREBASE_PROJECT=<your-project-id> in your root .env file');
    console.warn('      OR run: cd apps/server-firebase && npx firebase-tools use --add');
    console.warn('   2. Authenticate locally with: npx firebase-tools login');
    console.warn('   3. Note: Cloud Functions require the Firebase Blaze (pay-as-you-go) plan.');
    console.warn('   ─────────────────────────────────────────────────────────────\n');
  } else {
    try {
      const projectArg = firebaseProject ? ` --project ${firebaseProject}` : '';
      const deployCommand = `pnpm build && npx firebase-tools deploy --only functions${projectArg}`;

      console.log(`   Running: ${deployCommand}...`);
      const output = execSync(deployCommand, {
        cwd: fbDir,
        encoding: 'utf8',
        env: process.env,
      });
      console.log(output);

      // Extract https://*.cloudfunctions.net/api or region URL
      const match = output.match(/https:\/\/[a-zA-Z0-9-_\.]+\.cloudfunctions\.net\/api/);
      if (match) {
        endpoints.VITE_FIREBASE_URL = match[0];
        console.log(`✅ Detected Firebase Function URL: ${endpoints.VITE_FIREBASE_URL}`);
      }
    } catch (err) {
      console.warn('⚠️ Firebase deployment failed.');
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      console.warn('👉 Action needed:');
      console.warn('   - Ensure you are logged in via: npx firebase-tools login');
      console.warn('   - Verify FIREBASE_PROJECT in .env matches a project in your Google Cloud account.');
      console.warn('   - Ensure Cloud Functions API and Cloud Build API are enabled on Blaze plan.\n');
    }
  }
}

// =============================================================================
// 4. Write synced variables to apps/web/.env.local
// =============================================================================
console.log('\n🔄 Synchronizing endpoints to Web frontend...');
const envLines = [
  '# Auto-generated by deploy-and-sync.mjs',
  `# Last updated: ${new Date().toISOString()}`,
  '',
  `VITE_CLOUDFLARE_URL=${endpoints.VITE_CLOUDFLARE_URL}`,
  `VITE_FIREBASE_URL=${endpoints.VITE_FIREBASE_URL}`,
  `VITE_LAMBDA_URL=${endpoints.VITE_LAMBDA_URL}`,
  '',
];

fs.mkdirSync(path.dirname(webEnvPath), { recursive: true });
fs.writeFileSync(webEnvPath, envLines.join('\n'), 'utf8');

console.log(`✨ Synced endpoints into: ${path.relative(rootDir, webEnvPath)}`);
console.log('\nCurrent configuration:');
console.table(endpoints);
