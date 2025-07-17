// utils/themeEventEmitter.ts

type Listener = () => void;

const listeners = new Set<Listener>();

export const themeEventEmitter = {
  emit: () => {
    for (const listener of listeners) {
      try {
        listener();
      } catch (e) {
        console.warn("Theme listener error:", e);
      }
    }
  },
  addListener: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
