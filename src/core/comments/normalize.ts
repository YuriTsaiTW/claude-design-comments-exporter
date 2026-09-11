import type { Comment, Reply } from './types';

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeReply(raw: unknown): Reply | null {
  if (!isRecord(raw)) {
    return null;
  }

  const replyId = str(raw['replyId']);

  if (!replyId) {
    return null;
  }

  return {
    replyId,
    author: str(raw['authorDisplayName']) ?? '',
    authorAccountUuid: str(raw['authorAccountUuid']),
    body: typeof raw['body'] === 'string' ? raw['body'] : '',
    createdAt: str(raw['createdAt']) ?? '',
  };
}

/**
 * 把 Connect JSON 的留言物件轉成 Comment。
 * 缺 commentId 或 filePath 視為壞資料回 null，由呼叫端過濾。
 * proto3 JSON 會省略預設值，所以缺欄位一律補 null／空字串。
 */
export function normalizeComment(raw: unknown): Comment | null {
  if (!isRecord(raw)) {
    return null;
  }

  const commentId = str(raw['commentId']);
  const filePath = str(raw['filePath']);

  if (!commentId || !filePath) {
    return null;
  }

  const replies = Array.isArray(raw['replies'])
    ? raw['replies'].map(normalizeReply).filter((r): r is Reply => r !== null)
    : [];

  return {
    commentId,
    projectId: str(raw['projectId']),
    filePath,
    elementSelector: str(raw['elementSelector']),
    elementDescriptor:
      typeof raw['elementDescriptor'] === 'string'
        ? raw['elementDescriptor']
        : '',
    pinX: num(raw['pinX']),
    pinY: num(raw['pinY']),
    body: typeof raw['body'] === 'string' ? raw['body'] : '',
    author: str(raw['authorDisplayName']) ?? '',
    authorAccountUuid: str(raw['authorAccountUuid']),
    createdAt: str(raw['createdAt']) ?? '',
    resolvedAt: str(raw['resolvedAt']),
    replies,
    anchored: false,
    candidates: [],
  };
}
