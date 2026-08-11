import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'
import { getCookie } from '@/utils/cookie'
import {
  REFRESH_CSRF_HEADER_NAME,
  __resetRefreshFlightForTests,
  executeRefreshRequest,
  refreshSessionAccessToken,
} from '@/services/sessionRefresh'
import {
  getAccessToken,
  invalidateAccessToken,
  onAccessTokenInvalidated,
  setAccessToken,
} from '@/services/authToken'
import { api, ApiError } from '@/services/api'

function successEnvelope<T>(data: T) {
  return JSON.stringify({ status: 'success', message: 'ok', data })
}

describe('getCookie', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    globalThis.document = undefined
  })

  it('returns null when document is unavailable', () => {
    // @ts-expect-error test env
    globalThis.document = undefined
    assert.equal(getCookie('csrf_refresh_token'), null)
  })

  it('returns null for empty cookie string', () => {
    // @ts-expect-error test stub
    globalThis.document = { cookie: '' }
    assert.equal(getCookie('csrf_refresh_token'), null)
  })

  it('reads csrf_refresh_token among multiple cookies', () => {
    // @ts-expect-error test stub
    globalThis.document = {
      cookie: 'a=1; csrf_refresh_token=token-value; b=2',
    }
    assert.equal(getCookie('csrf_refresh_token'), 'token-value')
  })

  it('decodes percent-encoded cookie values', () => {
    // @ts-expect-error test stub
    globalThis.document = {
      cookie: 'csrf_refresh_token=hello%20world%2Fpath',
    }
    assert.equal(getCookie('csrf_refresh_token'), 'hello world/path')
  })

  it('trims whitespace around cookie pairs', () => {
    // @ts-expect-error test stub
    globalThis.document = {
      cookie: '  csrf_refresh_token = spaced-value ; other=1 ',
    }
    assert.equal(getCookie('csrf_refresh_token'), 'spaced-value')
  })

  it('returns null when the named cookie is missing', () => {
    // @ts-expect-error test stub
    globalThis.document = { cookie: 'other=1; also=2' }
    assert.equal(getCookie('csrf_refresh_token'), null)
  })
})

describe('CSRF-aware refresh', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    __resetRefreshFlightForTests()
    setAccessToken(null)
    // @ts-expect-error test stub
    globalThis.document = { cookie: '' }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __resetRefreshFlightForTests()
    setAccessToken(null)
    // @ts-expect-error test cleanup
    globalThis.document = undefined
  })

  it('sends X-CSRF-TOKEN when csrf_refresh_token is present', async () => {
    // @ts-expect-error test stub
    globalThis.document = { cookie: 'csrf_refresh_token=csrf-abc' }

    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = mock.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          successEnvelope({ access_token: 'new-access' }),
      } as Response
    }) as typeof fetch

    const result = await executeRefreshRequest()
    assert.equal(result.access_token, 'new-access')
    assert.equal(getAccessToken(), 'new-access')
    assert.equal(calls.length, 1)
    assert.match(calls[0].url, /\/auth\/refresh$/)
    assert.equal(calls[0].init?.credentials, 'include')
    const headers = calls[0].init?.headers as Record<string, string>
    assert.equal(headers[REFRESH_CSRF_HEADER_NAME], 'csrf-abc')
  })

  it('omits X-CSRF-TOKEN when the CSRF cookie is absent (development)', async () => {
    // @ts-expect-error test stub
    globalThis.document = { cookie: 'unrelated=1' }

    let headers: Record<string, string> = {}
    globalThis.fetch = mock.fn(async (_url: string | URL, init?: RequestInit) => {
      headers = init?.headers as Record<string, string>
      assert.equal(init?.credentials, 'include')
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          successEnvelope({ access_token: 'dev-access' }),
      } as Response
    }) as typeof fetch

    await executeRefreshRequest()
    assert.equal(headers[REFRESH_CSRF_HEADER_NAME], undefined)
    assert.equal(getAccessToken(), 'dev-access')
  })

  it('rereads the CSRF cookie on every refresh', async () => {
    const seen: string[] = []
    globalThis.fetch = mock.fn(async (_url: string | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>
      seen.push(headers[REFRESH_CSRF_HEADER_NAME])
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          successEnvelope({ access_token: `token-${seen.length}` }),
      } as Response
    }) as typeof fetch

    // @ts-expect-error test stub
    globalThis.document = { cookie: 'csrf_refresh_token=value-A' }
    await executeRefreshRequest()

    // @ts-expect-error test stub
    globalThis.document = { cookie: 'csrf_refresh_token=value-B' }
    await executeRefreshRequest()

    assert.deepEqual(seen, ['value-A', 'value-B'])
  })
})

describe('401 recovery and single-flight refresh', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    __resetRefreshFlightForTests()
    setAccessToken('expired-token')
    // @ts-expect-error test stub
    globalThis.document = { cookie: 'csrf_refresh_token=csrf-xyz' }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __resetRefreshFlightForTests()
    setAccessToken(null)
    // @ts-expect-error test cleanup
    globalThis.document = undefined
  })

  it('refreshes once then retries the original request with the new Bearer token', async () => {
    const authHeaders: string[] = []
    let resourceCalls = 0
    let refreshCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      const headers = init?.headers as Record<string, string>

      if (href.includes('/auth/refresh')) {
        refreshCalls += 1
        assert.equal(headers[REFRESH_CSRF_HEADER_NAME], 'csrf-xyz')
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            successEnvelope({ access_token: 'fresh-token' }),
        } as Response
      }

      resourceCalls += 1
      authHeaders.push(headers.Authorization ?? '')
      if (resourceCalls === 1) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () =>
            JSON.stringify({ status: 'error', message: 'Token expired' }),
        } as Response
      }

      assert.equal(headers.Authorization, 'Bearer fresh-token')
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => successEnvelope({ ok: true }),
      } as Response
    }) as typeof fetch

    const result = await api.get<{ ok: boolean }>('/resources/1')
    assert.deepEqual(result, { ok: true })
    assert.equal(refreshCalls, 1)
    assert.equal(resourceCalls, 2)
    assert.deepEqual(authHeaders, [
      'Bearer expired-token',
      'Bearer fresh-token',
    ])
    assert.equal(getAccessToken(), 'fresh-token')
  })

  it('does not refresh a second time when the retry still returns 401', async () => {
    let refreshCalls = 0
    let resourceCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL) => {
      const href = String(url)
      if (href.includes('/auth/refresh')) {
        refreshCalls += 1
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            successEnvelope({ access_token: 'fresh-token' }),
        } as Response
      }

      resourceCalls += 1
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({ status: 'error', message: 'Still unauthorized' }),
      } as Response
    }) as typeof fetch

    await assert.rejects(
      () => api.get('/resources/1'),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 401 &&
        error.message === 'Still unauthorized',
    )
    assert.equal(refreshCalls, 1)
    assert.equal(resourceCalls, 2)
  })

  it('propagates refresh failure and invalidates the access token', async () => {
    let invalidated = false
    const unsubscribe = onAccessTokenInvalidated(() => {
      invalidated = true
    })

    globalThis.fetch = mock.fn(async (url: string | URL) => {
      const href = String(url)
      if (href.includes('/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () =>
            JSON.stringify({
              status: 'error',
              message: 'Missing CSRF token',
            }),
        } as Response
      }

      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({ status: 'error', message: 'Token expired' }),
      } as Response
    }) as typeof fetch

    await assert.rejects(
      () => api.get('/dashboard/stats'),
      (error: unknown) =>
        error instanceof ApiError && error.message === 'Missing CSRF token',
    )
    assert.equal(getAccessToken(), null)
    assert.equal(invalidated, true)
    unsubscribe()
  })

  it('coordinates concurrent 401s through a single refresh', async () => {
    let refreshCalls = 0
    let resourceCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      const headers = init?.headers as Record<string, string>

      if (href.includes('/auth/refresh')) {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            successEnvelope({ access_token: 'shared-token' }),
        } as Response
      }

      resourceCalls += 1
      if (headers.Authorization === 'Bearer expired-token') {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () =>
            JSON.stringify({ status: 'error', message: 'Token expired' }),
        } as Response
      }

      assert.equal(headers.Authorization, 'Bearer shared-token')
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => successEnvelope({ id: href }),
      } as Response
    }) as typeof fetch

    const [a, b, c] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/users'),
      api.get('/submissions'),
    ])

    assert.ok(a)
    assert.ok(b)
    assert.ok(c)
    assert.equal(refreshCalls, 1)
    assert.equal(resourceCalls, 6) // 3 initial 401s + 3 retries
    assert.equal(getAccessToken(), 'shared-token')
  })

  it('shares refresh failure across concurrent waiters', async () => {
    let refreshCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () =>
            JSON.stringify({ status: 'error', message: 'Refresh denied' }),
        } as Response
      }

      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({ status: 'error', message: 'Token expired' }),
      } as Response
    }) as typeof fetch

    const results = await Promise.allSettled([
      api.get('/a'),
      api.get('/b'),
      api.get('/c'),
    ])

    assert.equal(refreshCalls, 1)
    assert.equal(results.every((r) => r.status === 'rejected'), true)
    assert.equal(getAccessToken(), null)
  })

  it('does not auto-refresh when skipAuthRefresh is set (login/logout)', async () => {
    let refreshCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1
      }
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({ status: 'error', message: 'Nope' }),
      } as Response
    }) as typeof fetch

    await assert.rejects(() =>
      api.post('/auth/login', { email: 'a', password: 'b' }, {
        skipAuthRefresh: true,
      }),
    )
    assert.equal(refreshCalls, 0)
  })

  it('does not auto-refresh public requests that never sent a Bearer token', async () => {
    setAccessToken(null)
    let refreshCalls = 0

    globalThis.fetch = mock.fn(async (url: string | URL) => {
      if (String(url).includes('/auth/refresh')) refreshCalls += 1
      return {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () =>
          JSON.stringify({ status: 'error', message: 'Auth required' }),
      } as Response
    }) as typeof fetch

    await assert.rejects(() => api.get('/auth/me'))
    assert.equal(refreshCalls, 0)
  })
})

describe('single-flight refreshSessionAccessToken', () => {
  afterEach(() => {
    __resetRefreshFlightForTests()
  })

  it('reuses one in-flight promise for concurrent callers', async () => {
    let runs = 0
    const runner = async () => {
      runs += 1
      await new Promise((resolve) => setTimeout(resolve, 15))
      return { access_token: 'once' }
    }

    const [a, b] = await Promise.all([
      refreshSessionAccessToken(undefined, runner),
      refreshSessionAccessToken(undefined, runner),
    ])

    assert.equal(runs, 1)
    assert.equal(a.access_token, 'once')
    assert.equal(b.access_token, 'once')
  })
})

describe('authToken invalidation', () => {
  afterEach(() => {
    setAccessToken(null)
  })

  it('notifies listeners when the access token is invalidated', () => {
    setAccessToken('x')
    let calls = 0
    const stop = onAccessTokenInvalidated(() => {
      calls += 1
    })
    invalidateAccessToken()
    assert.equal(getAccessToken(), null)
    assert.equal(calls, 1)
    stop()
  })
})
