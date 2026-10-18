import { test } from "node:test";
import assert from "node:assert/strict";
import { WIDTH, gaps, blocks, pipes, isGap } from "../src/level.js";
test("stage has safe start and finish and traversable gaps", () => {
  assert.ok(!isGap(32));
  assert.ok(!isGap(2214));
  for (const [a, b] of gaps) {
    assert.ok(b - a <= 48);
    assert.ok(a > 256 && b < WIDTH - 200);
    assert.ok(isGap(a));
    assert.ok(!isGap(b));
  }
});
test("obstacles are tile aligned and remain within stage", () => {
  for (const [x, y] of blocks) {
    assert.equal(x % 16, 0);
    assert.ok(y >= 128 && y <= 160);
    assert.ok(x < WIDTH);
  }
  for (const [x, h] of pipes) {
    assert.ok(!isGap(x) && !isGap(x + 16));
    assert.ok(h <= 48);
  }
});

test("both stages have safe exits, supported obstacles and increasing challenge", async () => {
  const { stages } = await import("../src/level.js");
  assert.equal(stages.length, 2);
  for (const stage of stages) {
    const hole = (x) => stage.gaps.some(([a, b]) => x >= a && x < b);
    assert.ok(!hole(32) && !hole(stage.width - 106));
    for (const [a, b] of stage.gaps) {
      assert.ok(a % 16 === 0 && b % 16 === 0);
      assert.ok(b - a <= 64);
      assert.ok(a >= 256 && b < stage.width - 200);
    }
    for (const [x, h] of stage.pipes) {
      assert.ok(!hole(x) && !hole(x + 27));
      assert.ok(h <= 48);
    }
    for (const [x, y] of stage.blocks) {
      assert.ok(x % 16 === 0 && y % 16 === 0);
      assert.ok(x < stage.width - 120 && y >= 128 && y <= 160);
    }
  }
  assert.ok(stages[1].width > stages[0].width);
  assert.ok(stages[1].gaps.some(([a, b]) => b - a === 64));
});
