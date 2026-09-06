#!/usr/bin/env node

/**
 * deploy.mjs
 *
 * Orchestrates Cloudflare deployments:
 *   --api : Deploys the Cloudflare Worker API & syncs endpoint to frontend
 *   --web : Builds & deploys the React dashboard to Cloudflare Pages
 *   (default / --all) : Deploys API first, syncs URL, then deploys Web UI
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, 'apps', 'web');
const cfDir = path.resolve(rootDir, 'apps', 'server-cloudflare');
const webEnvPath = path.resolve(webDir, '.env.local');

const args = process.argv.slice(2);
const isApiOnly = args.includes('--api') || args.includes('--app') || args.includes('--worker');
const isWebOnly = args.includes('--web') || args.includes('--pages');
const deployAll = !isApiOnly && !isWebOnly;

// =============================================================================
// 1. Environment Loading (.env & .env.local)
// =============================================================================
function loadEnv() {
  const loaded = [];
  for (const file of ['.env', '.env.local']) {
    const fp = path.resolve(rootDir, file);
    if (!fs.existsSync(fp)) continue;
    loaded.push(file);

    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(fp);
        continue;
      } catch {}
    }

    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed
        .slice(idx + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
  return loaded;
}

const loadedFiles = loadEnv();

function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    ...options,
    env: { ...process.env, ...(options.env || {}) },
  });
}

function getCloudflareToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const candidates = [
    path.resolve(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml'),
    path.resolve(process.env.HOME || '', '.wrangler/config/default.toml'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const match = fs.readFileSync(p, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
      if (match) return match[1];
    }
  }
  return null;
}

console.log('🚀 my-ip-info Cloudflare Deployer');
console.log('─'.repeat(60));
if (loadedFiles.length > 0) {
  console.log(`📁 Loaded environment: ${loadedFiles.join(', ')}`);
}

let apiUrl = '';

// Read existing apps/web/.env.local if present
if (fs.existsSync(webEnvPath)) {
  const content = fs.readFileSync(webEnvPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_CLOUDFLARE_URL=')) {
      apiUrl = trimmed
        .replace('VITE_CLOUDFLARE_URL=', '')
        .trim()
        .replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  // ===========================================================================
  // Step 1: Deploy API (Cloudflare Worker)
  // ===========================================================================
  const workerAccountId =
    process.env.CLOUDFLARE_WORKER_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const pagesAccountId =
    process.env.CLOUDFLARE_PAGES_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;

  // ===========================================================================
  // Step 1: Deploy API (Cloudflare Worker)
  // ===========================================================================
  if (deployAll || isApiOnly) {
    console.log('\n📦 Deploying Cloudflare Worker API (apps/server-cloudflare)...');

    if (!workerAccountId) {
      console.log(
        '   ℹ️  No Cloudflare Account ID specified in .env (CLOUDFLARE_WORKER_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID).'
      );
      console.log('      Run `npx wrangler whoami` to find and set your account ID.\n');
    } else {
      console.log(`   Target Account ID: ${workerAccountId}`);
    }

    try {
      const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'my-ip-info';
      const domainFlag = process.env.CLOUDFLARE_WORKER_DOMAIN
        ? ` --domain ${process.env.CLOUDFLARE_WORKER_DOMAIN}`
        : '';
      const workerEnv = workerAccountId ? { CLOUDFLARE_ACCOUNT_ID: workerAccountId } : {};

      console.log(
        `   Deploying Worker: '${workerName}'${process.env.CLOUDFLARE_WORKER_DOMAIN ? ` (Domain: ${process.env.CLOUDFLARE_WORKER_DOMAIN})` : ''}...`
      );
      const output = runCmd(`npx wrangler deploy --name ${workerName}${domainFlag}`, {
        cwd: cfDir,
        env: workerEnv,
      });
      console.log(output);

      if (process.env.CLOUDFLARE_WORKER_DOMAIN) {
        apiUrl = `https://${process.env.CLOUDFLARE_WORKER_DOMAIN}`;
      } else {
        const match = output.match(/https:\/\/[a-zA-Z0-9-_.]+\.workers\.dev/);
        if (match) apiUrl = match[0];
      }

      console.log(`✅ Worker API live at: ${apiUrl}`);

      // Sync to apps/web/.env.local
      fs.mkdirSync(path.dirname(webEnvPath), { recursive: true });
      const envContent = [
        '# Auto-generated by deploy.mjs',
        `# Last updated: ${new Date().toISOString()}`,
        '',
        `VITE_CLOUDFLARE_URL=${apiUrl}`,
        '',
      ].join('\n');
      fs.writeFileSync(webEnvPath, envContent, 'utf8');
      console.log(`✨ Synced API endpoint into: apps/web/.env.local`);
    } catch (err) {
      console.warn('⚠️ Cloudflare Worker deployment failed.');
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      if (isApiOnly) process.exit(1);
    }
  }

  // ===========================================================================
  // Step 2: Deploy Web (Cloudflare Pages)
  // ===========================================================================
  if (deployAll || isWebOnly) {
    console.log('\n🌐 Deploying Web Dashboard to Cloudflare Pages (apps/web)...');
    const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'my-ip-info';
    const customDomain = process.env.CLOUDFLARE_PAGES_DOMAIN;
    const pagesEnv = pagesAccountId ? { CLOUDFLARE_ACCOUNT_ID: pagesAccountId } : {};

    if (pagesAccountId) {
      console.log(`   Target Account ID: ${pagesAccountId}`);
    }

    // 1. Build Vite frontend
    console.log('   Building Web UI bundle (Vite)...');
    runCmd('pnpm build', { cwd: webDir, stdio: 'inherit' });

    // 2. Ensure Pages project exists
    try {
      runCmd(`npx wrangler pages project create ${projectName} --production-branch main`, {
        stdio: 'pipe',
        env: pagesEnv,
      });
      console.log(`   ✨ Created Pages project: '${projectName}'`);
    } catch {
      // Already exists
    }

    // 3. Upload assets
    console.log(`   Uploading assets to '${projectName}'...`);
    const output = runCmd(
      `npx wrangler pages deploy apps/web/dist --project-name ${projectName} --branch main --commit-dirty=true`,
      { cwd: rootDir, env: pagesEnv }
    );
    console.log(output);

    // 4. Bind Custom Domain if defined
    if (customDomain) {
      console.log(`   🔗 Checking custom domain: ${customDomain}...`);
      const token = getCloudflareToken();
      if (token && pagesAccountId) {
        try {
          const res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${pagesAccountId}/pages/projects/${projectName}/domains`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: customDomain }),
            }
          );
          const data = await res.json();
          if (data.success) {
            console.log(`   ✅ Domain '${customDomain}' successfully registered!`);
          } else if (
            data.errors?.some((e) => e.message?.includes('already exists') || e.code === 8000009)
          ) {
            console.log(`   ℹ️  Domain '${customDomain}' is active on Pages project.`);
          }
        } catch (err) {
          console.warn(`   ⚠️ Domain registration warning: ${err.message}`);
        }
      }
    }

    console.log(
      `✅ Web UI live at: ${customDomain ? `https://${customDomain}` : `https://${projectName}.pages.dev`}`
    );
  }

  console.log('\n🎉 Deployment Complete!');
  console.log('─'.repeat(60));
  if (apiUrl) console.log(`👉 Backend API : ${apiUrl}`);
  if (deployAll || isWebOnly) {
    const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'my-ip-info';
    const domain = process.env.CLOUDFLARE_PAGES_DOMAIN;
    console.log(
      `👉 Web Frontend: ${domain ? `https://${domain}` : `https://${projectName}.pages.dev`}`
    );
  }
  console.log();
}

main().catch((err) => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
