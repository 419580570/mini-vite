import { ViteDevServer } from ".";
import type { Update } from "../../client/hmrPayload";

export async function handleHMRUpdate(
  file: string,
  server: ViteDevServer
): Promise<void> {
  const { ws, moduleGraph } = server;
  const updates: Update[] = [];
  const mods = moduleGraph.getModulesByFile(file) || [];
  for (const mod of mods) {
    updates.push({ type: `${mod.type}-update`, path: mod.url });
  }
  ws.send({
    type: "update",
    updates,
  });
}
