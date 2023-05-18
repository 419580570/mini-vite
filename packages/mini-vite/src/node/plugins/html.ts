export interface HtmlTagDescriptor {
  tag: string;
  attrs?: Record<string, string | boolean | undefined>;
  children?: string | HtmlTagDescriptor[];
  /**
   * default: 'head-prepend'
   */
  injectTo?: "head" | "body" | "head-prepend" | "body-prepend";
}

const headPrependInjectRE = /([ \t]*)<head[^>]*>/i;

// export async function traverseHtml(
//   html: string,
//   visitor: (node: DefaultTreeAdapterMap["node"]) => void
// ): Promise<void> {
//   const { parse } = await import("parse5");
//   const ast = parse(html, {
//     sourceCodeLocationInfo: true,
//   });
//   traverseNodes(ast, visitor);
// }

// export function nodeIsElement(
//   node: DefaultTreeAdapterMap["node"]
// ): node is DefaultTreeAdapterMap["element"] {
//   return node.nodeName[0] !== "#";
// }

// function traverseNodes(
//   node: DefaultTreeAdapterMap["node"],
//   visitor: (node: DefaultTreeAdapterMap["node"]) => void
// ) {
//   visitor(node);
//   if (nodeIsElement(node)) {
//     node.childNodes.forEach(childNode => {
//       traverseNodes(childNode, visitor);
//     });
//   }
// }

export function injectToHead(
  html: string,
  tags: HtmlTagDescriptor[],
  prepend = false
) {
  if (prepend) {
    if (headPrependInjectRE.test(html)) {
      return html.replace(
        headPrependInjectRE,
        match => `${match}\n${serializeTags(tags)}`
      );
    }
  }
  return serializeTags(tags) + html;
}

function serializeTags(tags: HtmlTagDescriptor["children"]): string {
  if (typeof tags === "string") {
    return tags;
  } else if (tags && tags.length) {
    return tags.map(tag => `${serializeTag(tag)}\n`).join("");
  }
  return "";
}

function serializeTag({ tag, attrs, children }: HtmlTagDescriptor): string {
  return `<${tag}${serializeAttrs(attrs)}>${serializeTags(children)}</${tag}>`;
}

function serializeAttrs(attrs: HtmlTagDescriptor["attrs"]): string {
  let res = "";
  for (const key in attrs) {
    if (typeof attrs[key] === "boolean") {
      res += attrs[key] ? ` ${key}` : ``;
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`;
    }
  }
  return res;
}
