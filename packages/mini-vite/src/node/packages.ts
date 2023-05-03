import fs from "node:fs";
import path from "node:path";
import { resolveFrom } from "./util";

export interface PackageData {
  dir: string;
  data: {
    [field: string]: any;
    name: string;
    type: string;
    version: string;
    main: string;
    module: string;
    browser: string | Record<string, string | false>;
    exports: string | Record<string, any> | string[];
    imports: Record<string, any>;
    dependencies: Record<string, string>;
  };
}

export function resolvePackageData(id: string, basedir: string) {
  let pkgPath: string | undefined;
  let pkg: PackageData | undefined;
  try {
    pkgPath = resolveFrom(`${id}/package.json`, basedir);
    pkg = loadPackageData(pkgPath);
    return pkg;
  } catch (e) {
    console.log(`Parsing failed: ${pkgPath}`);
  }
  return null;
}

export function loadPackageData(pkgPath: string) {
  const data = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const pkgDir = path.dirname(pkgPath);

  const pkg: PackageData = {
    dir: pkgDir,
    data,
  };

  return pkg;
}
