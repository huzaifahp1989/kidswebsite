import assert from "node:assert/strict";
import test from "node:test";
import { getLocalDate, getNextReminderAt } from "../../src/utils/activityReminderSchedule.js";

test("calculates the next reminder in the user's time zone", () => {
  assert.equal(
    getNextReminderAt("18:30", "America/New_York", new Date("2026-01-15T20:00:00.000Z")),
    "2026-01-15T23:30:00.000Z",
  );
  assert.equal(
    getNextReminderAt("18:30", "America/New_York", new Date("2026-07-15T20:00:00.000Z")),
    "2026-07-15T22:30:00.000Z",
  );
});

test("moves a reminder to tomorrow when today's local reminder time passed", () => {
  assert.equal(
    getNextReminderAt("08:00", "Asia/Kuala_Lumpur", new Date("2026-10-06T02:00:00.000Z")),
    "2026-10-07T00:00:00.000Z",
  );
});

test("moves nonexistent daylight-saving times to the next valid local time", () => {
  assert.equal(
    getNextReminderAt("02:30", "America/New_York", new Date("2026-03-08T00:00:00.000Z")),
    "2026-03-08T07:30:00.000Z",
  );
});

test("formats the local date used to pause completed missions", () => {
  assert.equal(
    getLocalDate(new Date("2026-10-06T23:30:00.000Z"), "Asia/Kuala_Lumpur"),
    "2026-10-07",
  );
});
