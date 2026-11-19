export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }
  const { ensureSchema } = await import('@/lib/db');
  void ensureSchema().catch((err) => {
    console.error('[instrumentation] ensureSchema failed:', err);
  });
  const { startHerokuCardScheduler } = await import('@/lib/herokuCardScheduler');
  startHerokuCardScheduler();
}
