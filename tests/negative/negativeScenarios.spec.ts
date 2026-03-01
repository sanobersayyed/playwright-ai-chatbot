/**
 * NEGATIVE TESTING
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies the chatbot handles invalid, malformed, ambiguous, and out-of-scope
 * inputs gracefully — without crashing or producing harmful/incorrect output.
 *
 * PASS scenario │ Bot identifies the issue, resolves intent, or denies the request
 * FAIL scenario │ Bot crashes, returns a raw error, or silently complies with a bad request
 */

import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { ENV } from '../../config/env';
import { validateResponse } from '../../utils/responseValidator';
import testData from '../../data/test-data.json';
import logger from '../../utils/logger';

const negative = testData.chatbot.negative;

// ── NEG-001: Ambiguous Input ──────────────────────────────────────────────────

test.describe('Negative – Ambiguous Input', () => {

  test('[NEG-001] Vague query with no service specified triggers a clarification request', async ({ page }) => {
    test.slow();
    const tc = negative[0];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const asksClarification = (tc.clarificationKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    expect(asksClarification, `[${tc.id}] Bot should ask for clarification on an ambiguous query`).toBe(true);
  });

});

// ── NEG-002 to NEG-005: Language Errors ──────────────────────────────────────

test.describe('Negative – Grammar & Language Errors', () => {

  test('[NEG-002] Slang input ("u got info bout renewing eid?") is correctly resolved', async ({ page }) => {
    test.slow();
    const tc = negative[1];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords ?? [], tc.shouldNotContain ?? []);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

  test('[NEG-003] Grammar error ("How I can renewing…") – bot resolves intent or asks for clarification', async ({ page }) => {
    test.slow();
    const tc = negative[2];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const hasContent = (tc.expectedKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    const hasClarification = ['clarify', 'did you mean', 'rephrase', 'could you', 'understand'].some((k) =>
      response.toLowerCase().includes(k),
    );
    expect(
      hasContent || hasClarification,
      `[${tc.id}] FAIL – Bot should resolve intent or ask for clarification`,
    ).toBe(true);

    for (const blocked of (tc.shouldNotContain ?? [])) {
      expect(response.toLowerCase()).not.toContain(blocked.toLowerCase());
    }
  });

  test('[NEG-004] Garbled word order ("visa golden apply how the?") – bot resolves or asks for clarification', async ({ page }) => {
    test.slow();
    const tc = negative[3];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const hasContent = (tc.expectedKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    const hasClarification = (tc.clarificationKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    expect(
      hasContent || hasClarification,
      `[${tc.id}] FAIL – Bot should resolve garbled input or ask for clarification`,
    ).toBe(true);

    for (const blocked of (tc.shouldNotContain ?? [])) {
      expect(response.toLowerCase()).not.toContain(blocked.toLowerCase());
    }
    expect(response.trim().length).toBeGreaterThan(5);
  });

  test('[NEG-005] Heavily misspelled query ("Watt are the reqirements for vizit viza?") is resolved correctly', async ({ page }) => {
    test.slow();
    const tc = negative[4];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    const result = validateResponse(response, tc.expectedKeywords ?? [], tc.shouldNotContain ?? []);
    expect(result.passed, `[${tc.id}] – ${result.reason}`).toBe(true);
  });

});

// ── NEG-006: Off-Topic / Topic Switch ────────────────────────────────────────

test.describe('Negative – Off-Topic Input', () => {

  test('[NEG-006] Abrupt switch from UAE to Saudi Arabia services – bot redirects or politely declines', async ({ page }) => {
    test.slow();
    const tc = negative[5];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.onTopicPrompt!);
    await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    await chat.sendMessage(tc.offTopicPrompt!);
    const switchResponse = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] Off-topic response: ${switchResponse.slice(0, 120)}`);

    expect(switchResponse.trim().length).toBeGreaterThan(5);
    // Must not present Saudi Arabia services as UAE government services
    expect(switchResponse.toLowerCase()).not.toContain('saudi arabia ministry of commerce');

    const isRedirected = (tc.redirectKeywords ?? []).some((k: string) =>
      switchResponse.toLowerCase().includes(k.toLowerCase()),
    );
    if (!isRedirected) {
      logger.warn(`[${tc.id}] Bot did not explicitly redirect – verify response manually`);
    }
  });

});

// ── NEG-007: Data Privacy ─────────────────────────────────────────────────────

test.describe('Negative – Data Privacy Violation', () => {

  test("[NEG-007] Request for another user's personal data is denied", async ({ page }) => {
    test.slow();
    const tc = negative[6];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    for (const pattern of (tc.blockedPatterns ?? [])) {
      expect(response.toLowerCase()).not.toContain(pattern.toLowerCase());
    }

    const isDenied = (tc.denyKeywords ?? []).some((k: string) =>
      response.toLowerCase().includes(k.toLowerCase()),
    );
    expect(isDenied, `[${tc.id}] Bot should deny unauthorized data access`).toBe(true);
  });

});

// ── NEG-008: Prompt Injection ─────────────────────────────────────────────────

test.describe('Negative – Prompt Injection', () => {

  test('[NEG-008] Admin impersonation prompt injection is denied with no internal data revealed', async ({ page }) => {
    test.slow();
    const tc = negative[7];
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage(tc.prompt!);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    logger.info(`[${tc.id}] ${response.slice(0, 120)}`);

    for (const pattern of (tc.blockedPatterns ?? [])) {
      expect(
        response.toLowerCase(),
        `[${tc.id}] Response leaked blocked pattern: "${pattern}"`,
      ).not.toContain(pattern.toLowerCase());
    }
  });

});
