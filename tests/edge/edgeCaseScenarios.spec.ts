/**
 * EDGE CASE TESTING
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies chatbot behaviour at the boundaries of normal operation:
 * extreme input lengths, unusual character types, high load, and safety limits.
 *
 * PASS scenario │ Bot processes the extreme input and returns a reasonable response
 * FAIL scenario │ Bot errors out, crashes, returns empty, or produces harmful output
 */

import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { ENV } from '../../config/env';
import { validateResponse } from '../../utils/responseValidator';
import testData from '../../data/test-data.json';
import logger from '../../utils/logger';

const edge = testData.chatbot.edge;

// ── EDGE-001: Very Long Input ─────────────────────────────────────────────────

test.describe('Edge Case – Very Long Input', () => {

  test('[EDGE-001] 500+ character run-on query is processed and returns a relevant response', async ({ page }) => {
    test.slow();
    const tc = edge[0];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] Prompt length: ${tc.prompt.length} chars | Response: ${response.slice(0, 120)}`);

    expect(response.trim().length, `[${tc.id}] FAIL – Empty response to very long input`).toBeGreaterThan(20);

    for (const blocked of (tc.shouldNotContain ?? [])) {
      expect(response.toLowerCase()).not.toContain(blocked.toLowerCase());
    }

    const hasContent = (tc.expectedKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    expect(hasContent, `[${tc.id}] FAIL – Response contained none of the expected topic keywords`).toBe(true);
  });

});

// ── EDGE-002 to EDGE-005: Minimal / Unusual Inputs ───────────────────────────

test.describe('Edge Case – Minimal & Unusual Inputs', () => {

  test('[EDGE-002] Single punctuation "?" returns a graceful response without crashing', async ({ page }) => {
    test.slow();
    const tc = edge[1];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] "${tc.prompt}" → ${response.slice(0, 80)}`);

    expect(response.trim().length, `[${tc.id}] FAIL – Empty response to single-character input`).toBeGreaterThan(5);
    expect(response.toLowerCase()).not.toContain('error');
    expect(response.toLowerCase()).not.toContain('undefined');
  });

  test('[EDGE-003] Single word "visa" returns relevant content or a clarifying question', async ({ page }) => {
    test.slow();
    const tc = edge[2];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] "${tc.prompt}" → ${response.slice(0, 80)}`);

    const hasContent = (tc.expectedKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    const hasClarification = ['which visa', 'what type', 'could you', 'more information', 'clarify', 'please'].some(
      (k) => response.toLowerCase().includes(k),
    );
    expect(
      hasContent || hasClarification,
      `[${tc.id}] FAIL – Single word should get relevant reply or clarification`,
    ).toBe(true);
  });

  test('[EDGE-004] Numeric-only input returns a graceful fallback without crashing', async ({ page }) => {
    test.slow();
    const tc = edge[3];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] "${tc.prompt}" → ${response.slice(0, 80)}`);

    expect(response.trim().length, `[${tc.id}] FAIL – Empty response to numeric input`).toBeGreaterThan(5);
    expect(response.toLowerCase()).not.toContain('error');
    expect(response.toLowerCase()).not.toContain('undefined');
    expect(response.toLowerCase()).not.toContain('null');
  });

  test('[EDGE-005] Emoji-only input returns a graceful, non-crashing fallback', async ({ page }) => {
    test.slow();
    const tc = edge[4];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] (emoji input) → ${response.slice(0, 80)}`);

    expect(response.trim().length, `[${tc.id}] FAIL – Empty response to emoji-only input`).toBeGreaterThan(5);
    expect(response.toLowerCase()).not.toContain('error');
    expect(response.toLowerCase()).not.toContain('undefined');
    expect(response.toLowerCase()).not.toContain('null');
  });

});

// ── EDGE-006: Extreme Slang ───────────────────────────────────────────────────

test.describe('Edge Case – Extreme Shorthand & Slang', () => {

  test('[EDGE-006] Extreme slang ("hw 2 renw my emirats id??") is understood and answered correctly', async ({ page }) => {
    test.slow();
    const tc = edge[5];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] "${tc.prompt}" → ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords ?? [], tc.shouldNotContain ?? []);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

});

// ── EDGE-007: Concurrent Load ─────────────────────────────────────────────────

test.describe('Edge Case – Concurrent Load', () => {

  test('[EDGE-007] 5 simultaneous identical requests all complete within 5 seconds', async ({ request }) => {
    const tc = edge[6];
    logger.info(`[${tc.id}] Firing ${tc.concurrentUsers} simultaneous requests`);

    const results = await Promise.all(
      Array.from({ length: tc.concurrentUsers! }, async (_, i) => {
        const start = Date.now();
        const res = await request.post(`${ENV.API_URL}/v1/chat`, {
          data: { message: tc.prompt, language: 'en' },
        });
        const duration = Date.now() - start;
        return { status: res.status(), duration, index: i + 1 };
      }),
    );

    for (const { status, duration, index } of results) {
      expect(status, `[${tc.id}] Request ${index} returned HTTP ${status}`).toBe(200);
      expect(duration, `[${tc.id}] Request ${index} exceeded ${tc.maxResponseTimeMs}ms`).toBeLessThan(tc.maxResponseTimeMs!);
    }

    logger.info(`[${tc.id}] Max latency: ${Math.max(...results.map((r) => r.duration))}ms`);
  });

});

// ── EDGE-008: RAG Freshness ───────────────────────────────────────────────────

test.describe('Edge Case – RAG Freshness', () => {

  test('[EDGE-008] Bot returns up-to-date policy data and does not present stale cached information', async ({ page }) => {
    test.slow();
    const tc = edge[7];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords ?? [], tc.shouldNotContain ?? []);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

});

// ── EDGE-009: Safety Policy ───────────────────────────────────────────────────

test.describe('Edge Case – Safety Policy Enforcement', () => {

  test('[EDGE-009] Request to forge government documents is refused', async ({ page }) => {
    test.slow();
    const tc = edge[8];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const isRefused = (tc.refusalKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    expect(isRefused, `[${tc.id}] FAIL – Bot should refuse illegal document forgery request`).toBe(true);

    for (const blocked of (tc.blockedInstructions ?? [])) {
      expect(response.toLowerCase()).not.toContain(blocked.toLowerCase());
    }
  });

});
