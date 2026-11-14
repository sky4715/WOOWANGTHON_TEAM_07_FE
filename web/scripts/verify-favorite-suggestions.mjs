// 실행 전: npm.cmd run dev -- --mode mock --host 127.0.0.1 --port 5182 --strictPort
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const output = new URL('../artifacts/favorite-suggestions/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setRequestInterception(true)
  page.on('request', (request) => request.url().startsWith('http://127.0.0.1:5182') ? request.continue() : request.abort())
  await page.setViewport({ width: 375, height: 812 })
  await page.goto('http://127.0.0.1:5182/#/main', { waitUntil: 'networkidle0' })
  await page.waitForSelector('#favAddBtn')
  await page.evaluate(() => window.App.switchTab('login'))
  await page.click('[data-provider="google"]')
  await page.click('#favAddBtn')
  await page.type('#favAddInput', '강남역')
  await page.click('#favAddConfirm')
  await page.click('#favEditBtn')
  await page.click('.fav-rename-btn')
  // 추가 입력란도 같은 클래스를 쓰므로 현재 편집 중인 행을 지정한다.
  await page.click('.fav-item .fav-rename-input', { clickCount: 3 })
  await page.type('.fav-item .fav-rename-input', '회사')
  await page.keyboard.press('Enter')
  await page.evaluate(() => window.App.switchTab('chat'))
  await page.waitForSelector('[data-favorite-station="gangnam"]')
  assert.match(await page.$eval('[data-favorite-station="gangnam"]', (element) => element.textContent), /회사 · 강남역/)
  for (const width of [320, 375]) {
    await page.setViewport({ width, height: 812 })
    await page.evaluate(() => document.documentElement.setAttribute('data-fontsize', 'max'))
    assert(await page.$eval('#view-chat', (element) => element.scrollWidth <= element.clientWidth), '큰 글자에서 챗봇 가로 넘침 없음')
  }
  await page.evaluate(() => document.documentElement.removeAttribute('data-fontsize'))
  await page.screenshot({ path: fileURLToPath(new URL('chat-mobile.png', output)) })
  await page.click('[data-favorite-station="gangnam"]')
  await page.waitForFunction(() => document.querySelector('#chatMessages .msg.user .bubble')?.textContent === '강남역 엘리베이터 알려줘')
  await page.waitForFunction(() => !document.querySelector('#chatMessages .typing'))
  assert(await page.$('[data-favorite-station="gangnam"]'), '응답 후에도 즐겨찾기 추천 유지')
  await page.reload({ waitUntil: 'networkidle0' })
  await page.evaluate(() => window.App.switchTab('chat'))
  await page.waitForSelector('[data-favorite-station="gangnam"]')
  await page.evaluate(() => window.AuthService.logout())
  await page.waitForFunction(() => !document.querySelector('[data-favorite-station]'))
  assert(await page.$('#chatSuggestions .chip'), '로그아웃 후 일반 추천 유지')
  assert.deepEqual(errors, [])
  console.log('PASS: 모바일 즐겨찾기 추천·별칭·실제 역명 전송·동일 탭 새로고침·로그아웃·큰 글자 확인')
} finally {
  await browser.close()
}
