// 실제 키로 실행 중인 로컬 FE(:5173)·BE(:8000)에서 Google 인증 진입만 확인한다.
// 사용자가 Google 비밀번호·동의를 입력하는 단계는 자동화하지 않는다. URL·키·쿠키를 출력하지 않는다.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const output = new URL('../artifacts/google-live/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5173/#/main', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.App?.switchTab === 'function' && window.AuthService?.getSession() !== null)
  assert.equal(await page.evaluate(() => window.APP_CONFIG.authMode), 'real')
  const ready = await page.evaluate(async () => {
    const response = await fetch('http://127.0.0.1:8000/api/auth/providers', { credentials: 'include' })
    return response.json()
  })
  assert(ready.providers.google.configured && ready.storage_ready, 'Google 설정과 계정 저장소 준비')
  await page.evaluate(() => window.App.switchTab('login'))
  await page.click('.auth-btn[data-provider="google"]')
  await page.waitForFunction(() => location.hostname === 'accounts.google.com', { timeout: 30000 })
  // Google의 SPA가 인증 요청을 검사하고 입력 화면을 그릴 때까지 기다린다.
  await page.waitForFunction(() => document.querySelector('input[type="email"], input[name="identifier"], #identifierId, input[autocomplete="username"]') ||
    /redirect_uri_mismatch|invalid_client|invalid_request|access_denied|disallowed_useragent|deleted_client|invalid_scope|org_internal|unauthorized_client/.test(document.body.innerText), { timeout: 15000 }).catch(() => {})
  const result = await page.evaluate(() => {
    const text = document.body.innerText
    const error = text.match(/redirect_uri_mismatch|invalid_client|invalid_request|access_denied|disallowed_useragent|deleted_client|invalid_scope|org_internal|unauthorized_client/)?.[0]
    return { google_page: location.hostname === 'accounts.google.com', email_entry_visible: !!document.querySelector('input[type="email"], input[name="identifier"], #identifierId, input[autocomplete="username"]'), error: error || null,
      page_path: location.pathname, has_401: /\b401\b/.test(text), has_400: /\b400\b/.test(text),
      browser_rejected: /browser.*secure|브라우저.*안전/i.test(text), network_blocked: /ERR_|Forbidden|Access Denied|허용되지 않은/i.test(text) }
  })
  await page.screenshot({ path: fileURLToPath(new URL('google-entry.png', output)) })
  console.log(JSON.stringify(result))
  assert.equal(result.error, null, 'Google 인증 요청 검증 오류 없음')
  assert(result.email_entry_visible, '실제 Google 계정 입력 화면 표시')
  console.log('PASS: 기본 실행 실제 인증 모드·CORS·준비 상태·Google 계정 입력 화면 진입. 사용자 로그인/동의는 직접 수행해야 합니다.')
} finally {
  await browser.close()
}
