import { HMRPayload, Update } from "./hmrPayload";

interface ViteHotContext {
  accept(): void;
}
interface HotModule {
  id: string;
  callbacks: HotCallback[];
}
interface HotCallback {
  // the dependencies must be fetchable paths
  deps: string;
  fn: (modules: Record<string, any> | undefined) => void;
}

let socket: WebSocket;
const importMetaUrl = new URL(import.meta.url);
try {
  socket = setupWebSocket("ws", `${importMetaUrl.hostname}:24678`);
} catch (error) {
  console.error(`[vite] failed to connect to websocket (${error}). `);
}

function setupWebSocket(protocol: string, hostAndPath: string) {
  const socket = new WebSocket(`${protocol}://${hostAndPath}`);
  let isOpened = false;

  socket.addEventListener("open", () => {
    isOpened = true;
  });

  socket.addEventListener("message", async ({ data }) => {
    handleMessage(JSON.parse(data));
  });

  socket.addEventListener("close", async ({ wasClean }) => {
    if (wasClean) return;
    console.log(`[vite] server connection lost`);
  });

  return socket;
}

async function handleMessage(payload: HMRPayload) {
  switch (payload.type) {
    case "connected":
      console.debug(`[vite] connected.`);
      break;
    case "update":
      payload.updates.map(update => {
        if (update.type === "js-update") {
          queueUpdate(fetchUpdate(update));
        }
      });
      break;
    case "error":
      console.error(`[vite] Internal Server Error\n${payload.err}`);
      break;
    default: {
      return payload;
    }
  }
}

let pending = false;
let queued: Promise<(() => void) | undefined>[] = [];
async function queueUpdate(p: Promise<(() => void) | undefined>) {
  queued.push(p);
  if (!pending) {
    pending = true;
    await Promise.resolve();
    pending = false;
    const loading = [...queued];
    queued = [];
    (await Promise.all(loading)).forEach(fn => fn && fn());
  }
}

async function fetchUpdate({ path }: Update) {
  const mod = hotModulesMap.get(path);
  if (!mod) return;
  let fetchedModule: Record<string, any> | undefined;

  try {
    fetchedModule = await import(`${path}?t=${Date.now()}`);
  } catch (e) {
    console.error(`[hmr] Failed to reload ${path}. `);
  }

  return () => {
    for (const { deps, fn } of mod.callbacks) {
      fn(deps === path ? fetchedModule : undefined);
      console.debug(`[vite] hot updated: ${path}`);
    }
  };
}

const hotModulesMap = new Map<string, HotModule>();
export function createHotContext(ownerPath: string): ViteHotContext {
  const mod = hotModulesMap.get(ownerPath);
  if (mod) {
    mod.callbacks = [];
  }

  function acceptDeps(deps: string, callback: HotCallback["fn"] = () => {}) {
    const mod: HotModule = hotModulesMap.get(ownerPath) || {
      id: ownerPath,
      callbacks: [],
    };
    mod.callbacks.push({
      deps,
      fn: callback,
    });
    hotModulesMap.set(ownerPath, mod);
  }
  const hot: ViteHotContext = {
    accept(deps?: any) {
      if (typeof deps === "function") {
        acceptDeps(ownerPath, mod => deps?.(mod));
      }
    },
  };
  return hot;
}
