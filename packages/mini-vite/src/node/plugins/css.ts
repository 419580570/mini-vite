import { CSS_LANGS_RE } from "../constants";

export const isCSSRequest = (request: string): boolean =>
  CSS_LANGS_RE.test(request);
