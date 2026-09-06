import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pulumi from '@pulumi/pulumi';
import * as cloudflare from '@pulumi/cloudflare';
import * as dotenv from 'dotenv';

// Determine directory path in both CommonJS and ESM environments
const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url));

// -----------------------------------------------------------------------------
// Load environment variables (supports monorepo root and local directory)
// -----------------------------------------------------------------------------
dotenv.config({ path: path.resolve(currentDir, '../.env') });
dotenv.config({ path: path.resolve(currentDir, '../.env.local') });
dotenv.config({ path: path.resolve(currentDir, '.env') });

// -----------------------------------------------------------------------------
// Configuration parameters read purely from environment variables
// -----------------------------------------------------------------------------
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_PAGES_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const customDomain = process.env.CLOUDFLARE_PAGES_DOMAIN;
const projectName = process.env.CLOUDFLARE_PAGES_PROJECT_NAME || 'my-ip-info';
const cnameTarget = process.env.CLOUDFLARE_PAGES_CNAME_TARGET || `${projectName}.pages.dev`;

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Environment variable validation
// -----------------------------------------------------------------------------
const managePagesDomain = process.env.CLOUDFLARE_MANAGE_PAGES_DOMAIN === 'true';

const missingVars: string[] = [];
if (!apiToken) missingVars.push('CLOUDFLARE_API_TOKEN');
if (!zoneId) missingVars.push('CLOUDFLARE_ZONE_ID');
if (!customDomain) missingVars.push('CLOUDFLARE_PAGES_DOMAIN');
if (managePagesDomain && !accountId) {
  missingVars.push('CLOUDFLARE_ACCOUNT_ID (required when CLOUDFLARE_MANAGE_PAGES_DOMAIN=true)');
}

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variable(s):\n  - ${missingVars.join('\n  - ')}\n\n` +
    `Please configure these in your .env file or export them before running Pulumi.\n` +
    `Refer to .env.example for configuration details.`
  );
}

// -----------------------------------------------------------------------------
// Explicit Cloudflare Provider configured with credentials from dotenv
// -----------------------------------------------------------------------------
const provider = new cloudflare.Provider('cf-provider', {
  apiToken,
});

// -----------------------------------------------------------------------------
// 1. (Optional) Register custom domain on Cloudflare Pages project
// -----------------------------------------------------------------------------
let pagesDomain: cloudflare.PagesDomain | undefined;
if (managePagesDomain) {
  pagesDomain = new cloudflare.PagesDomain('pages-domain', {
    accountId: accountId!,
    projectName,
    name: customDomain!,
  }, { provider });
}

// -----------------------------------------------------------------------------
// 2. Create proxied CNAME DNS record in Cloudflare zone
// -----------------------------------------------------------------------------
const dnsRecord = new cloudflare.DnsRecord('pages-cname', {
  zoneId: zoneId!,
  name: customDomain!,
  type: 'CNAME',
  content: cnameTarget,
  proxied: true,
  ttl: 1, // Automatic TTL when proxied
  comment: `Managed by Pulumi for Pages project ${projectName}`,
}, {
  provider,
  dependsOn: pagesDomain ? [pagesDomain] : [],
});

// -----------------------------------------------------------------------------
// Stack outputs
// -----------------------------------------------------------------------------
export const domain = customDomain;
export const target = cnameTarget;
export const project = projectName;
export const dnsRecordId = dnsRecord.id;
export const pagesDomainManaged = managePagesDomain;
export const pagesDomainStatus = pagesDomain ? pagesDomain.status : 'externally-managed';
