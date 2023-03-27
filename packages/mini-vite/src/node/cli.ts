import { cac } from "cac";
import { ServerOptions } from "./server";
const cli = cac("mini-vite");
// global options
interface GlobalCLIOptions {
  "--"?: string[];
  c?: boolean | string;
  config?: string;
  base?: string;
  l?: "error" | "warn" | "info" | "silent";
  logLevel?: "error" | "warn" | "info" | "silent";
  clearScreen?: boolean;
  d?: boolean | string;
  debug?: boolean | string;
  f?: string;
  filter?: string;
  m?: string;
  mode?: string;
  force?: boolean;
}

function cleanOptions(options: any) {
  const ret = { ...options };
  delete ret["--"];
  delete ret.c;
  delete ret.config;
  delete ret.base;
  delete ret.l;
  delete ret.logLevel;
  delete ret.clearScreen;
  delete ret.d;
  delete ret.debug;
  delete ret.f;
  delete ret.filter;
  delete ret.m;
  delete ret.mode;
  return ret;
}

cli
  .option("-c, --config <file>", `[string] use specified config file`) //	使用指定的配置文件 (string)
  .option("--base <path>", `[string] public base path (default: /)`) // 公共基础路径（默认为：/）(string)
  .option("-l, --logLevel <level>", `[string] info | warn | error | silent`) // Info | warn | error | silent (string)
  .option("--clearScreen", `[boolean] allow/disable clear screen when logging`) // 允许或禁用打印日志时清除屏幕 (boolean)
  .option("-d, --debug [feat]", `[string | boolean] show debug logs`) // 	显示调试日志 (string | boolean)
  .option("-f, --filter <filter>", `[string] filter debug logs`) // 过滤调试日志 (string)
  .option("-m, --mode <mode>", `[string] set env mode`); // 设置环境模式 (string)

// dev
cli
  .command("[root]", "start dev server") // default command
  .alias("serve") // the command is called 'serve' in Vite's API
  .alias("dev") // alias to align with the script name
  .option("--host [host]", `[string] specify hostname`)
  .option("--port <port>", `[number] specify port`)
  .option("--https", `[boolean] use TLS + HTTP/2`)
  .option("--open [path]", `[boolean | string] open browser on startup`)
  .option("--cors", `[boolean] enable CORS`)
  .option("--strictPort", `[boolean] exit if specified port is already in use`)
  .option(
    "--force",
    `[boolean] force the optimizer to ignore the cache and re-bundle`
  )
  .action(async (root: string, options: ServerOptions & GlobalCLIOptions) => {
    const { createServer } = await import("./server");

    try {
      const server = await createServer({
        root,
        base: options.base,
        mode: options.mode,
        configFile: options.config,
        logLevel: options.logLevel,
        clearScreen: options.clearScreen,
        optimizeDeps: { force: options.force },
        server: cleanOptions(options),
      });

      await server.listen();

      server.printUrls();
    } catch (e) {}
  });

cli.parse();
