// 로컬 Vite(:5181)와 기존 file 화면을 외부 요청 없이 확인한다.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const output = new URL('../artifacts/departure-inputs/', import.meta.url)
await mkdir(output, { recursive: true })
try {
  for (const [name, url] of [['react', 'http://127.0.0.1:5181'], ['prototype', new URL('../../Prototype-v2/index.html', import.meta.url).href]]) {
    if (process.argv[2] && process.argv[2] !== name) continue
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setRequestInterception(true)
    page.on('request', (request) => /^(http:\/\/127\.0\.0\.1:5181|file:|data:)/.test(request.url()) ? request.continue() : request.abort())
    await page.setViewport({ width: 375, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle0' })
    console.log(`${name}: loaded`)
    if (name === 'react') {
      await page.click('.mode-choice-basic')
      await page.click('.tab[data-tab="time"]')
    } else await page.click('.tab[data-tab="time"]')
    await page.waitForSelector('#view-time.active')
    console.log(`${name}: time tab`)
    await page.evaluate(() => { window.ApiClient.isApiMode = () => false })
    assert.equal(await page.$eval('#departureMinutes', (el) => el.open), false)
    const values = () => page.evaluate(() => ['walkToStationMinutes', 'stationEntryMinutes', 'exitWalkMinutes', 'bufferMinutes'].map((id) => document.getElementById(id).value))
    assert.deepEqual(await values(), ['10', '5', '5', '10'], 'first visit automatically supplies relaxed estimates')
    assert.equal(await page.$eval('[data-departure-preset="relaxed"]', (el) => el.getAttribute('aria-pressed')), 'true')
    await page.$eval('#timeForm button[type="submit"]', (el) => el.scrollIntoView({ block: 'center' }))
    await page.click('#timeForm button[type="submit"]')
    await page.waitForSelector('#timeResult .big-time')
    assert.match(await page.$eval('#timeResult', (el) => el.textContent), /역까지 10분/)
    for (const preset of ['standard', 'relaxed', 'resting']) {
      const selector = `[data-departure-preset="${preset}"]`
      await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center' }))
      await page.focus(selector)
      await page.keyboard.press('Space')
      assert.equal(await page.$eval(selector, (el) => el.getAttribute('aria-pressed')), 'true')
      assert.equal(await page.$('#timeResult .big-time'), null, 'selection discards stale calculation')
      const expected = { standard: ['7', '3', '3', '5'], relaxed: ['10', '5', '5', '10'], resting: ['15', '8', '8', '15'] }[preset]
      assert.deepEqual(await values(), expected)
    }
    await page.$eval('#view-time .view-scroll', (el) => { el.scrollTop = 0 })
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-easy-estimates.png`, output)), fullPage: true })
    await page.click('#departureMinutes summary')
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewport({ width, height: 900 })
      for (const level of ['normal', 'lg', 'xl', 'max']) {
        await page.evaluate((font) => document.documentElement.setAttribute('data-fontsize', font), level)
        const geometry = await page.$eval('#timeForm', (el) => ({ width: el.clientWidth, scroll: el.scrollWidth }))
        assert(geometry.scroll <= geometry.width + 1, `${name} overflow ${width}/${level}: ${JSON.stringify(geometry)}`)
      }
    }
    await page.setViewport({ width: 375, height: 900 })
    console.log(`${name}: geometry passed`)
    await page.evaluate(() => document.documentElement.setAttribute('data-fontsize', 'normal'))
    await page.$eval('#walkToStationMinutes', (el) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, '22'); el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    assert.equal(await page.$$eval('[data-departure-preset][aria-pressed="true"]', (els) => els.length), 0, 'manual edit clears preset selection')
    await page.$eval('#timeForm button[type="submit"]', (el) => el.scrollIntoView({ block: 'center' }))
    await page.click('#timeForm button[type="submit"]')
    console.log(`${name}: submitted`)
    await page.waitForSelector('#timeResult .big-time')
    assert.match(await page.$eval('#timeResult', (el) => el.textContent), /역까지 22분/)
    await page.$eval('#walkToStationMinutes', (el) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    assert.equal(await page.$('#timeResult .big-time'), null)
    await page.$eval('#timeForm button[type="submit"]', (el) => el.scrollIntoView({ block: 'center' }))
    await page.click('#timeForm button[type="submit"]')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'walkToStationMinutes')
    assert.equal(await page.$eval('#walkToStationMinutes', (el) => el.getAttribute('aria-invalid')), 'true')
    await page.screenshot({ path: fileURLToPath(new URL(`${name}-mobile.png`, output)), fullPage: true })
    assert.deepEqual(errors, [])
    console.log(`PASS ${name}: automatic estimates, all keyboard choices, 16 width/font combinations, custom calculation, stale-result removal, blank validation/focus`)
    await page.close()
  }
} finally { await browser.close() }
