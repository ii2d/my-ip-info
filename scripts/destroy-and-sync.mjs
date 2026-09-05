#!/usr/bin/env node

/**
 * destroy-and-sync.mjs
 * 
 * Safely tears down deployed serverless services (Cloudflare Worker, Firebase Function,
 * AWS Lambda) and cleans up the endpoint entries in apps/web/.env.local.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webEnvPath = path.resolve(rootDir, 'apps', 'web', '.env.local');

const args = process.argv.slice(2);
const isForce = args.includes('--force') || args.includes('-y') || args.includes('--yes');
const isCloudflareOnly = args.includes('--cloudflare-only');
const isFirebaseOnly = args.includes('--firebase-only');
const isLambdaOnly = args.includes('--lambda-only');
const isWebOnly = args.includes('--web-only') || args.includes('--pages-only');

const destroyAll = !isCloudflareOnly && !isFirebaseOnly && !isLambdaOnly && !isWebOnly;

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

    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(fullPath);
      } catch {
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
  } catch {}
}

loadEnvFiles();

// Helper to run commands
function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    env: process.env,
    ...options,
  });
}

// Load existing endpoints
const endpoints = {
  VITE_CLOUDFLARE_URL: '',
  VITE_FIREBASE_URL: '',
  VITE_LAMBDA_URL: '',
};

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

async function confirmTeardown() {
  if (isForce || !process.stdin.isTTY) return true;

  const targets = [];
  if (destroyAll || isCloudflareOnly) targets.push('Cloudflare Worker');
  if (destroyAll || isFirebaseOnly) targets.push('Firebase Function');
  if (destroyAll || isLambdaOnly) targets.push('AWS Lambda');
  if (destroyAll || isWebOnly) targets.push('Cloudflare Pages (Web Dashboard)');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `⚠️  Are you sure you want to DESTROY [${targets.join(', ')}]? (y/N): `,
      (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
      }
    );
  });
}

async function main() {
  console.log('🗑️  my-ip-info Serverless Teardown & Endpoint Sync Utility');
  console.log('─'.repeat(65));

  const proceed = await confirmTeardown();
  if (!proceed) {
    console.log('Teardown cancelled by user.');
    process.exit(0);
  }

  // ===========================================================================
  // 2. Destroy Cloudflare Worker
  // ===========================================================================
  if (destroyAll || isCloudflareOnly) {
    console.log('\n🧹 [1/3] Destroying Cloudflare Worker (apps/server-cloudflare)...');
    const cfDir = path.resolve(rootDir, 'apps', 'server-cloudflare');
    try {
      const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'my-ip-info';
      console.log(`   Deleting Cloudflare Worker '${workerName}'...`);
      const output = runCmd(`npx wrangler delete ${workerName} --force`, { cwd: cfDir });
      console.log(output);
      endpoints.VITE_CLOUDFLARE_URL = '';
      console.log(`✅ Cloudflare Worker '${workerName}' removed.`);
    } catch (err) {
      console.warn('⚠️ Could not delete Cloudflare Worker (it may not exist or wrangler is unauthenticated).');
      if (err.stdout) console.log(err.stdout);
    }
  }

  // ===========================================================================
  // 3. Destroy Firebase Function
  // ===========================================================================
  if (destroyAll || isFirebaseOnly) {
    console.log('\n🧹 [2/3] Destroying Firebase Function (apps/server-firebase)...');
    const fbDir = path.resolve(rootDir, 'apps', 'server-firebase');
    const firebaseProject = process.env.FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID;

    if (!firebaseProject) {
      console.log('   ℹ️  No FIREBASE_PROJECT set in .env. Skipping Firebase teardown.');
    } else {
      try {
        const cmd = `npx firebase-tools functions:delete api --force --project ${firebaseProject}`;
        console.log(`   Running: ${cmd}...`);
        const output = runCmd(cmd, { cwd: fbDir });
        console.log(output);
        endpoints.VITE_FIREBASE_URL = '';
        console.log('✅ Firebase Function removed.');
      } catch (err) {
        console.warn('⚠️ Could not delete Firebase Function (may not be deployed or unauthenticated).');
        if (err.stdout) console.log(err.stdout);
      }
    }
  }

  // ===========================================================================
  // 4. Destroy AWS Lambda
  // ===========================================================================
  if (destroyAll || isLambdaOnly) {
    console.log('\n🧹 [3/3] Destroying AWS Lambda (apps/server-lambda)...');
    const profile = process.env.AWS_PROFILE ? `--profile ${process.env.AWS_PROFILE}` : '';
    const region = process.env.AWS_REGION || 'us-east-1';
    const regionFlag = `--region ${region}`;
    const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'my-ip-info';

    try {
      // 1. Delete function (this automatically deletes associated Function URLs)
      console.log(`   Deleting Lambda function '${functionName}'...`);
      runCmd(`aws lambda delete-function --function-name ${functionName} ${profile} ${regionFlag}`, {
        stdio: 'pipe',
      });
      endpoints.VITE_LAMBDA_URL = '';
      console.log(`✅ AWS Lambda function '${functionName}' deleted.`);
    } catch (err) {
      console.warn(`⚠️ AWS Lambda function '${functionName}' could not be deleted (may not exist).`);
    }

    // 2. Clean up IAM role if requested / existing
    try {
      const roleName = 'my-ip-info-lambda-role';
      runCmd(
        `aws iam detach-role-policy --role-name ${roleName} --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole ${profile}`,
        { stdio: 'pipe' }
      );
      runCmd(`aws iam delete-role --role-name ${roleName} ${profile}`, { stdio: 'pipe' });
      console.log(`✅ IAM execution role '${roleName}' deleted.`);
    } catch {
      // Role may be shared or not exist, ignore
    }
  }

  // ===========================================================================
  // 5. Destroy Cloudflare Pages (apps/web)
  // ===========================================================================
  if (destroyAll || isWebOnly) {
    console.log('\n🧹 [4/4] Destroying Cloudflare Pages (apps/web)...');
    const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'my-ip-info';
    try {
      console.log(`   Deleting Cloudflare Pages project '${projectName}'...`);
      const output = runCmd(`npx wrangler pages project delete ${projectName} --yes`, {
        cwd: rootDir,
      });
      console.log(output);
      console.log(`✅ Cloudflare Pages project '${projectName}' deleted.`);
    } catch (err) {
      console.warn(`⚠️ Could not delete Cloudflare Pages project '${projectName}' (it may not exist).`);
      if (err.stdout) console.log(err.stdout);
    }
  }

  // ===========================================================================
  // 5. Synchronize apps/web/.env.local
  // ===========================================================================
  console.log('\n🔄 Updating Web frontend configuration...');
  const envLines = [
    '# Auto-generated by destroy-and-sync.mjs',
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
  console.log('\nCurrent configuration after teardown:');
  console.table(endpoints);
  console.log('🎉 Teardown complete!\n');
}

main().catch((err) => {
  console.error('Fatal error during teardown:', err);
  process.exit(1);
});
