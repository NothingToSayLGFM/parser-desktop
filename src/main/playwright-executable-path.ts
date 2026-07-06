import { chromium } from 'playwright'

// In a packaged Electron app, Playwright resolves its own package directory
// to a path inside `app.asar`. Reading that path works fine (Electron's `fs`
// shim redirects transparently into `app.asar.unpacked`), but spawning a
// process from it does not — `child_process.spawn` goes straight to the OS,
// which has no knowledge of the virtual asar filesystem and sees a plain
// file where a real executable should be, failing with ENOENT. The browser
// binary is genuinely unpacked on disk next to the archive, just under
// `app.asar.unpacked` instead — point Playwright there explicitly.
export function resolveChromiumExecutablePath(): string {
  return chromium.executablePath().replace('app.asar', 'app.asar.unpacked')
}
