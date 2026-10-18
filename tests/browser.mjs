import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.GAME_URL || "http://localhost:5173");
  await page.waitForFunction(() => !!window.__gameScene?.player);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(() => window.__gameScene.state), "playing");
  assert.ok(
    await page.evaluate(() => window.__gameScene.player.body.blocked.down),
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");
  assert.ok(await page.evaluate(() => window.__gameScene.player.x > 45));
  await page.keyboard.press("p");
  assert.equal(await page.evaluate(() => window.__gameScene.state), "paused");
  await page.waitForTimeout(120);
  await page.keyboard.press("p");
  await page.waitForFunction(() => window.__gameScene.state === "playing");
  // Variable jump height, measured from a safe flat start.
  async function frames(n) {
    await page.evaluate(
      (n) =>
        new Promise((resolve) => {
          const s = window.__gameScene;
          let count = 0;
          const tick = () => {
            if (++count >= n) {
              s.events.off("update", tick);
              resolve();
            }
          };
          s.events.on("update", tick);
        }),
      n,
    );
  }
  async function jump(hold) {
    await page.evaluate(() => {
      const s = window.__gameScene;
      s.player.setPosition(40, 190).setVelocity(0);
    });
    await frames(20);
    await page.keyboard.down("z");
    await frames(hold);
    await page.keyboard.up("z");
    await frames(14 - hold);
    return page.evaluate(() => window.__gameScene.player.y);
  }
  const short = await jump(2),
    long = await jump(12);
  assert.ok(long < short - 8, `${long} vs ${short}`);
  await page.waitForTimeout(600);
  // Verify item underside contact and coin reward.
  await page.evaluate(() => {
    const s = window.__gameScene;
    s.player.setPosition(184, 198).setVelocity(0);
  });
  await page.waitForTimeout(200);
  const coins = await page.evaluate(() => window.__gameScene.coins);
  await page.keyboard.down("z");
  await page.waitForTimeout(240);
  await page.keyboard.up("z");
  assert.ok(await page.evaluate((n) => window.__gameScene.coins > n, coins));
  // Stomping removes an enemy using actual physics overlap.
  await page.evaluate(() => {
    const s = window.__gameScene;
    const e = s.foes.getFirstAlive();
    s.player.setPosition(e.x, e.y - 28).setVelocity(0, 90);
  });
  const foes = await page.evaluate(() => window.__gameScene.foes.countActive());
  await frames(18);
  assert.ok(
    await page.evaluate((n) => window.__gameScene.foes.countActive() < n, foes),
  );
  await page.locator("#mute").click();
  assert.equal(await page.locator("#mute").textContent(), "SOUND OFF");
  await page.locator("#mute").click();
  // Collision with a tall pipe must stop horizontal motion.
  await page.evaluate(() => {
    const s = window.__gameScene;
    s.player.setPosition(570, 198).setVelocity(0);
  });
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowRight");
  assert.ok(await page.evaluate(() => window.__gameScene.player.x < 592));
  await page.evaluate(() => {
    const s = window.__gameScene;
    s.invincible = 0;
    s.player.setPosition(400, 270);
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__gameScene.lives), 2);
  await page.evaluate(() => {
    const s = window.__gameScene;
    s.invincible = 0;
    s.hurt();
    s.invincible = 0;
    s.hurt();
  });
  assert.equal(await page.evaluate(() => window.__gameScene.state), "over");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__gameScene.state), "title");
  await page.keyboard.press("Enter");
  await page.evaluate(() => {
    window.__gameScene.player.setPosition(2200, 180);
  });
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.__gameScene.state), "clear");
  await page.screenshot({ path: "/tmp/moonleaf-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  assert.ok(
    await page.evaluate(
      () =>
        document.querySelector("canvas").getBoundingClientRect().right <=
        innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: start, movement, ground collision, variable jump, item block, pipe collision, death, game over, restart, clear, responsive canvas; no page errors",
  );
} finally {
  await browser.close();
}
