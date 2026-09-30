import test from "node:test";
import assert from "node:assert/strict";
import { scoreAnswers } from "../src/scoring.js";

test("all fours produce Strong Signal", () => {
  const result = scoreAnswers([4, 4, 4, 4, 4]);
  assert.equal(result.total, 20);
  assert.equal(result.band, "Strong Signal");
});

test("a one in questions 2-5 cannot remain above Risk Signal", () => {
  const result = scoreAnswers([4, 1, 4, 4, 4]);
  assert.equal(result.total, 17);
  assert.equal(result.band, "Risk Signal");
});

test("two ones produce Evidence Gap", () => {
  const result = scoreAnswers([1, 1, 4, 4, 4]);
  assert.equal(result.band, "Evidence Gap");
});

test("two low answers force Risk Signal", () => {
  const result = scoreAnswers([4, 2, 2, 4, 4]);
  assert.equal(result.band, "Risk Signal");
});

test("invalid answers fail closed", () => {
  assert.throws(() => scoreAnswers([4, 4, 4, 4]), TypeError);
  assert.throws(() => scoreAnswers([4, 4, 4, 4, 5]), TypeError);
});
