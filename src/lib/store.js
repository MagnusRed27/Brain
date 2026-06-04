export function createStore(initial) {
  let value = initial;
  const subscribers = new Set();

  function get() {
    return value;
  }

  function set(next) {
    const resolved = typeof next === "function" ? next(value) : next;
    if (resolved === value) return value;
    const prev = value;
    value = resolved;
    for (const fn of [...subscribers]) {
      try {
        fn(value, prev);
      } catch (error) {
        console.warn("[store] subscriber error", error);
      }
    }
    return value;
  }

  function update(patch) {
    return set((current) => ({ ...current, ...patch }));
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  return { get, set, update, subscribe };
}

export function select(store, selector, onChange) {
  let last = selector(store.get());
  return store.subscribe((value) => {
    const next = selector(value);
    if (next !== last) {
      const prev = last;
      last = next;
      onChange(next, prev);
    }
  });
}
