import { getDuelRoomDb } from '@/lib/dbActions';
import { isShortRoomCode, normalizeRoomCode } from '@/lib/duelStore';

export interface DuelInviteSnapshot {
  code: string;
  hostName: string;
  questionCount: number;
}

export async function loadDuelInvite(rawCode: string): Promise<DuelInviteSnapshot | null> {
  if (!isShortRoomCode(rawCode)) return null;
  const code = normalizeRoomCode(rawCode);
  try {
    const found = await getDuelRoomDb(code);
    if (!found) {
      return { code, hostName: '', questionCount: 0 };
    }
    const host = found.room.players.find((player) => player.id === found.room.hostId);
    const hostName = (host?.name || found.room.players[0]?.name || '').trim().slice(0, 24);
    return {
      code,
      hostName,
      questionCount: found.room.questionCount,
    };
  } catch {
    return { code, hostName: '', questionCount: 0 };
  }
}
