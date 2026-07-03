// Capture des assets vidéo CERYDRA — screenshots + vidéos d'interaction réelles
import { chromium, devices } from 'playwright'
import fs from 'fs'

const OUT = 'assets'
fs.mkdirSync(OUT, { recursive: true })

const SITE = 'https://lecomptoir13.netlify.app'
const CERYDRA = 'https://cerydra.fr'

async function typeSlow(el, text) {
  await el.click()
  await el.type(text, { delay: 70 })
}

const browser = await chromium.launch()

/* SKIP
// ── 1. Desktop : Le Comptoir hero + sections ────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(SITE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/comptoir_desktop_hero.png` })
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/comptoir_desktop_section2.png` })
  await ctx.close()
  console.log('1. desktop OK')
}

// ── 2. Desktop : cerydra.fr landing ────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(CERYDRA, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/cerydra_landing.png` })
  await ctx.close()
  console.log('2. cerydra.fr OK')
}

SKIP */
// ── 3. Mobile iPhone : parcours complet widget AVEC VIDEO ──────────
{
  const iphone = devices['iPhone 13 Pro']
  const ctx = await browser.newContext({
    ...iphone,
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  })
  const page = await ctx.newPage()
  await page.goto(SITE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/comptoir_mobile_hero.png` })

  // Ouvre le widget
  const btn = page.locator('#cerydra-widget #crd-btn')
  await btn.waitFor({ timeout: 10000 })
  await btn.click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/widget_ouvert.png` })

  // Remplit le formulaire — Sophie Martin, samedi 20:00, 2 pers
  const w = page.locator('#cerydra-widget')
  await typeSlow(w.locator('input[name="prenom"]'), 'Sophie')
  await typeSlow(w.locator('input[name="nom"]'), 'Martin')
  await typeSlow(w.locator('input[name="email"]'), 'sophie.martin@exemple.fr')
  await typeSlow(w.locator('input[name="telephone"]'), '06 12 34 56 78')
  await w.locator('input[name="date"]').fill('2026-07-04')
  await w.locator('input[name="date"]').dispatchEvent('change')
  await page.waitForTimeout(800)
  await w.locator('select[name="heure"]').selectOption('20:00')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/widget_rempli.png` })

  // Soumission réelle → confirmation
  await w.locator('button[type="submit"]').click()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/widget_confirmation.png` })
  await page.waitForTimeout(1500)

  await ctx.close()
  console.log('3. mobile + video OK')
}

await browser.close()
console.log('done')
