#!/usr/bin/env node

/**
 * deploy-and-sync.mjs
 * 
 * Orchestrates multi-cloud serverless deployments (Cloudflare Workers, Firebase Functions,
 * AWS Lambda) and synchronizes assigned endpoint URLs directly into apps/web/.env.local.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const webEnvPath = path.resolve(rootDir, 'apps', 'web', '.env.local');

const isSyncOnly = process.argv.includes('--sync-only');
const isCloudflareOnly = process.argv.includes('--cloudflare-only');
const isFirebaseOnly = process.argv.includes('--firebase-only');
const isLambdaOnly = process.argv.includes('--lambda-only');

const runAll = !isSyncOnly && !isCloudflareOnly && !isFirebaseOnly && !isLambdaOnly;

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
  } catch (err) {
    // Ignore file reading errors
  }
}

const loadedEnvFiles = loadEnvFiles();

console.log('🚀 my-ip-info Multi-Cloud Deployment & Endpoint Sync Utility');
console.log('─'.repeat(65));

if (loadedEnvFiles.length > 0) {
  console.log(`📁 Loaded environment file(s): ${loadedEnvFiles.join(', ')}`);
} else {
  console.log('ℹ️  No root .env or .env.local found. Using system environment variables.');
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

// Helper to run commands with inherited env
function runCmd(cmd, options = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    env: process.env,
    ...options,
  });
}

// =============================================================================
// 2. Deploy Cloudflare Worker (apps/server-cloudflare)
// =============================================================================
if (runAll || isCloudflareOnly) {
  console.log('\n📦 [1/3] Deploying Cloudflare Worker (apps/server-cloudflare)...');

  if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.log('   ℹ️  CLOUDFLARE_ACCOUNT_ID is not set in .env.');
    console.log('      If you have multiple Cloudflare accounts, set it in .env to prevent prompts.');
    console.log('      Run `npx wrangler whoami` to list your accounts.\n');
  }

  try {
    const cfDir = path.resolve(rootDir, 'apps', 'server-cloudflare');
    const workerName = process.env.CLOUDFLARE_WORKER_NAME || 'my-ip-info';
    console.log(`   Deploying Worker under name: '${workerName}'...`);
    const output = runCmd(`npx wrangler deploy --name ${workerName}`, { cwd: cfDir });
    console.log(output);

    const match = output.match(/https:\/\/[a-zA-Z0-9-_\.]+\.workers\.dev/);
    if (match) {
      endpoints.VITE_CLOUDFLARE_URL = match[0];
      console.log(`✅ Cloudflare Worker URL: ${endpoints.VITE_CLOUDFLARE_URL}`);
    }
  } catch (err) {
    console.warn('⚠️ Cloudflare deployment failed or was cancelled.');
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.warn('👉 Action needed: Check your Cloudflare credentials (`npx wrangler login`) or account ID in .env.\n');
  }
}

// =============================================================================
// 3. Deploy Firebase Functions (apps/server-firebase)
// =============================================================================
if (runAll || isFirebaseOnly) {
  console.log('\n📦 [2/3] Deploying Firebase Function (apps/server-firebase)...');
  const fbDir = path.resolve(rootDir, 'apps', 'server-firebase');
  const fbRcPath = path.resolve(fbDir, '.firebaserc');

  const firebaseProject = process.env.FIREBASE_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const hasFirebaseRc = fs.existsSync(fbRcPath);

  if (!firebaseProject && !hasFirebaseRc) {
    console.warn('⚠️  Firebase deployment skipped: Missing Firebase Project configuration.');
    console.warn('   ─────────────────────────────────────────────────────────────');
    console.warn('   To deploy Firebase Functions:');
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
      const output = runCmd(deployCommand, { cwd: fbDir });
      console.log(output);

      const match = output.match(/https:\/\/[a-zA-Z0-9-_\.]+\.cloudfunctions\.net\/api/);
      if (match) {
        endpoints.VITE_FIREBASE_URL = match[0];
        console.log(`✅ Firebase Function URL: ${endpoints.VITE_FIREBASE_URL}`);
      }
    } catch (err) {
      console.warn('⚠️ Firebase deployment failed.');
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      console.warn('👉 Action needed:');
      console.warn('   - Ensure you are logged in via: npx firebase-tools login');
      console.warn('   - Verify FIREBASE_PROJECT in .env exists and billing (Blaze plan) is active.\n');
    }
  }
}

// =============================================================================
// 4. Deploy AWS Lambda (apps/server-lambda)
// =============================================================================
if (runAll || isLambdaOnly) {
  console.log('\n📦 [3/3] Deploying AWS Lambda (apps/server-lambda)...');

  const lambdaDir = path.resolve(rootDir, 'apps', 'server-lambda');
  const distDir = path.resolve(lambdaDir, 'dist');
  const zipPath = path.resolve(distDir, 'function.zip');

  const profile = process.env.AWS_PROFILE ? `--profile ${process.env.AWS_PROFILE}` : '';
  const region = process.env.AWS_REGION || 'us-east-1';
  const regionFlag = `--region ${region}`;
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'my-ip-info';

  // Check if AWS CLI is installed
  let awsCliInstalled = false;
  try {
    runCmd('aws --version', { stdio: 'pipe' });
    awsCliInstalled = true;
  } catch {
    console.warn('⚠️  AWS CLI is not installed or not in PATH.');
    console.warn('   Install AWS CLI from https://aws.amazon.com/cli/ or deploy via Pulumi/CDK.\n');
  }

  if (awsCliInstalled) {
    try {
      // 1. Build lambda bundle
      console.log('   Building Lambda bundle (tsup)...');
      runCmd('pnpm build', { cwd: lambdaDir, stdio: 'pipe' });

      // 2. Package function.zip
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      runCmd('zip -q function.zip index.js', { cwd: distDir });

      // 3. Check if function exists
      let functionExists = false;
      try {
        runCmd(`aws lambda get-function --function-name ${functionName} ${profile} ${regionFlag}`, { stdio: 'pipe' });
        functionExists = true;
      } catch {
        functionExists = false;
      }

      if (functionExists) {
        console.log(`   Updating existing function code for '${functionName}'...`);
        runCmd(
          `aws lambda update-function-code --function-name ${functionName} --zip-file fileb://${zipPath} ${profile} ${regionFlag}`,
          { stdio: 'pipe' }
        );
      } else {
        console.log(`   Creating new Lambda function '${functionName}'...`);
        // Find or create execution role
        const callerInfo = JSON.parse(runCmd(`aws sts get-caller-identity ${profile} ${regionFlag}`, { stdio: 'pipe' }));
        const roleArn = process.env.AWS_LAMBDA_ROLE_ARN || `arn:aws:iam::${callerInfo.Account}:role/my-ip-info-lambda-role`;

        runCmd(
          `aws lambda create-function --function-name ${functionName} --runtime nodejs20.x --role ${roleArn} --handler index.handler --zip-file fileb://${zipPath} --timeout 10 --memory-size 256 ${profile} ${regionFlag}`,
          { stdio: 'pipe' }
        );

        runCmd(`aws lambda wait function-active-v2 --function-name ${functionName} ${profile} ${regionFlag}`, { stdio: 'pipe' });

        console.log('   Enabling public Lambda Function URL...');
        runCmd(
          `aws lambda create-function-url-config --function-name ${functionName} --auth-type NONE --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"]}' ${profile} ${regionFlag}`,
          { stdio: 'pipe' }
        );

        // Add public invoke permissions
        try {
          runCmd(
            `aws lambda add-permission --function-name ${functionName} --statement-id FunctionURLAllowPublicAccess --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE ${profile} ${regionFlag}`,
            { stdio: 'pipe' }
          );
        } catch {}

        try {
          runCmd(
            `aws lambda add-permission --function-name ${functionName} --statement-id AllowPublicInvoke --action lambda:InvokeFunction --principal "*" ${profile} ${regionFlag}`,
            { stdio: 'pipe' }
          );
        } catch {}
      }

      // 4. Query the Function URL
      const urlConfigRaw = runCmd(
        `aws lambda get-function-url-config --function-name ${functionName} ${profile} ${regionFlag}`,
        { stdio: 'pipe' }
      );
      const urlConfig = JSON.parse(urlConfigRaw);

      if (urlConfig.FunctionUrl) {
        endpoints.VITE_LAMBDA_URL = urlConfig.FunctionUrl.replace(/\/$/, '');
        console.log(`✅ AWS Lambda Function URL: ${endpoints.VITE_LAMBDA_URL}`);
      }
    } catch (err) {
      console.warn('⚠️ AWS Lambda deployment failed.');
      if (err.stdout) console.log(err.stdout);
      if (err.stderr) console.error(err.stderr);
      console.warn('👉 Action needed: Check AWS_PROFILE, AWS_REGION, or IAM permissions in your .env file.\n');
    }
  }
}

// =============================================================================
// 5. Synchronize Endpoints into apps/web/.env.local
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
