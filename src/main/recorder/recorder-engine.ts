import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import { recorderInjectedScript } from './injected-script'
import { resolveChromiumExecutablePath } from '../playwright-executable-path'
import type { RecorderEvent, RecorderMode } from '../../shared/types'

type RecorderEventListener = (event: RecorderEvent) => void

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null
let currentMode: RecorderMode = 'navigate'

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

  // Links opening in a new tab (target="_blank") create a brand new Page
  // that our previously-tracked `page` knows nothing about. `sessionStorage`
  // does not reliably carry the recorder mode into it (different origin
  // than about:blank, and a fresh top-level browsing context in some
  // cases), so re-apply the current mode explicitly once the new tab has
  // navigated, and start tracking it as the active page.
  context.on('page', (newPage) => {
    page = newPage
    newPage.once('domcontentloaded', () => {
      void newPage.evaluate((recorderMode) => {
        sessionStorage.setItem('__recorderMode', recorderMode)
      }, currentMode)
    })
  })

  page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
}

export async function setMode(mode: RecorderMode): Promise<void> {
  currentMode = mode
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
