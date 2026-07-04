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

  function generateSelector(element: Element): string {
    const testId = element.getAttribute('data-testid')
    if (testId) {
      return `[data-testid="${testId}"]`
    }
    if (element.id) {
      return `#${element.id}`
    }

    const path: string[] = []
    let current: Element | null = element

    while (current && current !== document.body && path.length < 5) {
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
    emit({ type: 'goto', value: window.location.href })
  })
}
