import { PartialResolvedId } from "rollup";
export type ResolvedUrl = [url: string, resolvedId: string];

export class ModuleNode {
  url: string;
  id: string | null = null;
  transformResult: string | null = null;
  constructor(url: string) {
    this.url = url;
  }
}

export class ModuleGraph {
  urlToModuleMap = new Map<string, ModuleNode>();
  idToModuleMap = new Map<string, ModuleNode>();
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

  async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
    const [url, resolvedId] = await this.resolveUrl(rawUrl);
    let mod = this.idToModuleMap.get(resolvedId);

    if (!mod) {
      mod = new ModuleNode(url);
      this.urlToModuleMap.set(url, mod);
      mod.id = resolvedId;
      this.idToModuleMap.set(resolvedId, mod);
    } else if (!this.urlToModuleMap.has(url)) {
      this.urlToModuleMap.set(url, mod);
    }

    return mod;
  }
  async resolveUrl(url: string, ssr?: boolean): Promise<ResolvedUrl> {
    const resolved = await this.resolveId(url);
    const resolvedId = resolved?.id || url;
    return [url, resolvedId];
  }
}
