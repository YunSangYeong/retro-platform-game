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
  // Exercise the actual stage exit and transition, including carried progress.
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.score = 750;
    s.coins = 5;
    s.lives = 2;
    s.powered = true;
    s.player.setScale(1, 1.5);
    s.player.setPosition(s.level.width - 100, 180);
  });
  await p.waitForFunction(() => window.__gameScene.state === "clear");
  const carried = await p.evaluate(() => ({
    score: window.__gameScene.score,
    coins: window.__gameScene.coins,
    lives: window.__gameScene.lives,
  }));
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 1 &&
      window.__gameScene.state === "title",
  );
  assert.deepEqual(
    await p.evaluate(() => ({
      score: window.__gameScene.score,
      coins: window.__gameScene.coins,
      lives: window.__gameScene.lives,
    })),
    carried,
  );
  assert.ok(await p.evaluate(() => window.__gameScene.powered));
  assert.equal(await p.evaluate(() => window.__gameScene.remaining), 260);
  // The route itself starts with the carried growth state and uses controls only.
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  const drive = async () =>
    p.evaluate(
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
            if (
              jumping &&
              (s.stageIndex === 1 ? [9] : []).includes(next) &&
              frames - jumpFrame > 6
            )
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
              const points =
                s.stageIndex === 1
                  ? [
                      168, 288, 480, 590, 704, 992, 1100, 1216, 1400, 1504,
                      1616, 1728, 1900, 2016, 2128, 2240, 2350,
                    ]
                  : [
                      168, 256, 420, 528, 640, 868, 1088, 1316, 1536, 1764,
                      1984, 2212, 2432, 2600,
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
              resolve({
                state: s.state,
                x: p.x,
                lives: s.lives,
                frames,
                jumps,
              });
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
  const result = await drive();
  console.log(result);
  assert.equal(result.state, "clear");
  assert.equal(await p.evaluate(() => window.__gameScene.stageIndex), 1);
  assert.match(
    await p
      .locator("canvas")
      .count()
      .then(() => p.evaluate(() => window.__gameScene.overlay.list[2].text)),
    /WORLD 02 CLEAR/,
  );
  await p.evaluate(() => window.__gameScene.game.loop.wake());
  const afterCave = await p.evaluate(() => ({
    score: window.__gameScene.score,
    coins: window.__gameScene.coins,
    lives: window.__gameScene.lives,
    powered: window.__gameScene.powered,
  }));
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 2 &&
      window.__gameScene.state === "title",
  );
  assert.deepEqual(
    await p.evaluate(() => ({
      score: window.__gameScene.score,
      coins: window.__gameScene.coins,
      lives: window.__gameScene.lives,
      powered: window.__gameScene.powered,
    })),
    afterCave,
  );
  assert.equal(await p.evaluate(() => window.__gameScene.remaining), 280);
  assert.equal(
    await p.evaluate(() => window.__gameScene.overlay.list[2].text),
    "WORLD 03",
  );
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  const third = await drive();
  console.log("Stage 3:", third);
  assert.equal(third.state, "clear");
  assert.match(
    await p.evaluate(() => window.__gameScene.overlay.list[2].text),
    /ALL CLEAR/,
  );
  await p.evaluate(() => window.__gameScene.game.loop.wake());
  await p.screenshot({ path: "/tmp/moonleaf-stage3-clear.png" });

  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 0 &&
      window.__gameScene.state === "title",
  );
  assert.equal(await p.evaluate(() => window.__gameScene.lives), 3);
  assert.equal(await p.evaluate(() => window.__gameScene.score), 0);
  await p.evaluate(() => {
    window.__gameScene.scene.restart({ stageIndex: 1 });
  });
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 1 &&
      window.__gameScene.state === "title",
  );
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  const small = await drive();
  console.log("Small player:", small);
  assert.equal(small.state, "clear");
  await p.evaluate(() => {
    window.__gameScene.game.loop.wake();
    window.__gameScene.lives = 3;
    window.__gameScene.scene.restart({ stageIndex: 2 });
  });
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 2 &&
      window.__gameScene.state === "title",
  );
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  const thirdSmall = await drive();
  console.log("Stage 3 small:", thirdSmall);
  assert.equal(thirdSmall.state, "clear");
  await p.evaluate(() => {
    const s = window.__gameScene;
    s.game.loop.wake();
    s.lives = 3;
    s.scene.restart({ stageIndex: 2, powered: true });
  });
  await p.waitForFunction(
    () =>
      window.__gameScene.stageIndex === 2 &&
      window.__gameScene.state === "title" &&
      window.__gameScene.powered,
  );
  await p.waitForTimeout(120);
  await p.keyboard.press("Enter");
  const thirdBig = await drive();
  console.log("Stage 3 grown:", thirdBig);
  assert.equal(thirdBig.state, "clear");
  console.log(
    "PASS: three-stage progression, carried progress, stage 2 and 3 clear, final restart",
  );
} finally {
  await b.close();
}
