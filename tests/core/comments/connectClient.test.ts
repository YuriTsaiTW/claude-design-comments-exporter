import { describe, expect, it, vi } from 'vitest';

import {
  ConnectError,
  LIST_COMMENTS_URL,
  listComments,
} from '@core/comments/connectClient';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('listComments', () => {
  it('以 Connect JSON 編碼 POST，帶 cookie', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ comments: [{ commentId: 'c1' }] })
    );
    const result = await listComments('p1', fetchImpl);

    expect(result).toEqual({ comments: [{ commentId: 'c1' }] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe(LIST_COMMENTS_URL);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.headers).toEqual({
      'content-type': 'application/json',
      'connect-protocol-version': '1',
    });
    expect(init.body).toBe('{"projectId":"p1"}');
  });

  it('Connect 錯誤回應轉成 ConnectError', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ code: 'not_found', message: 'project not found' }, 404)
    );

    await expect(listComments('bogus', fetchImpl)).rejects.toMatchObject({
      name: 'ConnectError',
      code: 'not_found',
      httpStatus: 404,
    });
  });

  it('非 JSON 的錯誤回應以 HTTP 狀態組錯誤', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('Not Found\n', { status: 404 })
    );

    await expect(listComments('bogus', fetchImpl)).rejects.toMatchObject({
      code: 'http_404',
      httpStatus: 404,
    });
  });

  it('成功但非 JSON 或非物件視為失敗', async () => {
    await expect(
      listComments(
        'p',
        vi.fn(async () => new Response('<html>', { status: 200 }))
      )
    ).rejects.toBeInstanceOf(ConnectError);
    await expect(
      listComments(
        'p',
        vi.fn(async () => jsonResponse([1, 2]))
      )
    ).rejects.toMatchObject({ code: 'invalid_shape' });
  });
});
