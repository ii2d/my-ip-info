import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildIndexNowPayload,
  DEFAULT_INDEXNOW_HOST,
  DEFAULT_INDEXNOW_KEY,
  INDEXNOW_ENDPOINT,
  parseSitemapUrls,
  submitIndexNow,
} from '../src/shared/indexnow';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    dryRun: boolean;
    continueOnError: boolean;
    host?: string;
    key?: string;
    sitemapPath?: string;
    endpoint?: string;
  } = {
    dryRun: false,
    continueOnError: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--continue-on-error') {
      options.continueOnError = true;
    } else if (arg === '--host' && i + 1 < args.length) {
      options.host = args[++i];
    } else if (arg === '--key' && i + 1 < args.length) {
      options.key = args[++i];
    } else if (arg === '--sitemap' && i + 1 < args.length) {
      options.sitemapPath = args[++i];
    } else if (arg === '--endpoint' && i + 1 < args.length) {
      options.endpoint = args[++i];
    }
  }

  return options;
}

export async function runIndexNowCli(): Promise<void> {
  const cliArgs = parseArgs();
  const host = cliArgs.host || process.env.INDEXNOW_HOST || DEFAULT_INDEXNOW_HOST;
  const key = cliArgs.key || process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  const endpoint = cliArgs.endpoint || process.env.INDEXNOW_ENDPOINT || INDEXNOW_ENDPOINT;
  const sitemapPath = resolve(cliArgs.sitemapPath || 'public/sitemap.xml');

  console.log(`[IndexNow] Preparing URL notification for host: ${host}`);

  // Verify key file presence
  const keyFilePath = resolve(`public/${key}.txt`);
  if (existsSync(keyFilePath)) {
    const fileKey = readFileSync(keyFilePath, 'utf-8').trim();
    if (fileKey !== key) {
      console.warn(
        `[IndexNow Warning] Key file at ${keyFilePath} contains "${fileKey}", but expected "${key}".`
      );
    } else {
      console.log(`[IndexNow] Found matching verification key file at public/${key}.txt`);
    }
  } else {
    console.warn(`[IndexNow Warning] Verification file public/${key}.txt not found locally.`);
  }

  // Extract URLs
  let urls: string[] = [];
  if (existsSync(sitemapPath)) {
    try {
      const sitemapContent = readFileSync(sitemapPath, 'utf-8');
      const allUrls = parseSitemapUrls(sitemapContent);
      urls = allUrls.filter((u) => {
        try {
          return new URL(u).hostname.toLowerCase() === host.toLowerCase();
        } catch {
          return false;
        }
      });
      console.log(`[IndexNow] Parsed ${urls.length} URLs from ${sitemapPath} matching ${host}`);
    } catch (err) {
      console.warn(`[IndexNow] Could not parse sitemap at ${sitemapPath}: ${err}`);
    }
  }

  // Fallback if sitemap missing or no matching URLs
  if (urls.length === 0) {
    urls = [`https://${host}/`, `https://${host}/llms.txt`, `https://${host}/llms-full.txt`];
    console.log(`[IndexNow] Using fallback canonical URLs (${urls.length} endpoints)`);
  }

  const payload = buildIndexNowPayload({
    host,
    key,
    urls,
  });

  if (cliArgs.dryRun) {
    console.log('[IndexNow Dry Run] Payload ready for submission:');
    console.log(JSON.stringify(payload, null, 2));
    console.log(`[IndexNow Dry Run] Target endpoint: ${endpoint}`);
    console.log('[IndexNow Dry Run] Completed successfully (no network requests made).');
    return;
  }

  console.log(`[IndexNow] Submitting ${payload.urlList.length} URLs to ${endpoint}...`);
  const result = await submitIndexNow({
    host,
    key,
    urls,
    endpoint,
  });

  if (result.ok) {
    console.log(`[IndexNow Success] ${result.message} (HTTP ${result.status})`);
    console.log(`[IndexNow] Submitted ${result.urlCount} URLs to ${result.endpoint}`);
  } else {
    console.error(`[IndexNow Error] ${result.message} (HTTP ${result.status})`);
    if (cliArgs.continueOnError) {
      console.warn('[IndexNow] --continue-on-error is enabled. Exiting with status 0.');
      return;
    }
    process.exit(1);
  }
}

// Run CLI directly if executed from command line
if (process.argv[1]?.endsWith('submit-indexnow.ts')) {
  runIndexNowCli().catch((err) => {
    console.error('[IndexNow Fatal Error]', err);
    process.exit(1);
  });
}
