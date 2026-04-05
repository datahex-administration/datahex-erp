import fs from "node:fs";
import path from "node:path";

const EMPTY_PNG = [
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 4, 0, 0, 0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84,
  120, 218, 99, 252, 255, 31, 0, 3, 3, 2, 0, 239, 151, 218, 42, 0, 0, 0, 0,
  73, 69, 78, 68, 174, 66, 96, 130,
];

const runtimeTargets = [
  ".open-next/server-functions/default/handler.mjs",
  ".open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js",
  ".open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js",
].map((relativePath) => path.join(process.cwd(), relativePath));

const ogImportPattern =
  /switch\s*\(\s*id\s*\)\s*\{\s*case\s*"next\/dist\/compiled\/@vercel\/og\/index\.node\.js":\s*raw\s*=\s*await import\("next\/dist\/compiled\/@vercel\/og\/index\.edge\.js"\);\s*break;\s*default:\s*raw\s*=\s*await import\(id\)\s*\}\s*;?/g;

const replacement = `if (
            id === "next/dist/compiled/@vercel/og/index.node.js" ||
            id === "next/dist/compiled/@vercel/og/index.edge.js"
        ) {
            raw = {
                ImageResponse: class ImageResponse extends Response {
                    static displayName = "ImageResponse";

                    constructor(...args) {
                        const options = args[1] || {};
                        const headers = new Headers({
                            "content-type": "image/png",
                            "cache-control": "public, max-age=0, must-revalidate",
                        });

                        if (options.headers) {
                            const extraHeaders = new Headers(options.headers);
                            extraHeaders.forEach((value, key) => headers.set(key, value));
                        }

                        super(new Uint8Array([${EMPTY_PNG.join(", ")}]), {
                            headers,
                            status: options.status,
                            statusText: options.statusText,
                        });
                    }
                },
            };
        } else {
            raw = await import(id);
        }`;

let patchedFiles = 0;

for (const filePath of runtimeTargets) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected OpenNext runtime file at ${filePath}`);
  }

  const current = fs.readFileSync(filePath, "utf8");
  const updated = current.replace(ogImportPattern, replacement);

  if (updated === current) {
    continue;
  }

  fs.writeFileSync(filePath, updated);
  patchedFiles += 1;
}

if (patchedFiles === 0) {
  throw new Error("Did not find any generated OG runtime imports to patch");
}