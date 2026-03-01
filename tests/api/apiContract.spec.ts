/**
 * API CONTRACT TESTING (MINIMAL)
 * ─────────────────────────────────────────────────────────────────────────────
 * Two essential checks that confirm the backend API is up and returns the
 * correct response structure. These run without a browser and are fast enough
 * to use as a pre-flight check before the full browser test suite.
 *
 *   API-001  Health endpoint returns HTTP 200
 *   API-002  POST /v1/chat returns JSON with a non-empty "response" string
 */

import { test, expect } from '@playwright/test';
import { ENV } from '../../config/env';

// ── API-001: Health Check ─────────────────────────────────────────────────────

test('[API-001] Health endpoint returns HTTP 200', async ({ request }) => {
  const res = await request.get(`${ENV.API_URL}/health`);
  expect(res.status(), 'Health endpoint must return 200').toBe(200);
});

// ── API-002: Response Contract ────────────────────────────────────────────────

test('[API-002] POST /v1/chat returns JSON with a non-empty "response" string', async ({ request }) => {
  const res = await request.post(`${ENV.API_URL}/v1/chat`, {
    data: { message: 'How can I renew my Emirates ID?', language: 'en' },
  });

  expect(res.status(), 'Chat endpoint must return 200').toBe(200);
  expect(res.headers()['content-type'], 'Content-Type must be application/json').toContain('application/json');

  const body = await res.json();
  expect(body, 'Response body must have a "response" property').toHaveProperty('response');
  expect(typeof body.response, '"response" must be a string').toBe('string');
  expect(body.response.length, '"response" must be non-empty').toBeGreaterThan(0);
});
