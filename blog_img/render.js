// Node Playwright 렌더러: node render.js <글폴더> <html이름> <png이름> [<w> <h>] ...
// 예: node render.js 2026-11-27_피부양자탈락 thumb 피부양자_썸네일.png 1080 1080  info1 피부양자_인포1.png 1080 0
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const dir = path.resolve(process.argv[2]);
  const rest = process.argv.slice(3);
  // 그룹: html, png, w, h (w,h 선택; h=0이면 full_page)
  const jobs = [];
  for (let i = 0; i < rest.length; ) {
    const html = rest[i++], png = rest[i++];
    let w = 1080, h = 0;
    if (rest[i] && /^\d+$/.test(rest[i])) { w = parseInt(rest[i++], 10); if (rest[i] && /^\d+$/.test(rest[i])) h = parseInt(rest[i++], 10); }
    jobs.push({ html, png, w, h });
  }
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  for (const j of jobs) {
    const page = await browser.newPage({ viewport: { width: j.w, height: j.h || 1200 }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(dir, j.html + '.html'));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const out = path.join(dir, j.png);
    if (j.h && j.h > 0) {
      await page.setViewportSize({ width: j.w, height: j.h });
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    } else {
      await page.screenshot({ path: out, fullPage: true });
    }
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.log('rendered', out, kb + 'KB');
    await page.close();
  }
  await browser.close();
})();
