import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ChartContainer } from "../src/components/ui/chart";

test("chart CSS cannot turn IDs, keys or colors into HTML or CSS rules", () => {
  const html = renderToStaticMarkup(
    <ChartContainer
      id={'x"]{}body{color:red}'}
      config={{
        total: { color: "hsl(var(--chart-1))" },
        bad: { color: "red; } </style><script>alert(1)</script><style>" },
        ["x: red; } body { display:none"]: { color: "#ffffff" },
      }}
    >
      <div />
    </ChartContainer>,
  );
  assert.ok(html.includes("--color-total: hsl(var(--chart-1))"));
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("display:none"), false);
  assert.equal(html.includes("--color-bad:"), false);
});
