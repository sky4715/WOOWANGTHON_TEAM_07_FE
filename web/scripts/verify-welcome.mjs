// 실행 전: npm.cmd run dev -- --mode mock --port 5178 --strictPort
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const output = new URL('../artifacts/welcome/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await puppeteer.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setRequestInterception(true)
  page.on('request', (request) => request.url().startsWith('http://127.0.0.1:5178') ? request.continue() : request.abort())
  await page.setViewport({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.ieum-mode-basic')
  assert.equal(await page.$('#phone'), null, '랜딩에서 메인 미노출')
  await page.screenshot({ path: fileURLToPath(new URL('landing-desktop.png', output)) })
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewport({ width, height: 900 })
    assert(await page.$eval('.welcome-shell', (element) => element.scrollWidth <= element.clientWidth), '랜딩 가로 넘침 없음')
  }
  await page.setViewport({ width: 375, height: 667 })
  const visible = await page.$$eval('.ieum-mode-btn', (buttons) => buttons.every((button) => {
    const rect = button.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= window.innerHeight
  }))
  assert(visible, '모바일 첫 화면에서 두 선택 버튼이 모두 보임')
  await page.screenshot({ path: fileURLToPath(new URL('landing-mobile.png', output)) })
  assert((await page.$eval('h1 svg', (element) => element.getAttribute('aria-label'))).includes('이음'), '랜딩 로고에 이음 표시')
  const geo = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect()
    const a = rect('.ieum-mode-basic'), b = rect('.ieum-mode-easy'), logo = rect('.ieum-landing-logo .ieum-logo'), w = window.innerWidth
    return { sameW: Math.abs(a.width - b.width) < 1, sameH: Math.abs(a.height - b.height) < 1, groupCenter: Math.abs((a.left + b.right) / 2 - w / 2) < 2,
      logoCenter: Math.abs((logo.left + logo.right) / 2 - w / 2) < 2, gap: Math.round(b.left - a.right), bottomGap: Math.round(window.innerHeight - b.bottom), logoAbove: logo.bottom < a.top }
  })
  assert.deepEqual([geo.sameW, geo.sameH, geo.groupCenter, geo.logoCenter, geo.logoAbove], [true, true, true, true, true], JSON.stringify(geo))
  assert(geo.gap >= 12 && geo.gap <= 16 && geo.bottomGap >= 16, '버튼 간격과 하단 여백: ' + JSON.stringify(geo))
  await page.click('.ieum-mode-easy')
  await page.waitForSelector('[data-page="easy-main"]')
  assert.equal(new URL(page.url()).hash, '#/easy')
  await page.click('.easy-main-links a:first-child')
  await page.waitForSelector('[data-page="customize"]')
  await page.locator('.customize-fonts label:nth-child(3)').click()
  await page.locator('.customize-options label:nth-child(2)').click()
  assert(await page.$eval('.welcome-shell', (element) => element.scrollWidth <= element.clientWidth), '맞춤 설정 가로 넘침 없음')
  await page.locator('.customize-submit').click()
  await page.waitForSelector('[data-page="easy-main"]')
  assert.equal(new URL(page.url()).hash, '#/easy')
  assert.equal(await page.$('.welcome-shell'), null, '쉬운 메인과 랜딩 구분')
  assert.equal(await page.$('input[type="checkbox"]'), null, '맞춤 설정 완료 후 메인으로 분리')
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-fontsize')), 'xl')
  assert(await page.evaluate(() => document.documentElement.hasAttribute('data-access-contrast')))
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-fontsize')), 'xl', '새로고침 후 맞춤 글씨 복원')
  await page.screenshot({ path: fileURLToPath(new URL('easy-main-mobile.png', output)) })
  await page.locator('.welcome-tasks button:first-child').click()
  await page.waitForSelector('#view-elevator.active')
  assert.equal(await page.$('.welcome-return'), null)
  await page.click('.easy-navigation a')
  await page.waitForSelector('[data-page="easy-main"]')
  await page.click('.easy-main-links a:last-child')
  await page.waitForSelector('.ieum-mode-basic')
  await page.click('.ieum-mode-basic')
  await page.waitForSelector('#view-map.active')
  assert.equal(new URL(page.url()).hash, '#/main')
  assert.equal(await page.$('.welcome-shell'), null)
  assert.equal(await page.$('.easy-navigation'), null)
  await page.screenshot({ path: fileURLToPath(new URL('basic-main-mobile.png', output)) })
  await page.goBack()
  await page.waitForSelector('.ieum-mode-easy')
  await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle0' })
  assert(await page.$('.ieum-mode-basic'), '저장값이 있어도 루트에서는 선택부터')
  assert.deepEqual(errors, [])
  console.log('PASS: 이음 랜딩, 기본/쉬운 화면 시작, 모바일 두 버튼 노출, 설정 조합·저장·복원, 메인 분리, 기능 연결, 뒤로 가기')
} finally { await browser.close() }
