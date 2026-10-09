import { useLayoutEffect, useRef } from 'react';

const handlers = new Map();
let nextHandlerId = 0;

if (typeof window !== 'undefined') {
  window.__roomSplitBackHandlers = () => [...handlers.values()].map(({ priority }) => priority);
}

export const registerBackHandler = (handler, priority = 0) => {
  const id = nextHandlerId++;
  handlers.set(id, { handler, priority });
  return () => handlers.delete(id);
};

export const handleAppBack = () => {
  const activeHandlers = [...handlers.values()]
    .sort((first, second) => second.priority - first.priority);

  for (const { handler } of activeHandlers) {
    const handled = handler();
    if (handled) return true;
  }

  return false;
};

export const useBackHandler = (enabled, handler, priority = 0) => {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    return registerBackHandler(() => handlerRef.current(), priority);
  }, [enabled, priority]);
};