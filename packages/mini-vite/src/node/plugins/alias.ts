import { Plugin } from "../plugin";
export interface Alias {
  find: string | RegExp;
  replacement: string;
}

export function aliasPlugin(options: { entries: Alias[] }): Plugin {
  if (options.entries.length === 0) {
    return {
      name: "alias",
      resolveId: () => null,
    };
  }
  return {
    name: "alias",
    resolveId(importee) {
      if (!importee) return null;
      const matchedEntry = options.entries.find(entry => {
        if (entry.find instanceof RegExp) {
          return entry.find.test(importee);
        }
        if (importee.length < entry.find.length) {
          return false;
        }
        if (importee === entry.find) {
          return true;
        }
        return importee.startsWith(entry.find + "/");
      });
      if (!matchedEntry) {
        return null;
      }

      return importee.replace(matchedEntry.find, matchedEntry.replacement);
    },
  };
}
