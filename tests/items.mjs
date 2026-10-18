import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const p = await b.newPage({ viewport: { width: 1000, height: 1000 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:5173");
  await p.waitForFunction(() => !!window.__gameScene?.player);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.player.setPosition(184, 198).setVelocity(0);
  });
  await p.waitForTimeout(150);
  await p.keyboard.down("z");
  await p.waitForTimeout(240);
  await p.keyboard.up("z");
  await p.waitForTimeout(500);
  const reward = await p.evaluate(() => {
    const s = window.__gameScene;
    return {
      used: s.solids.getChildren().find((b) => b.x === 176 && b.y === 160)
        ?.used,
      items: s.powerups.countActive(),
      coins: s.coins,
      ready: s.powerups.getFirstAlive()?.ready,
    };
  });
  assert.ok(reward.used);
  assert.equal(reward.items, 1);
  assert.ok(reward.ready);
  assert.ok(reward.coins >= 1);
  await p.evaluate(() => {
    const s = window.__gameScene,
      i = s.powerups.getFirstAlive();
    s.player.setPosition(i.x, i.y).setVelocity(0);
  });
  await p.waitForFunction(() => window.__gameScene.powered);
  await p.waitForFunction(() => window.__gameScene.player.body.height > 14);
  await p.screenshot({ path: "/tmp/moonleaf-retro-power.png", fullPage: true });
  const lives = await p.evaluate(() => window.__gameScene.lives);
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.invincible = 0;
    s.hurt();
  });
  assert.equal(await p.evaluate(() => window.__gameScene.powered), false);
  assert.equal(await p.evaluate(() => window.__gameScene.lives), lives);
  // A used block must never duplicate its reward.
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.player.setPosition(184, 198).setVelocity(0);
  });
  await p.waitForTimeout(300);
  const before = await p.evaluate(() => window.__gameScene.coins);
  await p.keyboard.down("z");
  await p.waitForTimeout(240);
  await p.keyboard.up("z");
  assert.equal(await p.evaluate(() => window.__gameScene.coins), before);
  assert.equal(
    await p.evaluate(() => window.__gameScene.powerups.countActive()),
    0,
  );
  // Falling while powered and invulnerable still costs a life.
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.powered = true;
    s.player.setScale(1, 1.5);
    s.invincible = 900;
    s.player.setPosition(400, 280);
  });
  await p.waitForTimeout(100);
  assert.equal(await p.evaluate(() => window.__gameScene.lives), lives - 1);
  assert.equal(await p.evaluate(() => window.__gameScene.powered), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: underside reward, emerging item, growth, damage protection, used-block single reward, powered pit death",
  );
} finally {
  await b.close();
}
