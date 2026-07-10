/**
 * Executed inside the recorded page via Playwright's `addInitScript`.
 * Playwright serializes this function with `toString()` and re-evaluates it
 * in the browser context, so it must be fully self-contained — no closures
 * over anything outside this function body.
 */
export function recorderInjectedScript(): void {
  // Ignore iframes (ads, tracking pixels, GTM service worker frames) — only
  // the top-level document reflects real user navigation/interaction.
  if (window.top !== window.self) {
    return
  }

  function isUniqueSelector(selector: string): boolean {
    try {
      return document.querySelectorAll(selector).length === 1
    } catch {
      return false
    }
  }

  function generateSelector(element: Element): string {
    const testId = element.getAttribute('data-testid')
    if (testId) {
      const selector = `[data-testid="${testId}"]`
      if (isUniqueSelector(selector)) return selector
    }
    if (element.id) {
      const selector = `#${element.id}`
      if (isUniqueSelector(selector)) return selector
    }

    const path: string[] = []
    let current: Element | null = element

    // Climb until the accumulated path uniquely matches this element on the
    // page — a fixed depth cap risks a path that still matches several
    // similar blocks elsewhere in the DOM (e.g. repeated table rows), which
    // on replay silently clicks whichever match comes first, possibly a
    // hidden one.
    while (current && current !== document.body) {
      if (current.id) {
        path.unshift(`#${current.id}`)
        break
      }

      let segment = current.tagName.toLowerCase()
      const parent: Element | null = current.parentElement
      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName
        )
        if (sameTagSiblings.length > 1) {
          segment += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`
        }
      }

      path.unshift(segment)
      if (isUniqueSelector(path.join(' > '))) break
      current = parent
    }

    return path.join(' > ')
  }

  function emit(event: { type: string; selector?: string; value?: string }): void {
    const globalWithEmitter = window as unknown as {
      __recorderEmit?: (event: unknown) => void
    }
    globalWithEmitter.__recorderEmit?.(event)
  }

  function extractValue(element: Element): string {
    const tag = element.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return (element as HTMLInputElement).value ?? ''
    }
    return element.textContent?.trim() ?? ''
  }

  document.addEventListener(
    'click',
    (domEvent) => {
      const target = domEvent.target as Element | null
      if (!target) return

      const mode = sessionStorage.getItem('__recorderMode')
      if (mode === 'extract') {
        domEvent.preventDefault()
        domEvent.stopPropagation()
        emit({
          type: 'extract',
          selector: generateSelector(target),
          value: extractValue(target)
        })
        return
      }

      emit({ type: 'click', selector: generateSelector(target) })
      sessionStorage.setItem('__recorderLastClickAt', String(Date.now()))
    },
    true
  )

  document.addEventListener(
    'change',
    (domEvent) => {
      const target = domEvent.target as HTMLInputElement | HTMLTextAreaElement | null
      if (!target || typeof target.value !== 'string') return
      emit({ type: 'fill', selector: generateSelector(target), value: target.value })
    },
    true
  )

  document.addEventListener('DOMContentLoaded', () => {
    const url = window.location.href

    // Chromium dispatches DOMContentLoaded twice per navigation: once for a
    // transient placeholder document created before the real response
    // arrives (`readyState` still "loading" then), and once for the actual
    // document — addInitScript reruns this whole function on each, so both
    // fire for the exact same URL. Skip the second one; this must run
    // before the click-suppression check below, since otherwise the
    // placeholder document's firing would already consume/clear
    // `__recorderLastClickAt` before the real document gets a chance to
    // see it.
    const lastGotoUrl = sessionStorage.getItem('__recorderLastGotoUrl')
    const lastGotoAt = Number(sessionStorage.getItem('__recorderLastGotoAt') ?? 0)
    if (lastGotoUrl === url && Date.now() - lastGotoAt < 2000) {
      return
    }
    sessionStorage.setItem('__recorderLastGotoUrl', url)
    sessionStorage.setItem('__recorderLastGotoAt', String(Date.now()))

    // A navigation that fires right after a recorded click is almost always
    // that click's own side effect (form submit, link, SPA route change).
    // Recording it as a separate `goto` would bake in a literal URL that
    // overrides whatever the click produces on replay (e.g. with a different
    // batch input value), so such navigations are skipped here. The window
    // is generous (not ~1-2s) because a click-triggered navigation to a
    // slow-loading page can easily take several seconds to reach
    // DOMContentLoaded on the destination page.
    const lastClickAt = Number(sessionStorage.getItem('__recorderLastClickAt') ?? 0)
    sessionStorage.removeItem('__recorderLastClickAt')
    if (lastClickAt && Date.now() - lastClickAt < 10000) {
      return
    }

    emit({ type: 'goto', value: url })
  })
}
