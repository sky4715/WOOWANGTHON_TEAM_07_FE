// BE/tests/oauth_browser_server.py(:18040)와 Vite auth 모드(:5179)를 먼저 실행한다.
// 외부 제공자의 인증 화면만 가로채며, 세션 쿠키·DB 저장·FE/BE API는 실제로 사용한다.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const output = new URL('../artifacts/oauth/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewport({ width: 375, height: 812 })
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname === 'accounts.google.com' || url.hostname === 'kauth.kakao.com') {
      const callback = new URL(url.searchParams.get('redirect_uri'))
      callback.searchParams.set('state', url.searchParams.get('state'))
      callback.searchParams.set('code', 'synthetic-browser-code')
      return request.respond({ status: 302, headers: { location: callback.toString() } })
    }
    return ['http://127.0.0.1:5179', 'http://127.0.0.1:18040'].includes(url.origin)
      ? request.continue() : request.abort()
  })
  const click = async (selector) => {
    await page.waitForSelector(selector, { visible: true })
    await page.click(selector)
  }
  const accountTab = async () => {
    await page.waitForFunction(() => typeof window.App?.switchTab === 'function')
    await page.evaluate(() => window.App.switchTab('login'))
  }
  const login = async (provider) => {
    await page.waitForFunction(() => typeof window.App?.switchTab === 'function')
    await accountTab()
    await click(`.auth-btn[data-provider="${provider}"]`)
    await page.waitForFunction(() => window.AuthService?.getSession()?.id)
    await accountTab()
    await page.waitForFunction(() => !document.querySelector('#favAddBtn')?.disabled)
  }
  await page.goto('http://127.0.0.1:5179/#/main', { waitUntil: 'domcontentloaded' })
  console.log('실제 인증 모드 화면 로드')
  assert.equal(await page.evaluate(() => window.APP_CONFIG.authMode), 'real')
  await login('google')
  console.log('Google 테스트 인증 완료')
  const cookies = await page.cookies('http://127.0.0.1:18040')
  assert(cookies.find((cookie) => cookie.name === 'woowang_session' && cookie.httpOnly && cookie.sameSite === 'Lax'))
  await click('#editNameBtn')
  await page.click('#nameEditInput', { clickCount: 3 })
  await page.type('#nameEditInput', '저장된 사용자')
  await click('#nameEditConfirm')
  await page.waitForFunction(() => document.querySelector('#authProfileName')?.textContent === '저장된 사용자')
  await click('#favAddBtn')
  await page.type('#favAddInput', '강남역')
  await click('#favAddConfirm')
  await page.waitForFunction(() => document.querySelectorAll('.fav-item').length === 1)
  await page.waitForFunction(() => !document.querySelector('#favEditBtn')?.disabled)
  await click('#favEditBtn')
  await click('.fav-rename-btn')
  await page.click('.fav-item .fav-rename-input', { clickCount: 3 })
  await page.type('.fav-item .fav-rename-input', '회사')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('.fav-primary')?.textContent === '회사')
  await page.evaluate(() => window.App.switchTab('chat'))
  await page.waitForSelector('[data-favorite-station="gangnam"]')
  assert.match(await page.$eval('[data-favorite-station="gangnam"]', (element) => element.textContent), /회사 · 강남역/)
  await page.screenshot({ path: fileURLToPath(new URL('personal-suggestions.png', output)) })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.AuthService?.getSession()?.name === '저장된 사용자')
  await page.evaluate(() => window.App.switchTab('chat'))
  await page.waitForSelector('[data-favorite-station="gangnam"]')
  await accountTab()
  await click('[data-auth="signout"]')
  await page.waitForFunction(() => window.AuthService.getSession() === false)
  assert.equal(await page.$('[data-favorite-station]'), null)
  await login('kakao')
  assert.equal(await page.$$eval('.fav-item', (items) => items.length), 0, '다른 제공자 계정에 이전 사용자 즐겨찾기 미노출')
  await click('[data-auth="signout"]')
  await page.waitForFunction(() => window.AuthService.getSession() === false)
  await login('google')
  assert.equal(await page.$eval('#authProfileName', (element) => element.textContent), '저장된 사용자')
  assert.equal(await page.$eval('.fav-primary', (element) => element.textContent), '회사')
  await click('#favEditBtn')
  await click('.fav-delete-btn')
  await page.waitForFunction(() => document.querySelectorAll('.fav-item').length === 0)
  assert.deepEqual(errors, [])
  console.log('PASS: Google/카카오 OAuth 왕복·실제 HttpOnly 세션·서버 이름/즐겨찾기 저장·새로고침·계정 분리·재로그인 복원·삭제')
} finally {
  await browser.close()
}
