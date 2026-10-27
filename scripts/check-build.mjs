// Run after `npm run build` to check the Vercel SSR artifact without starting the API.
import assert from "node:assert/strict";

const { default: app } = await import(
  new URL("../.vercel/output/functions/__server.func/index.mjs", import.meta.url).href
);

for (const path of ["/", "/login", "/verify-email"]) {
  const response = await app.fetch(new Request(`http://localhost${path}`));
  const html = await response.text();
  assert.equal(response.status, 200, `${path}: SSR returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  assert.match(html, /<html\b/);
  assert.match(html, /Linqo/);
  console.log(`${path}: SSR OK`);
}
