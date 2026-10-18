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
