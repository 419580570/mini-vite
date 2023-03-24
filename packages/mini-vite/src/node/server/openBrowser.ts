import open from "open";
export function openBrowser(url: string, opt: boolean) {
  // The browser executable to open.
  // See https://github.com/sindresorhus/open#app for documentation.
  const browser = process.env.BROWSER || "";
  // if (browser.toLowerCase().endsWith(".js")) {
  //   return executeNodeScript(browser, url, logger);
  // } else if (browser.toLowerCase() !== "none") {
  //   const browserArgs = process.env.BROWSER_ARGS
  //     ? process.env.BROWSER_ARGS.split(" ")
  //     : [];
  //   return startBrowserProcess(browser, browserArgs, url);
  // }
  // return false;
}

// function startBrowserProcess(
//   browser: string | undefined,
//   browserArgs: string[],
//   url: string
// ) {
//   try {
//     const options: open.Options = browser
//       ? { app: { name: browser, arguments: browserArgs } }
//       : {};
//     open(url, options).catch(() => {}); // Prevent `unhandledRejection` error.
//     return true;
//   } catch (err) {
//     return false;
//   }
// }
