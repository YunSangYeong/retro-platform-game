import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const p = await b.newPage();
  await p.goto("http://localhost:5173");
  await p.waitForFunction(() => !!window.__gameScene?.player);
  await p.keyboard.press("Enter");
  const result = await p.evaluate(
    () =>
      new Promise((resolve) => {
        const s = window.__gameScene;
        let frames = 0,
          release = 0,
          jumping = false,
          air = false,
          jumpStart = 0,
          jumpFrame = 0;
        const jumps = [];
        let next = 0;
        function tick() {
          frames++;
          const p = s.player;
          const ground = p.body.blocked.down;
          if (p.x < 100 && next > 0) {
            next = 0;
            jumping = false;
            air = false;
          }
          if (jumping && [4, 12].includes(next) && frames - jumpFrame > 6)
            s.keys.jump.isDown = false;
          s.keys.right.isDown = true;
          s.keys.run.isDown = true;
          if (jumping && !ground) air = true;

          if (jumping && air && frames - jumpFrame > 9 && ground) {
            jumping = false;
            air = false;
            release = 4;
          }
          if (release > 0) {
            s.keys.jump.isDown = false;
            s.keys.right.isDown = false;
            release--;
          } else if (!jumping && ground) {
            const points = [
              300, 430, 554, 655, 742, 832, 900, 1018, 1126, 1230, 1320, 1440,
              1542, 1640, 1790, 1915, 2010, 2100,
            ];
            let danger = next < points.length && p.x >= points[next];
            if (danger) {
              next++;
              jumping = true;
              jumpStart = p.x;
              jumpFrame = frames;
              s.keys.jump.isDown = true;
              jumps.push(Math.round(p.x));
            } else s.keys.jump.isDown = false;
          }
          if (s.state !== "playing" || frames > 3600) {
            s.events.off("postupdate", tick);
            resolve({ state: s.state, x: p.x, lives: s.lives, frames, jumps });
          }
        }
        s.events.on("postupdate", tick);
        // Advance the real Phaser scene with fixed frame deltas, without waiting for rendering.
        s.game.loop.sleep();
        const start = s.game.loop.time;
        for (let i = 0; i < 3602 && s.state === "playing"; i++)
          s.game.headlessStep(start + (i * 1000) / 60, 1000 / 60);
      }),
  );
  console.log(result);
  assert.equal(result.state, "clear");
} finally {
  await b.close();
}
