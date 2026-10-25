import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import process from "node:process";
import express from "express";
import cookieParser from "cookie-parser";
import sharp from "sharp";
import { defaultProfile } from "../src/lib/link-store";
import { configureMediaInspector } from "./content-inspection";
import { errorHandler } from "./http-errors";
import { imageDimensions, validateBrowserFile } from "../src/lib/file-safety";

// No live database is contacted: every query is stubbed below.
process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
process.env.ABUSE_SECRET = "test-only-abuse-secret-at-least-32-characters";
const { pool } = await import("./db");
const { cleanImage, limitedUpload, checkUploadedFile } = await import("./content-security");
const { profilesRouter } = await import("./routes/profiles");
const { imagesRouter } = await import("./routes/images");
const { musicRouter } = await import("./routes/music");

test("browser dimension guards understand actual raster formats before decoding", async () => {
  for (const format of ["png", "jpeg", "webp", "gif"] as const) {
    const bytes = await sharp({
      create: { width: 16, height: 12, channels: 4, background: "#ff000080" },
    })
      .toFormat(format)
      .toBuffer();
    assert.deepEqual(imageDimensions(bytes), { width: 16, height: 12 }, format);
    await validateBrowserFile(
      new File([Uint8Array.from(bytes)], `photo.${format}`, { type: `image/${format}` }),
      "image",
    );
  }
  const giant = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } })
    .png()
    .toBuffer();
  giant.writeUInt32BE(100_000, 16);
  await assert.rejects(
    validateBrowserFile(
      new File([Uint8Array.from(giant)], "giant.png", { type: "image/png" }),
      "image",
    ),
    /too large/,
  );
  await assert.rejects(cleanImage(giant));
});

test("images are actually decoded, re-encoded and passed to the replaceable media inspector", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: "#ff0000" } })
    .png()
    .toBuffer();
  let inspected = false;
  configureMediaInspector(async (input) => {
    inspected = true;
    assert.equal(input.mime, "image/webp");
    return { status: "unreviewed" };
  });
  try {
    const clean = await cleanImage(
      Buffer.concat([png, Buffer.from("<script>trailing metadata</script>")]),
    );
    assert.equal((await sharp(clean).metadata()).format, "webp");
    assert.equal(clean.includes(Buffer.from("<script>")), false);
    assert.equal(inspected, true);
    await assert.rejects(cleanImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])));
    configureMediaInspector(async () => ({ status: "blocked" }));
    await assert.rejects(cleanImage(png), /rejected/);
    configureMediaInspector(async () => {
      throw new Error("Classifier unavailable");
    });
    await assert.rejects(cleanImage(png));
  } finally {
    configureMediaInspector(async () => ({ status: "unreviewed" }));
  }
});

test("HTTP routes enforce auth, schema, ownership, file decoding and upload limits", async () => {
  const queries: string[] = [];
  let owner: string | null = "owner";
  let lostRace = false;
  let assetOwner = "another-user";
  let storedImage: Buffer | undefined;
  const queryMock = test.mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    queries.push(sql);
    if (sql.includes("INSERT INTO abuse_counters")) return { rows: [{ hits: 1, retry_after: 60 }] };
    if (
      sql.startsWith("DELETE FROM abuse_counters") ||
      sql === "BEGIN" ||
      sql === "COMMIT" ||
      sql === "ROLLBACK" ||
      sql.startsWith("INSERT INTO publication_events") ||
      sql.startsWith("DELETE FROM publication_events")
    )
      return { rows: [] };
    if (sql.startsWith("SELECT created_at FROM users"))
      return { rows: [{ created_at: new Date(0) }] };
    if (sql.startsWith("SELECT data,owner_id,updated_at")) return { rows: [] };
    if (sql.startsWith("SELECT count(*)::int AS count FROM profiles"))
      return { rows: [{ count: 0 }] };
    if (sql.includes("FROM publication_events WHERE owner_id"))
      return { rows: [{ count: 0, elapsed: 86400, retry: 1 }] };
    if (sql.includes("FROM sessions"))
      return {
        rows: [{ id: "owner", email: "test@example.com", name: "Test", hasPassword: true }],
      };
    if (sql.startsWith("SELECT owner_id")) return { rows: [{ owner_id: owner }] };
    if (sql.startsWith("SELECT slug, data, mime_type"))
      return {
        rows: [
          {
            slug: "yourname",
            data: Buffer.alloc(16),
            mime_type: "audio/mpeg",
            uploaded_by: assetOwner,
          },
        ],
      };
    if (sql.startsWith("INSERT INTO profiles")) {
      assert.ok(sql.includes("WHERE profiles.owner_id = $3"));
      return { rows: lostRace ? [] : [{ slug: values[0] }] };
    }
    if (sql.startsWith("INSERT INTO og_images")) {
      storedImage = values[2] as Buffer;
      return { rows: [{ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }] };
    }
    throw new Error("Unexpected test query");
  });
  const connectMock = test.mock.method(
    pool,
    "connect",
    async () =>
      ({ query: pool.query.bind(pool), release() {} }) as unknown as import("pg").PoolClient,
  );
  const app = express();
  app.use(cookieParser(), express.json({ limit: "600kb" }));
  app.use("/api/profiles", profilesRouter);
  app.use("/api/images", imagesRouter);
  app.use("/api/music", musicRouter);
  app.post("/limit", limitedUpload("image"), (req, res) => res.json({ size: req.file?.size }));
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const headers = { "Content-Type": "application/json", Cookie: "linqo_session=test" };
  const put = (body: unknown) =>
    fetch(`${origin}/api/profiles/yourname`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
  const upload = (path: string, bytes: Uint8Array, type: string, name: string, auth = true) => {
    const form = new FormData();
    form.append("file", new Blob([Uint8Array.from(bytes)], { type }), name);
    return fetch(origin + path, {
      method: "POST",
      body: form,
      headers: auth ? { Cookie: "linqo_session=test" } : {},
    });
  };
  try {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } })
      .png()
      .toBuffer();
    assert.equal(
      (await upload("/api/music/yourname", png, "image/png", "fake.png", false)).status,
      401,
    );
    assert.equal(
      (await upload("/api/images/yourname", png, "image/png", "photo.png", false)).status,
      401,
    );
    owner = "other";
    assert.equal((await put(defaultProfile)).status, 403);
    assert.equal((await upload("/api/images/yourname", png, "image/png", "photo.png")).status, 403);
    owner = null;
    assert.equal((await put(defaultProfile)).status, 403);
    owner = "owner";
    assert.equal(
      (
        await put({
          ...defaultProfile,
          blocks: [{ id: "a", type: "link", url: "javascript:alert(1)" }],
        })
      ).status,
      422,
    );
    assert.equal((await put({ ...defaultProfile, slug: "another" })).status, 400);
    assert.equal(
      (await put({ ...defaultProfile, cover: "data:image/png;base64,aGVsbG8=" })).status,
      400,
    );
    assert.equal((await put(defaultProfile)).status, 200);
    assert.equal((await put({ ...defaultProfile, bio: "Ты мудак" })).status, 422);
    assert.equal((await put({ ...defaultProfile, bio: "Вступайте в ИГИЛ" })).status, 422);
    assert.equal(
      (await put({ ...defaultProfile, bio: "Бля, какой охуенный альбом!" })).status,
      200,
    );
    const allegation = await put({ ...defaultProfile, bio: "Иван Петров — мошенник" });
    assert.equal(allegation.status, 200);
    const reviewed = await allegation.json();
    assert.ok(
      reviewed.warnings.some(
        (w: { category: string; path: string }) =>
          w.category === "reputation_claim" && w.path === "bio",
      ),
    );
    for (const bio of [
      "<script>alert(1)</script>",
      "%253Cscript%253Ealert(1)%253C/script%253E",
      "const secret = 1;",
      "' OR 1=1 --",
    ])
      assert.equal((await put({ ...defaultProfile, bio })).status, 422, bio);
    assert.equal((await put({ ...defaultProfile, name: "O'Connor & Sons" })).status, 200);
    assert.equal(
      (await put({ ...defaultProfile, avatar: `data:image/png;base64,${png.toString("base64")}` }))
        .status,
      200,
    );
    lostRace = true;
    assert.equal((await put(defaultProfile)).status, 403);
    lostRace = false;
    assert.equal(
      (
        await put({
          ...defaultProfile,
          music: {
            enabled: true,
            url: "http://localhost:3001/api/music/file/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          },
        })
      ).status,
      400,
    );
    assetOwner = "owner";
    for (const cover of [
      "https://evil.example/api/images/file/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "https://evil.example/API/IMAGES/FILE/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/#fragment",
      "https://evil.example/api/images/file/%61aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    ])
      assert.equal((await put({ ...defaultProfile, cover })).status, 400);
    assert.equal(
      (
        await upload(
          "/api/images/yourname",
          new TextEncoder().encode("<script>fake png</script>"),
          "image/png",
          "photo.png",
        )
      ).status,
      400,
    );
    assert.equal((await upload("/api/images/yourname", png, "image/png", "photo.png")).status, 200);
    assert.equal((await sharp(storedImage!).metadata()).format, "webp");
    assert.equal(
      (
        await upload(
          "/limit",
          new Uint8Array(10 * 1024 * 1024 + 1),
          "image/png",
          "large.png",
          false,
        )
      ).status,
      413,
    );
    assert.equal(
      (await fetch(origin + "/api/profiles/yourname", { method: "PUT", headers, body: "{" }))
        .status,
      400,
    );
    assert.ok(queries.some((sql) => sql.startsWith("INSERT INTO og_images")));
    await assert.rejects(
      checkUploadedFile(
        {
          originalname: "payload.svg",
          mimetype: "image/svg+xml",
          size: 16,
          buffer: Buffer.alloc(16),
        } as Express.Multer.File,
        "image",
      ),
    );
  } finally {
    queryMock.mock.restore();
    connectMock.mock.restore();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
});
