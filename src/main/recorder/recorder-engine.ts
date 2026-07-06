import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { recorderInjectedScript } from './injected-script'
import { resolveChromiumExecutablePath } from '../playwright-executable-path'
import type { RecorderEvent, RecorderMode } from '../../shared/types'

type RecorderEventListener = (event: RecorderEvent) => void

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null

export function isRecording(): boolean {
  return context !== null
}

export async function startRecording(url: string, onEvent: RecorderEventListener): Promise<void> {
  if (context) {
    throw new Error('Recording session already in progress')
  }

  browser = await chromium.launch({
    headless: false,
    executablePath: resolveChromiumExecutablePath()
  })
  context = await browser.newContext()

  await context.exposeFunction('__recorderEmit', (event: RecorderEvent) => {
    onEvent(event)
  })
  await context.addInitScript(recorderInjectedScript)

  context.on('close', () => {
    context = null
    browser = null
    page = null
  })

  page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
}

export async function setMode(mode: RecorderMode): Promise<void> {
  await page?.evaluate((recorderMode) => {
    sessionStorage.setItem('__recorderMode', recorderMode)
  }, mode)
}

export async function stopRecording(): Promise<void> {
  await context?.close()
  await browser?.close()
  context = null
  browser = null
  page = null
}
