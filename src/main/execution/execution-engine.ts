import { chromium, type Page } from 'playwright'
import type { Flow, FlowStep } from '../../shared/types'
import { getFieldKey } from '../../shared/field-key'

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
  page: Page,
  steps: FlowStep[],
  timeoutMs: number,
  inputOverride?: StepInputOverride
): Promise<Record<string, string>> {
  page.setDefaultTimeout(timeoutMs)
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
          await page.click(step.selector)
        }
        break

      case 'fill':
        if (step.selector && value !== undefined) {
          await page.fill(step.selector, value)
          if (step.isBatchInput) {
            row[getFieldKey(step)] = value
          }
        }
        break

      case 'extract': {
        if (!step.selector) break
        const key = getFieldKey(step)
        const extractedValue = await page
          .locator(step.selector)
          .first()
          .evaluate(extractElementValue)
        row[key] = extractedValue
        break
      }
    }
  }

  return row
}

export async function runFlow(flow: Flow): Promise<Record<string, string>> {
  const steps = JSON.parse(flow.stepsJson) as FlowStep[]
  if (steps.length === 0) {
    throw new Error('Флоу не містить кроків — запишіть його через Рекордер')
  }

  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    return await executeSteps(page, steps, flow.stepTimeoutMs)
  } finally {
    await browser.close()
  }
}
