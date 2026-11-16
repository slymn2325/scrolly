/**
 * Heroku Scheduler entry for Scrolly fact/GIF generation.
 *
 * Usage (Scheduler):
 *   npm run generate-facts
 *
 * Env (required in production):
 *   DATABASE_URL, GEMINI_API_KEY (or AI_API_KEY), GIPHY_API_KEY
 *
 * Optional:
 *   TARGET_CARDS_PER_RUN (default 6 for this entry), TENOR_API_KEY,
 *   AI_MODEL_NAME, AI_MODELS_ENDPOINT, DATABASE_CA_CERT
 *
 * Flags:
 *   --dry-run   Offline schema/prompt verification (no Gemini/Giphy/Postgres writes)
 *   --count=N   Override card cap for this run
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEDULER_DEFAULT_CARDS = 6;

function applySchedulerDefaults() {
  const existing = String(process.env.TARGET_CARDS_PER_RUN || '').trim();
  if (!existing) {
    process.env.TARGET_CARDS_PER_RUN = String(SCHEDULER_DEFAULT_CARDS);
  }
}

async function run() {
  const startedAt = new Date().toISOString();
  applySchedulerDefaults();

  const target = process.env.TARGET_CARDS_PER_RUN;
  const dryRun = process.argv.includes('--dry-run');

  console.log(`[generate-facts] start at ${startedAt}`);
  console.log(
    `[generate-facts] mode=${dryRun ? 'dry-run' : 'production'} TARGET_CARDS_PER_RUN=${target} (scheduler default=${SCHEDULER_DEFAULT_CARDS})`
  );
  console.log(
    `[generate-facts] env check: DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'missing'} GEMINI/AI key=${
      process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY ? 'set' : 'missing'
    } GIPHY_API_KEY=${process.env.GIPHY_API_KEY ? 'set' : 'missing'}`
  );

  const moduleUrl = pathToFileURL(path.join(__dirname, 'generateFacts.mjs')).href;
  const { main, resolveTargetCardsPerRun } = await import(moduleUrl);

  const resolvedTarget = resolveTargetCardsPerRun();
  console.log(`[generate-facts] resolved card cap=${resolvedTarget}`);

  await main();

  console.log(`[generate-facts] finish ok at ${new Date().toISOString()}`);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[generate-facts] Fatal error:', err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
  });
