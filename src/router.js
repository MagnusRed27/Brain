export const ROUTES = ["center", "drills", "progress", "records", "stim", "settings"];

/**
 * Parse hash into { route, param }.
 * Examples:
 *   #/center                 → { route: "center" }
 *   #/drills                 → { route: "drills" }
 *   #/drills/nback           → { route: "drills", param: "nback" }  (deep-link)
 */
function parseHashFull() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const route = parts[0] && ROUTES.includes(parts[0]) ? parts[0] : "center";
  const param = parts[1] || null;
  return { route, param };
}

export function createRouter({ onChange }) {
  let current = parseHashFull();

  function navigate(route, param = null) {
    if (!ROUTES.includes(route)) route = "center";
    const target = param ? `#/${route}/${param}` : `#/${route}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
      return;
    }
    if (route === current.route && param === current.param) return;
    current = { route, param };
    onChange(route, param);
  }

  window.addEventListener("hashchange", () => {
    const next = parseHashFull();
    if (next.route !== current.route || next.param !== current.param) {
      current = next;
      onChange(current.route, current.param);
    }
  });

  return {
    navigate,
    get current() { return current.route; },
    get param() { return current.param; },
    init() { onChange(current.route, current.param); },
  };
}
