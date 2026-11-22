const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const EVIDENCE_DIR = "C:/Users/Admin/.gemini/antigravity/brain/8b3974ec-68d8-4d5b-b362-6a27d700d685/acceptance_evidence";

async function runCapture() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Desktop Header & Hero
  console.log("Navigating to Homepage...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, "branding_desktop_homepage.png"),
  });
  console.log("Captured branding_desktop_homepage.png");

  // 2. Desktop Footer
  const footer = page.locator("footer");
  if (await footer.count() > 0) {
    await footer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "branding_desktop_footer.png"),
    });
    console.log("Captured branding_desktop_footer.png");
  }

  // 3. Admin Login & Dashboard
  console.log("Logging into Admin Dashboard...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="text"], input[type="email"], input[name="identifier"]', 'admin_new@routine.vn');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin**', { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, "branding_admin_dashboard.png"),
  });
  console.log("Captured branding_admin_dashboard.png");

  // 4. Mobile View
  console.log("Capturing Mobile View...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);

  // Take screenshot of mobile header
  await mobilePage.screenshot({
    path: path.join(EVIDENCE_DIR, "branding_mobile_homepage.png"),
  });
  console.log("Captured branding_mobile_homepage.png");

  // Try opening mobile drawer menu
  const menuBtn = mobilePage.locator('button[aria-label="Mở menu"], button[aria-label*="menu"]').first();
  if (await menuBtn.count() > 0) {
    await menuBtn.click();
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({
      path: path.join(EVIDENCE_DIR, "branding_mobile_drawer.png"),
    });
    console.log("Captured branding_mobile_drawer.png");
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

runCapture().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
