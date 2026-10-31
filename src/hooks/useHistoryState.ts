import { useCallback, useReducer, useRef } from "react";

// Undo/redo history for a single value. Rapid changes (typing) within
// COALESCE_MS are merged into one undo step.

const MAX_HISTORY = 100;
const COALESCE_MS = 1000;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export type HistoryAction<T> =
  | { type: "set"; updater: (prev: T) => T; merge: boolean }
  | { type: "reset"; value: T }
  | { type: "undo" }
  | { type: "redo" };

export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case "set": {
      const next = action.updater(state.present);
      if (Object.is(next, state.present)) return state;
      if (action.merge && state.past.length > 0) {
        return { past: state.past, present: next, future: [] };
      }
      return { past: [...state.past, state.present].slice(-MAX_HISTORY), present: next, future: [] };
    }
    case "reset":
      return { past: [], present: action.value, future: [] };
    case "undo": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, state.present], present: next, future: rest };
    }
  }
}

export function useHistoryState<T>(initial: T) {
  const [history, dispatch] = useReducer(historyReducer<T>, { past: [], present: initial, future: [] });
  const lastSetAt = useRef(0);

  const set = useCallback((updater: (prev: T) => T) => {
    const now = Date.now();
    const merge = now - lastSetAt.current < COALESCE_MS;
    lastSetAt.current = now;
    dispatch({ type: "set", updater, merge });
  }, []);

  // A new undo step starts after undo, redo or reset
  const breakMerge = () => { lastSetAt.current = 0; };

  const reset = useCallback((value: T) => { breakMerge(); dispatch({ type: "reset", value }); }, []);
  const undo = useCallback(() => { breakMerge(); dispatch({ type: "undo" }); }, []);
  const redo = useCallback(() => { breakMerge(); dispatch({ type: "redo" }); }, []);

  return {
    value: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
