import { ResolvedServerUrls } from "./server";
import colors from "picocolors";

export function printServerUrls(
  urls: ResolvedServerUrls,
  optionsHost: string | boolean | undefined
): void {
  const colorUrl = (url: string) =>
    colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`));
  for (const url of urls.local) {
    console.info(
      `  ${colors.green("➜")}  ${colors.bold("Local")}:   ${colorUrl(url)}`
    );
  }
  for (const url of urls.network) {
    console.info(
      `  ${colors.green("➜")}  ${colors.bold("Network")}: ${colorUrl(url)}`
    );
  }
  if (urls.network.length === 0 && optionsHost === undefined) {
    console.info(
      colors.dim(`  ${colors.green("➜")}  ${colors.bold("Network")}: use `) +
        colors.bold("--host") +
        colors.dim(" to expose")
    );
  }
}
