#!/usr/bin/env node

/**
 * deploy-web.mjs
 * 
 * Builds and deploys the React frontend to Cloudflare Pages.
 * If CLOUDFLARE_PAGES_DOMAIN is set in .env, automatically binds the custom domain
 * without requiring Terraform, Pulumi, or manual dashboard clicks.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webDir = path.resolve(rootDir, 'apps', 'web');
const distDir = path.resolve(webDir, 'dist');

// 1. Load .env and .env.local
function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const fp = path.resolve(rootDir, file);
    if (!fs.existsSync(fp)) continue;
    if (typeof process.loadEnvFile === 'function') {
      try { process.loadEnvFile(fp); continue; } catch {}
    }
    const lines = fs.readFileSync(fp, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    }
  }
}

loadEnv();

function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    env: process.env,
    ...options,
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

async function main() {
  console.log('🌐 my-ip-info Cloudflare Pages Deployer');
  console.log('─'.repeat(60));

  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'my-ip-info';
  const customDomain = process.env.CLOUDFLARE_PAGES_DOMAIN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  // 1. Build Frontend
  console.log('📦 [1/3] Building Web Dashboard (Vite)...');
  runCmd('pnpm build', { cwd: webDir, stdio: 'inherit' });

  // 2. Ensure Pages project exists
  console.log(`\n☁️  [2/3] Checking Cloudflare Pages project '${projectName}'...`);
  try {
    runCmd(`npx wrangler pages project create ${projectName} --production-branch main`, { stdio: 'pipe' });
    console.log(`   ✨ Created new Pages project: '${projectName}'`);
  } catch {
    // Project already exists, proceed
  }

  // 3. Deploy to Pages
  console.log(`\n🚀 [3/3] Uploading static assets to '${projectName}'...`);
  const deployOutput = runCmd(
    `npx wrangler pages deploy apps/web/dist --project-name ${projectName} --branch main --commit-dirty=true`,
    { cwd: rootDir }
  );
  console.log(deployOutput);

  // 4. Bind Custom Domain if defined in .env
  if (customDomain) {
    console.log(`\n🔗 Configuring Custom Domain: ${customDomain}...`);
    const token = getCloudflareToken();
    if (token && accountId) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/domains`,
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
          console.log(`   ✅ Domain '${customDomain}' successfully registered with Pages project!`);
        } else if (data.errors?.some((e) => e.message?.includes('already exists') || e.code === 8000009)) {
          console.log(`   ℹ️  Domain '${customDomain}' is already bound to this Pages project.`);
        } else {
          console.warn(`   ⚠️ Pages API response:`, data.errors?.[0]?.message || data.errors);
        }
      } catch (err) {
        console.warn(`   ⚠️ Domain binding warning: ${err.message}`);
      }
    } else {
      console.log('   ℹ️  Set CLOUDFLARE_ACCOUNT_ID in .env to automate custom domain registration.');
    }
  }

  console.log('\n🎉 Web deployment complete!');
  if (customDomain) {
    console.log(`👉 Custom Domain: https://${customDomain}`);
  }
  console.log(`👉 Pages Default: https://${projectName}.pages.dev\n`);
}

main().catch((err) => {
  console.error('Fatal error deploying web app:', err);
  process.exit(1);
});
