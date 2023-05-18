import { PartialResolvedId } from "rollup";
import { cleanUrl, removeTimestampQuery } from "../util";
import { isCSSRequest } from "../plugins/css";
export type ResolvedUrl = [url: string, resolvedId: string];

export class ModuleNode {
  url: string;
  id: string | null = null;
  type: "js" | "css";
  transformResult: string | null = null;
  constructor(url: string) {
    this.url = url;
    this.type = isCSSRequest(url) ? "css" : "js";
  }
}

export class ModuleGraph {
  urlToModuleMap = new Map<string, ModuleNode>();
  idToModuleMap = new Map<string, ModuleNode>();
  fileToModulesMap = new Map<string, Set<ModuleNode>>();
  constructor(
    private resolveId: (url: string) => Promise<PartialResolvedId | null>
  ) {}
  async getModuleByUrl(
    rawUrl: string,
    ssr?: boolean
  ): Promise<ModuleNode | undefined> {
    const [url] = await this.resolveUrl(rawUrl, ssr);
    return this.urlToModuleMap.get(url);
  }

  getModuleById(id: string): ModuleNode | undefined {
    return this.idToModuleMap.get(id);
  }

  getModulesByFile(file: string): Set<ModuleNode> | undefined {
    return this.fileToModulesMap.get(file);
  }

  onFileChange(file: string): void {
    const mods = this.getModulesByFile(file);
    if (mods) {
      mods.forEach(mod => {
        this.invalidateModule(mod);
      });
    }
  }

  invalidateModule(mod: ModuleNode) {
    mod.transformResult = null;
  }

  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    const [url, resolvedId] = await this.resolveUrl(rawUrl);
    let mod = this.idToModuleMap.get(resolvedId);

    if (!mod) {
      mod = new ModuleNode(url);
      this.urlToModuleMap.set(url, mod);
      mod.id = resolvedId;
      this.idToModuleMap.set(resolvedId, mod);
      const file = cleanUrl(resolvedId);
      let fileMappedModules = this.fileToModulesMap.get(file);
      if (!fileMappedModules) {
        fileMappedModules = new Set();
        this.fileToModulesMap.set(file, fileMappedModules);
      }
      fileMappedModules.add(mod);
    } else if (!this.urlToModuleMap.has(url)) {
      this.urlToModuleMap.set(url, mod);
    }

    return mod;
  }
  async resolveUrl(url: string, ssr?: boolean): Promise<ResolvedUrl> {
    url = removeTimestampQuery(url);
    const resolved = await this.resolveId(url);
    const resolvedId = resolved?.id || url;
    return [url, resolvedId];
  }
}
