import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.error('Opening McDonald\'s Taiwan full menu...');
await page.goto('https://www.mcdonalds.com/tw/zh-tw/full-menu.html', {
  waitUntil: 'networkidle',
  timeout: 60000,
});

// 等菜單卡片出現
await page.waitForSelector('[class*="menu"]', { timeout: 15000 }).catch(() => {});

const raw = await page.evaluate(() => {
  const results = [];

  // 嘗試抓所有品項卡片（常見 class pattern）
  const cards = document.querySelectorAll(
    '[class*="product"], [class*="menu-item"], [class*="item-card"], article, li'
  );

  cards.forEach(card => {
    const nameEl = card.querySelector(
      '[class*="name"], [class*="title"], h2, h3, h4, [class*="product-name"]'
    );
    const priceEl = card.querySelector(
      '[class*="price"], [class*="Price"]'
    );
    const catEl = card.closest('[class*="category"], [class*="Category"], section');
    const catName = catEl
      ? (catEl.querySelector('h1,h2,h3,h4,[class*="category-title"],[class*="section-title"]')?.textContent?.trim() ?? '')
      : '';

    if (nameEl && priceEl) {
      const name = nameEl.textContent.trim();
      const priceText = priceEl.textContent.trim();
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
      if (name && !isNaN(price)) {
        results.push({ category: catName, name, price });
      }
    }
  });

  return results;
});

await browser.close();

if (raw.length === 0) {
  // fallback: dump page HTML structure for debugging
  console.error('No items found with card selector, check page structure.');
  process.exit(1);
}

// Deduplicate
const seen = new Set();
const items = raw.filter(item => {
  const key = item.name + item.price;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(JSON.stringify(items, null, 2));
