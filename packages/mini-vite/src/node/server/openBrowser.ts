import open from "open";
export function openBrowser(url: string, opt: boolean) {
  // const browser = process.env.BROWSER || "";
  try {
    open(url, {}).catch(() => {});
    return true;
  } catch (err) {
    return false;
  }
}
// const supportedChromiumBrowsers = [
//   "Google Chrome Canary",
//   "Google Chrome Dev",
//   "Google Chrome Beta",
//   "Google Chrome",
//   "Microsoft Edge",
//   "Brave Browser",
//   "Vivaldi",
//   "Chromium",
// ];
