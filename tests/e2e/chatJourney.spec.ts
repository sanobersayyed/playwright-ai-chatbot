/**
 * END-TO-END CHAT JOURNEY
 * ─────────────────────────────────────────────────────────────────────────────
 * Covers the complete user experience from opening the chat widget through to
 * a multi-turn conversation. Also verifies Arabic / RTL support, basic
 * accessibility compliance, and mobile viewport compatibility.
 *
 *   E2E-001 to E2E-005  Widget load, message send/receive, auto-scroll
 *   E2E-006             Multi-turn context retention (10-turn Golden Visa)
 *   E2E-007 to E2E-008  Multilingual support (Arabic RTL + Arabic response)
 *   E2E-009 to E2E-010  Accessibility (ARIA labels, keyboard navigation)
 *   E2E-011             Mobile viewport compatibility
 */

import { test, expect, devices } from '@playwright/test';
import { ChatPage } from '../../pages/ChatPage';
import { ENV } from '../../config/env';
import { containsArabic, hasCleanFormatting } from '../../utils/responseValidator';
import testData from '../../data/test-data.json';
import logger from '../../utils/logger';

const turns = testData.chatbot.longConversation;

// ── E2E-001 to E2E-005: Widget Load & Basic Interaction ───────────────────────

test.describe('E2E – Widget Load & Basic Interaction', () => {

  test('[E2E-001] Chat input, send button, and message area are visible when the page loads', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.open();

    await expect(chat.inputBox).toBeVisible();
    await expect(chat.sendBtn).toBeEnabled();
    await expect(chat.messages).toBeVisible();
  });

  test('[E2E-002] User message appears in the chat area and input is cleared after sending', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.open();

    const msg = 'What public services are available online?';
    await chat.sendMessage(msg);

    await expect(chat.userMsgs.last()).toContainText(msg, { timeout: 5000 });
    await page.waitForTimeout(800);
    expect(await chat.getInputValue()).toBe('');
  });

  test('[E2E-003] Bot reply is rendered in the conversation area after sending a message', async ({ page }) => {
    test.slow();
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage('How can I apply for a driving licence in UAE?');
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    expect(response.length, '[E2E-003] Bot reply must be non-empty').toBeGreaterThan(15);
    expect(hasCleanFormatting(response), '[E2E-003] Bot reply must not contain raw HTML tags').toBe(true);
    await expect(chat.botMsgs.last()).toBeVisible();
    logger.info(`[E2E-003] ${response.slice(0, 80)}`);
  });

  test('[E2E-004] Conversation history grows with each message exchange', async ({ page }) => {
    test.slow();
    const chat = new ChatPage(page);
    await chat.open();

    await chat.sendMessage('What is Emirates ID?');
    await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    await chat.sendMessage('How do I renew it?');
    await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    expect(await chat.botMsgs.count()).toBeGreaterThanOrEqual(2);
    expect(await chat.userMsgs.count()).toBeGreaterThanOrEqual(2);
  });

  test('[E2E-005] Chat auto-scrolls to the latest reply after multiple exchanges', async ({ page }) => {
    test.slow();
    const chat = new ChatPage(page);
    await chat.open();

    for (const q of ['Tell me about UAE digital services', 'What is a Golden Visa?', 'What is MOHRE?']) {
      await chat.sendMessage(q);
      await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);
    }

    await expect(chat.botMsgs.last()).toBeInViewport();
  });

});

// ── E2E-006: Multi-Turn Context Retention ─────────────────────────────────────

test.describe('E2E – Multi-Turn Context Retention', () => {

  test('[E2E-006] Chatbot maintains Golden Visa context across 10 consecutive questions', async ({ page }) => {
    test.slow();
    const chat = new ChatPage(page);
    await chat.open();

    // Turns 1–9: each question must receive a non-empty answer
    for (let i = 0; i < turns.length - 1; i++) {
      await chat.sendMessage(turns[i].message);
      const r = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);
      expect(r.trim().length, `[${turns[i].id}] Non-empty reply expected`).toBeGreaterThan(5);
      logger.info(`[${turns[i].id}] ${r.slice(0, 80)}`);
    }

    // Turn 10: context-aware – final answer must still reference the Golden Visa topic
    const last = turns[turns.length - 1];
    await chat.sendMessage(last.message);
    const final = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    const contextKeywords = ['golden visa', 'visa', 'eligibility', 'documents', 'apply', 'renewal'];
    const retainedContext = contextKeywords.some((k) => final.toLowerCase().includes(k));
    expect(retainedContext, `[${last.id}] FAIL – Bot lost Golden Visa context over 10 turns`).toBe(true);
    logger.info(`[${last.id}] Final: ${final.slice(0, 120)}`);
  });

});

// ── E2E-007 & E2E-008: Multilingual Support ───────────────────────────────────

test.describe('E2E – Multilingual Support', () => {

  test('[E2E-007] Arabic query returns a response that contains Arabic script', async ({ page }) => {
    test.slow();
    const chat = new ChatPage(page);
    await chat.open();

    const prompt = testData.chatbot.positive[1].prompt; // POS-002 Arabic prompt
    await chat.sendMessage(prompt);
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    expect(containsArabic(response), '[E2E-007] Response must contain Arabic script').toBe(true);
    logger.info(`[E2E-007] ${response.slice(0, 80)}`);
  });

  test('[E2E-008] Switching to Arabic applies RTL direction to the page', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.open();

    await chat.switchLanguage();
    const dir = await chat.getPageDirection();

    expect(dir, '[E2E-008] Page direction must be RTL in Arabic mode').toBe('rtl');
  });

});

// ── E2E-009 & E2E-010: Accessibility ─────────────────────────────────────────

test.describe('E2E – Accessibility', () => {

  test('[E2E-009] Chat input has an accessible label and send button has an accessible name', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.open();

    // Input must be identifiable by screen readers
    const ariaLabel      = await chat.inputBox.getAttribute('aria-label');
    const placeholder    = await chat.inputBox.getAttribute('placeholder');
    const ariaLabelledBy = await chat.inputBox.getAttribute('aria-labelledby');
    expect(
      !!(ariaLabel || placeholder || ariaLabelledBy),
      '[E2E-009] Input must have aria-label, placeholder, or aria-labelledby',
    ).toBe(true);

    // Send button must be identifiable by screen readers
    const btnLabel = await chat.sendBtn.getAttribute('aria-label');
    const btnText  = (await chat.sendBtn.innerText()).trim();
    const btnTitle = await chat.sendBtn.getAttribute('title');
    expect(
      !!(btnLabel || btnText || btnTitle),
      '[E2E-009] Send button must have an accessible name',
    ).toBe(true);
  });

  test('[E2E-010] Chat input is reachable via Tab key and focus returns to input after sending', async ({ page }) => {
    const chat = new ChatPage(page);
    await chat.open();

    // Navigate with Tab until the input box receives focus (max 15 presses)
    let reachable = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      reachable = await chat.inputBox.evaluate((el) => el === document.activeElement);
      if (reachable) break;
    }
    expect(reachable, '[E2E-010] Chat input must be reachable via Tab key').toBe(true);

    // After sending, focus must return to the input box
    await chat.sendMessage('What is ICA?');
    await page.waitForTimeout(800);
    const focusedAfterSend = await chat.inputBox.evaluate((el) => el === document.activeElement);
    expect(focusedAfterSend, '[E2E-010] Focus must return to input box after sending').toBe(true);
  });

});

// ── E2E-011: Mobile Viewport ──────────────────────────────────────────────────

test.describe('E2E – Mobile Viewport', () => {

  test('[E2E-011] Chat widget loads and responds correctly on a mobile viewport', async ({ browser }) => {
    test.slow();
    const context = await browser.newContext({ ...devices['Pixel 5'] });
    const page = await context.newPage();
    const chat = new ChatPage(page);
    await chat.open();

    await expect(chat.inputBox).toBeVisible();
    await expect(chat.sendBtn).toBeEnabled();

    await chat.sendMessage('How do I apply for a UAE residence visa?');
    const response = await chat.waitForBotResponse(ENV.AI_RESPONSE_TIMEOUT);

    expect(response.length).toBeGreaterThan(15);
    await expect(chat.botMsgs.last()).toBeInViewport();
    logger.info(`[E2E-011] Mobile response: ${response.slice(0, 80)}`);

    await context.close();
  });

});
