// Wrapper entry point. Must set this before requiring the real main bundle,
// since Rollup hoists `require('playwright')` above any code we could put
// inside the bundle itself, making an in-bundle fix unreliable. Playwright
// reads this env var once, the first time it's loaded — set it too late and
// a packaged app looks for the browser in the global OS cache instead of the
// copy bundled alongside the app in node_modules/playwright-core/.local-browsers.
process.env.PLAYWRIGHT_BROWSERS_PATH = '0'

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./out/main/index.js')
