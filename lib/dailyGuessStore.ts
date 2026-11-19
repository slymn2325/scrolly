import { computeDailyGuessPercentile, getDailyGuessNumber } from '@/lib/dailyGuess';
import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import { isValidDeviceId } from '@/lib/dbActions';
import { sanitizeDisplayText } from '@/lib/originPolicy';

export interface DailyGuessAttemptSummary {
  accuracyPct: number;
  topPct: number;
}

export interface DailyGuessStatsResult {
  date: string;
  puzzleNumber: number;
  totalParticipants: number;
  attempt: DailyGuessAttemptSummary | null;
}

interface MemoryDailyGuessRow {
  guessDate: string;
  factId: string;
  deviceId: string;
  accuracyPct: number;
}

declare global {
  var __scrollyMemoryDailyGuesses: Map<string, Map<string, MemoryDailyGuessRow>> | undefined;
}

function getMemoryDailyGuessMap(): Map<string, Map<string, MemoryDailyGuessRow>> {
  if (!globalThis.__scrollyMemoryDailyGuesses) {
    globalThis.__scrollyMemoryDailyGuesses = new Map();
  }
  return globalThis.__scrollyMemoryDailyGuesses;
}

export async function getDailyGuessStats(params: {
  date: string;
  deviceId?: string | null;
}): Promise<DailyGuessStatsResult> {
  const cleanDate = params.date.trim();
  const puzzleNumber = getDailyGuessNumber(cleanDate);
  const cleanDevice = isValidDeviceId(params.deviceId) ? params.deviceId!.trim().slice(0, 128) : null;

  if (!hasDatabaseUrl()) {
    const dateMap = getMemoryDailyGuessMap().get(cleanDate);
    const accuracies = dateMap ? Array.from(dateMap.values()).map((r) => r.accuracyPct) : [];
    const existing = cleanDevice && dateMap ? dateMap.get(cleanDevice) ?? null : null;
    return {
      date: cleanDate,
      puzzleNumber,
      totalParticipants: accuracies.length,
      attempt: existing
        ? {
            accuracyPct: existing.accuracyPct,
            topPct: computeDailyGuessPercentile(existing.accuracyPct, accuracies),
          }
        : null,
    };
  }

  await ensureSchema();
  const pool = getPool();
  const res = await pool.query<{ device_id: string; accuracy_pct: number }>(
    `SELECT device_id, accuracy_pct
     FROM daily_guess_attempts
     WHERE guess_date = $1`,
    [cleanDate]
  );

  const accuracies = res.rows.map((r) => Math.max(0, Math.min(100, Number(r.accuracy_pct) || 0)));
  const mine = cleanDevice ? res.rows.find((r) => r.device_id === cleanDevice) ?? null : null;
  const myAcc = mine ? Math.max(0, Math.min(100, Number(mine.accuracy_pct) || 0)) : null;

  return {
    date: cleanDate,
    puzzleNumber,
    totalParticipants: res.rows.length,
    attempt:
      myAcc !== null
        ? {
            accuracyPct: myAcc,
            topPct: computeDailyGuessPercentile(myAcc, accuracies),
          }
        : null,
  };
}

export async function submitDailyGuessAttempt(params: {
  date: string;
  factId: string;
  deviceId: string;
  accuracyPct: number;
}): Promise<DailyGuessStatsResult & { accuracyPct: number; topPct: number }> {
  const cleanDate = params.date.trim();
  const puzzleNumber = getDailyGuessNumber(cleanDate);
  const cleanFactId = sanitizeDisplayText(params.factId, 120);
  const cleanDevice = params.deviceId.trim().slice(0, 128);
  const accuracyPct = Math.max(0, Math.min(100, Math.round(params.accuracyPct)));

  if (!hasDatabaseUrl()) {
    const allDates = getMemoryDailyGuessMap();
    let dateMap = allDates.get(cleanDate);
    if (!dateMap) {
      dateMap = new Map();
      allDates.set(cleanDate, dateMap);
    }
    const existing = dateMap.get(cleanDevice);
    if (!existing) {
      dateMap.set(cleanDevice, {
        guessDate: cleanDate,
        factId: cleanFactId,
        deviceId: cleanDevice,
        accuracyPct,
      });
    }
    const finalAcc = existing ? existing.accuracyPct : accuracyPct;
    const accuracies = Array.from(dateMap.values()).map((r) => r.accuracyPct);
    const topPct = computeDailyGuessPercentile(finalAcc, accuracies);
    return {
      date: cleanDate,
      puzzleNumber,
      accuracyPct: finalAcc,
      topPct,
      totalParticipants: accuracies.length,
      attempt: { accuracyPct: finalAcc, topPct },
    };
  }

  await ensureSchema();
  const pool = getPool();
  await pool.query(
    `INSERT INTO daily_guess_attempts (guess_date, fact_id, device_id, accuracy_pct)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guess_date, device_id) DO NOTHING`,
    [cleanDate, cleanFactId, cleanDevice, accuracyPct]
  );

  const stats = await getDailyGuessStats({ date: cleanDate, deviceId: cleanDevice });
  const resolvedAcc = stats.attempt?.accuracyPct ?? accuracyPct;
  const resolvedTop = stats.attempt?.topPct ?? computeDailyGuessPercentile(resolvedAcc, []);

  return {
    ...stats,
    accuracyPct: resolvedAcc,
    topPct: resolvedTop,
    attempt: { accuracyPct: resolvedAcc, topPct: resolvedTop },
  };
}
