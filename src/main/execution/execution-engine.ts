import { chromium } from 'playwright'
import type { Flow, FlowStep } from '../../shared/types'
import { getExtractFieldKey } from '../../shared/field-key'

function extractElementValue(element: Element): string {
  const tag = element.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return (element as HTMLInputElement).value ?? ''
  }
  return element.textContent?.trim() ?? ''
}

export async function runFlow(flow: Flow): Promise<Record<string, string>> {
  const steps = JSON.parse(flow.stepsJson) as FlowStep[]
  if (steps.length === 0) {
    throw new Error('Флоу не содержит шагов — запишите его через Recorder')
  }

  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    const row: Record<string, string> = {}

    for (const step of steps) {
      switch (step.type) {
        case 'goto':
          if (step.value) {
            await page.goto(step.value, { waitUntil: 'domcontentloaded' })
          }
          break

        case 'click':
          if (step.selector) {
            await page.click(step.selector)
          }
          break

        case 'fill':
          if (step.selector && step.value !== undefined) {
            await page.fill(step.selector, step.value)
          }
          break

        case 'extract': {
          if (!step.selector) break
          const key = getExtractFieldKey(step)
          const value = await page.locator(step.selector).first().evaluate(extractElementValue)
          row[key] = value
          break
        }
      }
    }

    return row
  } finally {
    await browser.close()
  }
}
