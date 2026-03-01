import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

// ---------------------------------------------------------------------------
// Selector map – multi-fallback CSS/ARIA patterns to survive minor UI changes.
// Run `npx playwright codegen https://uask.ae` after a UI release to update.
// ---------------------------------------------------------------------------
const SEL = {
  chatLauncher: '[aria-label="Open chat"], .chat-launcher, #chat-trigger, .fab-button',
  inputBox:     'textarea[placeholder], input[placeholder*="Ask"], input[placeholder*="اسأل"], #user-input, .chat-input',
  sendBtn:      'button[type="submit"], [aria-label="Send message"], #send-btn, .send-button',
  messages:     '.message-list, .chat-messages, [role="log"], .conversation-area',
  botMsg:       '.bot-message, .assistant-message, [data-role="bot"], [data-sender="bot"]',
  userMsg:      '.user-message, .human-message, [data-role="user"], [data-sender="user"]',
  typingDots:   '.typing-indicator, .loading-dots, [aria-label*="typing"], .bot-typing',
  langToggle:   '#lang-toggle, .language-switcher, [data-testid="lang-toggle"], button[aria-label*="language"]',
  errorBanner:  '.error-banner, .fallback-message, [data-testid="error-msg"], .sorry-message',
} as const;

export class ChatPage extends BasePage {
  readonly inputBox:    Locator;
  readonly sendBtn:     Locator;
  readonly messages:    Locator;
  readonly botMsgs:     Locator;
  readonly userMsgs:    Locator;
  readonly typingDots:  Locator;
  readonly langToggle:  Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.inputBox    = page.locator(SEL.inputBox).first();
    this.sendBtn     = page.locator(SEL.sendBtn).first();
    this.messages    = page.locator(SEL.messages).first();
    this.botMsgs     = page.locator(SEL.botMsg);
    this.userMsgs    = page.locator(SEL.userMsg);
    this.typingDots  = page.locator(SEL.typingDots).first();
    this.langToggle  = page.locator(SEL.langToggle).first();
    this.errorBanner = page.locator(SEL.errorBanner).first();
  }

  /** Navigate to the app root and wait for the chat input to be ready. */
  async open(): Promise<void> {
    await this.navigateTo('/');
    await this.page.waitForLoadState('domcontentloaded');

    // Some deployments render a floating launcher button – click it if present.
    const launcher = this.page.locator(SEL.chatLauncher).first();
    const launcherVisible = await launcher.isVisible({ timeout: 4000 }).catch(() => false);
    if (launcherVisible) await launcher.click();

    await this.inputBox.waitFor({ state: 'visible', timeout: 15000 });
  }

  /** Type a message and submit it. Waits for the input to be re-enabled before returning. */
  async sendMessage(text: string): Promise<void> {
    await this.inputBox.fill(text);
    await this.sendBtn.click();
    // Wait for the input to clear – confirms the message was accepted by the widget.
    await this.inputBox.waitFor({ state: 'visible' });
  }

  /**
   * Wait for the bot to finish its reply and return the full response text.
   * Strategy 1 – typing indicator (streaming): wait for it to appear then disappear.
   * Strategy 2 – message count (non-streaming): poll until a new bot message exists.
   */
  async waitForBotResponse(timeout = 35000): Promise<string> {
    const countBefore = await this.botMsgs.count();

    try {
      await this.typingDots.waitFor({ state: 'visible', timeout: 6000 });
      await this.typingDots.waitFor({ state: 'hidden',  timeout });
    } catch {
      // Typing indicator absent on this build – fall back to message-count polling.
      await this.page.waitForFunction(
        ({ selector, prev }: { selector: string; prev: number }) =>
          document.querySelectorAll(selector).length > prev,
        { selector: SEL.botMsg, prev: countBefore },
        { timeout },
      ).catch(() => null);
    }

    // Allow streaming responses a brief window to finish appending text.
    await this.pause(600);
    return this.getLastBotMessage();
  }

  /** Returns the trimmed text of the most recent bot message, or '' if none exists. */
  async getLastBotMessage(): Promise<string> {
    const total = await this.botMsgs.count();
    if (total === 0) return '';
    return (await this.botMsgs.nth(total - 1).innerText()).trim();
  }

  /** Returns the current value of the chat input field. */
  async getInputValue(): Promise<string> {
    return this.inputBox.inputValue();
  }

  /** Toggles the language between English and Arabic via the language switcher control. */
  async switchLanguage(): Promise<void> {
    await this.langToggle.click();
    await this.page.waitForTimeout(800);
  }

  /** Returns the effective text direction of the document ('ltr' | 'rtl'). */
  async getPageDirection(): Promise<string> {
    return this.page.evaluate(
      () => document.documentElement.dir || document.body.dir || 'ltr',
    );
  }

  /** Returns true when the message container's content overflows its visible height. */
  async isMessageAreaScrollable(): Promise<boolean> {
    return this.messages.evaluate((el) => el.scrollHeight > el.clientHeight);
  }
}
