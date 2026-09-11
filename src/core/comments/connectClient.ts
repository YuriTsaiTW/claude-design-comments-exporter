import type { RawListCommentsResponse } from './types';

export const DESIGN_ORIGIN = 'https://claude.ai';
export const LIST_COMMENTS_URL = `${DESIGN_ORIGIN}/design/anthropic.omelette.api.v1alpha.OmeletteService/ListComments`;

export type FetchLike = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

/** Connect 協定的錯誤回應：{ code, message }。 */
export class ConnectError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(`ListComments 失敗（${code}）：${message}`);
    this.name = 'ConnectError';
  }
}

async function readError(response: Response): Promise<ConnectError> {
  const text = await response.text();

  try {
    const parsed: unknown = JSON.parse(text);

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { code?: unknown }).code === 'string'
    ) {
      const { code, message } = parsed as { code: string; message?: unknown };

      return new ConnectError(
        code,
        typeof message === 'string' ? message : '',
        response.status
      );
    }
  } catch {
    // 非 JSON，下面用 HTTP 狀態組錯誤
  }

  return new ConnectError(
    `http_${response.status}`,
    text.slice(0, 200),
    response.status
  );
}

/**
 * 以 Connect JSON 編碼呼叫 OmeletteService.ListComments。
 * 認證靠瀏覽器既有的 claude.ai session cookie（credentials: 'include'）。
 */
export async function listComments(
  projectId: string,
  fetchImpl: FetchLike
): Promise<RawListCommentsResponse> {
  const response = await fetchImpl(LIST_COMMENTS_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'connect-protocol-version': '1',
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    throw await readError(response);
  }

  const text = await response.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConnectError('invalid_json', text.slice(0, 200), response.status);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ConnectError('invalid_shape', '回應不是物件', response.status);
  }

  return parsed as RawListCommentsResponse;
}
