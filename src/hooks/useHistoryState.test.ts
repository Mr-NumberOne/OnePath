import { describe, expect, it } from "vitest";
import { History, historyReducer } from "./useHistoryState";

const start: History<number> = { past: [], present: 0, future: [] };
const set = (value: number, merge = false) => ({ type: "set" as const, updater: () => value, merge });

describe("historyReducer", () => {
  it("records changes and undoes/redoes them in order", () => {
    let state = historyReducer(start, set(1));
    state = historyReducer(state, set(2));
    expect(state).toEqual({ past: [0, 1], present: 2, future: [] });

    state = historyReducer(state, { type: "undo" });
    expect(state).toEqual({ past: [0], present: 1, future: [2] });

    state = historyReducer(state, { type: "redo" });
    expect(state).toEqual({ past: [0, 1], present: 2, future: [] });
  });

  it("drops the redo stack after a new change", () => {
    let state = historyReducer(start, set(1));
    state = historyReducer(state, { type: "undo" });
    state = historyReducer(state, set(5));
    expect(state).toEqual({ past: [0], present: 5, future: [] });
  });

  it("merges rapid changes into one undo step", () => {
    let state = historyReducer(start, set(1));
    state = historyReducer(state, set(2, true));
    state = historyReducer(state, set(3, true));
    expect(state.past).toEqual([0]);
    expect(historyReducer(state, { type: "undo" }).present).toBe(0);
  });

  it("does not merge into an empty history", () => {
    const state = historyReducer(start, set(1, true));
    expect(state.past).toEqual([0]);
  });

  it("ignores no-op changes and undo/redo at the ends", () => {
    expect(historyReducer(start, set(0))).toBe(start);
    expect(historyReducer(start, { type: "undo" })).toBe(start);
    expect(historyReducer(start, { type: "redo" })).toBe(start);
  });

  it("caps the history at 100 steps", () => {
    let state = start;
    for (let i = 1; i <= 150; i++) state = historyReducer(state, set(i));
    expect(state.past).toHaveLength(100);
    expect(state.past[0]).toBe(50);
  });

  it("reset clears both stacks", () => {
    const state = historyReducer({ past: [1], present: 2, future: [3] }, { type: "reset", value: 9 });
    expect(state).toEqual({ past: [], present: 9, future: [] });
  });
});
