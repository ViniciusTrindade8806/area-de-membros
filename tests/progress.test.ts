import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeIntervals, watchedSeconds } from "../src/lib/course";
test("Repeated playback never counts twice", () =>
  assert.equal(
    watchedSeconds([
      [0, 10],
      [0, 10],
      [5, 15],
    ]),
    15,
  ));
test("Seeking leaves a gap in completion", () =>
  assert.equal(
    watchedSeconds([
      [0, 10],
      [90, 100],
    ]),
    20,
  ));
test("Intervals arriving out of order are merged", () =>
  assert.deepEqual(
    mergeIntervals([
      [20, 30],
      [0, 10],
      [8, 25],
    ]),
    [[0, 30]],
  ));
test("Invalid intervals cannot increase progress", () =>
  assert.equal(
    watchedSeconds([
      [-1, 50],
      [10, 2],
      [0, NaN],
      [0, 10],
    ]),
    10,
  ));
