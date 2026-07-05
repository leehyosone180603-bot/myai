const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = "http://localhost:8099";
const OUT = path.resolve(__dirname, "..", "blog", "img");

const JOBS = [
  { name: "salary", path: "/salary/", steps: async (p) => { await p.fill("#salaryInput", "40000000"); await p.click("#calcBtn"); } },
  { name: "age", path: "/age/", steps: async (p) => { await p.fill("#birthInput", "1990-05-15"); await p.click("#calcBtn"); } },
  { name: "birth-year", path: "/birth-year/", steps: async (p) => { await p.fill("#ageInput", "51"); await p.click("#calcBtn"); } },
  { name: "business-days", path: "/business-days/", steps: async (p) => { await p.fill("#startInput", "2026-07-01"); await p.fill("#endInput", "2026-07-31"); await p.click("#calcBtn"); } },
  { name: "vat", path: "/vat/", steps: async (p) => { await p.fill("#amountInput", "1000000"); await p.click("#calcBtn"); } },
  { name: "severance", path: "/severance/", steps: async (p) => { await p.fill("#joinInput", "2020-01-02"); await p.fill("#leaveInput", "2026-01-01"); await p.fill("#wage3mInput", "9000000"); await p.click("#calcBtn"); } },
  { name: "freelancer", path: "/freelancer/", steps: async (p) => { await p.fill("#amountInput", "1000000"); await p.click("#calcBtn"); } },
  { name: "lotto-prize", path: "/lotto-prize/", steps: async (p) => { await p.fill("#amountInput", "2000000000"); await p.click("#calcBtn"); } },
  { name: "military", path: "/military/", steps: async (p) => { await p.fill("#enlistInput", "2025-01-06"); await p.click("#calcBtn"); } },
  { name: "lotto", path: "/lotto/", steps: async (p) => { await p.click("#generateBtn"); } }
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 700, height: 900 }, deviceScaleFactor: 2 });
  const dims = {};

  for (const job of JOBS) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + job.path, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.addStyleTag({ content: ".ad-container,.info,.site-footer{display:none!important} body{background:#f4f6fb}" });
      await job.steps(page);
      await page.waitForTimeout(500);
      const el = await page.$("main.container");
      const box = await el.boundingBox();
      dims[job.name] = { w: Math.round(box.width), h: Math.round(box.height) };
      await el.screenshot({ path: path.join(OUT, job.name + ".png") });
      console.log("captured", job.name, dims[job.name]);
    } catch (e) {
      console.log("FAIL", job.name, e.message);
    }
    await page.close();
  }

  fs.writeFileSync(path.join(OUT, "dims.json"), JSON.stringify(dims, null, 2));
  await browser.close();
  console.log("done");
})();
