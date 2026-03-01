/**
 * POSITIVE TESTING
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the chatbot returns correct, relevant, and appropriately formatted
 * responses for well-formed, valid inputs in both English and Arabic.
 *
 * PASS scenario │ Correct input → accurate, relevant, well-toned output
 * FAIL scenario │ Correct input → inaccurate, empty, error, or off-topic output
 */

import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { ENV } from '../../config/env';
import { validateResponse, containsArabic } from '../../utils/responseValidator';
import testData from '../../data/test-data.json';
import logger from '../../utils/logger';

const positive = testData.chatbot.positive;

// ── POS-001: Valid English Query ──────────────────────────────────────────────

test.describe('Positive – Valid English Query', () => {

  test('[POS-001] Emirates ID renewal query returns accurate steps', async ({ page }) => {
    test.slow();
    const tc = positive[0];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords, tc.shouldNotContain);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

  test('[POS-001-PERF] Response arrives within the allowed time limit', async ({ request }) => {
    const tc = positive[0];
    const start = Date.now();
    const res = await request.post(`${ENV.API_URL}/v1/chat`, {
      data: { message: tc.prompt, language: 'en' },
    });
    const duration = Date.now() - start;

    logger.info(`[POS-001-PERF] Response time: ${duration}ms`);

    expect(res.status()).toBe(200);
    expect(duration, `Response took ${duration}ms – expected < ${tc.maxResponseTimeMs}ms`).toBeLessThan(tc.maxResponseTimeMs!);
  });

});

// ── POS-002 & POS-003: Bilingual Support ─────────────────────────────────────

test.describe('Positive – Bilingual Support (Arabic & English)', () => {

  test('[POS-002] Arabic query returns an Arabic-language response with correct content', async ({ page }) => {
    test.slow();
    const tc = positive[1];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    expect(containsArabic(response), `[${tc.id}] Response must contain Arabic script`).toBe(true);

    const hasKeyword = (tc.expectedArabicKeywords ?? []).some((k: string) => response.includes(k));
    expect(hasKeyword, `[${tc.id}] Expected Arabic content keywords not found`).toBe(true);

    for (const blocked of (tc.shouldNotContain ?? [])) {
      expect(response.toLowerCase()).not.toContain(blocked.toLowerCase());
    }
  });

  test('[POS-003] English Golden Visa query returns accurate response with correct key facts', async ({ page }) => {
    test.slow();
    const tc = positive[2];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords, tc.shouldNotContain);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

});

// ── POS-004: Professional Tone ────────────────────────────────────────────────

test.describe('Positive – Professional Tone & Language Accuracy', () => {

  test('[POS-004] Response uses professional, government-appropriate tone with no casual language', async ({ page }) => {
    test.slow();
    const tc = positive[3];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords, tc.shouldNotContain);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);

    const hasBadTone = (tc.badToneWords ?? []).some((w: string) =>
      response.toLowerCase().includes(w.toLowerCase()),
    );
    expect(hasBadTone, `[${tc.id}] Response contains inappropriate tone words`).toBe(false);
  });

});

// ── POS-005: Data Privacy ─────────────────────────────────────────────────────

test.describe('Positive – Data Privacy Handling', () => {

  test("[POS-005] Data deletion request is acknowledged without leaking other users' data", async ({ page }) => {
    test.slow();
    const tc = positive[4];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    expect(response.trim().length, `[${tc.id}] Response was empty`).toBeGreaterThan(10);

    const leaksData = (tc.unauthorizedPatterns ?? []).some((p: string) =>
      response.toLowerCase().includes(p.toLowerCase()),
    );
    expect(leaksData, `[${tc.id}] Response may have exposed another user's data`).toBe(false);
  });

});
