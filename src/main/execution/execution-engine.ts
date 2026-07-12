import { chromium, type BrowserContext, type Page } from 'patchright'
import type { Flow, FlowStep } from '../../shared/types'
import { getFieldKey } from '../../shared/field-key'
import { resolveChromiumExecutablePath } from '../playwright-executable-path'

export interface StepInputOverride {
  stepId: string
  value: string
}

function extractElementValue(element: Element): string {
  const tag = element.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return (element as HTMLInputElement).value ?? ''
  }
  return element.textContent?.trim() ?? ''
}

export async function executeSteps(
  context: BrowserContext,
  initialPage: Page,
  steps: FlowStep[],
  timeoutMs: number,
  inputOverride?: StepInputOverride
): Promise<Record<string, string>> {
  let page = initialPage
  page.setDefaultTimeout(timeoutMs)

  // A click on a `target="_blank"` link opens a brand new tab instead of
  // navigating the current one — without this, every step after such a
  // click would keep running against the now-stale original page.
  const handleNewPage = (newPage: Page): void => {
    page = newPage
    page.setDefaultTimeout(timeoutMs)
  }
  context.on('page', handleNewPage)

  try {
    const row: Record<string, string> = {}

    for (const step of steps) {
      const value = step.id === inputOverride?.stepId ? inputOverride.value : step.value

      switch (step.type) {
        case 'goto':
          if (value) {
            await page.goto(value, { waitUntil: 'domcontentloaded' })
          }
          break

        case 'click':
          if (step.selector) {
            // Some sites render duplicate copies of the same widget for
            // different breakpoints (mobile/desktop) and toggle visibility via
            // CSS — a recorded selector can match several structurally
            // identical elements where only one is actually on screen.
            // `:visible` picks the one the user could actually have clicked.
            await page.locator(`${step.selector}:visible`).first().click()
          }
          break

        case 'fill':
          if (step.selector && value !== undefined) {
            await page.locator(`${step.selector}:visible`).first().fill(value)
            if (step.isBatchInput) {
              row[getFieldKey(step)] = value
            }
          }
          break

        case 'extract': {
          if (!step.selector) break
          const key = getFieldKey(step)
          const extractedValue = await page
            .locator(`${step.selector}:visible`)
            .first()
            .evaluate(extractElementValue)
          row[key] = extractedValue
          break
        }
      }
    }

    return row
  } finally {
    context.off('page', handleNewPage)
  }
}

export async function runFlow(flow: Flow): Promise<Record<string, string>> {
  const steps = JSON.parse(flow.stepsJson) as FlowStep[]
  if (steps.length === 0) {
    throw new Error('Флоу не містить кроків — запишіть його через Рекордер')
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveChromiumExecutablePath()
  })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    return await executeSteps(context, page, steps, flow.stepTimeoutMs)
  } finally {
    await browser.close()
  }
}
