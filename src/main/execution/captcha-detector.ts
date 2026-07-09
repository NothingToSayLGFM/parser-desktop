import type { Page } from 'playwright'

const CAPTCHA_SELECTORS = [
  'iframe[src*="challenges.cloudflare.com"]',
  'iframe[src*="recaptcha"]',
  'iframe[title*="challenge" i]'
]

export async function isCaptchaPresent(page: Page): Promise<boolean> {
  for (const selector of CAPTCHA_SELECTORS) {
    const count = await page
      .locator(selector)
      .count()
      .catch(() => 0)
    if (count > 0) return true
  }
  return false
}
