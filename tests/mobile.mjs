import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const p = await b.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await p.goto("http://localhost:5173");
  await p.waitForFunction(() => !!window.__gameScene?.player);
  await p.locator("canvas").tap();
  await p.waitForTimeout(300); // Dispatch with actual active pointers through CDP for simultaneous touch input.
  const c = await p.context().newCDPSession(p);
  const r = await p.locator('[data-key="right"]').boundingBox(),
    j = await p.locator('[data-key="jump"]').boundingBox();
  await c.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 },
      { x: j.x + j.width / 2, y: j.y + j.height / 2, id: 2 },
    ],
  });
  await p.waitForTimeout(300);
  const pos = await p.evaluate(() => ({
    x: window.__gameScene.player.x,
    y: window.__gameScene.player.y,
  }));
  await c.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.ok(pos.x > 35 && pos.y < 190, JSON.stringify(pos));
  await p.screenshot({ path: "/tmp/moonleaf-mobile.png", fullPage: true });
  console.log("PASS: mobile simultaneous move + jump and responsive controls");
} finally {
  await b.close();
}
