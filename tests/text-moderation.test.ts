import assert from "node:assert/strict";
import test from "node:test";
import { moderateText } from "../src/lib/text-moderation";
import { localTextViolation } from "../src/lib/content-policy";
import { blockModerationWarnings, profileModerationWarnings } from "../src/lib/moderation-warnings";
import { defaultProfile } from "../src/lib/link-store";
import { validateProfileContent, validateBlockContent } from "../src/lib/content-safety";

test("ordinary profanity, praise, self-expression and product criticism stay allowed", () => {
  for (const value of [
    "Бля, какой охуенный альбом!",
    "Этот трек пиздец как хорош",
    "Ты охуенно рисуешь",
    "Я заебался, но продолжаю работать",
    "Ты нарисовал идиота",
    "You drew an idiot",
    "Ты не полный идиот",
    "Ты сука гений",
    "Я сам мудак, забыл сохранить проект",
    "Этот сервис — полное говно, мне не понравился",
    "This fucking album is amazing",
    "This service is shit",
    "You make fucking great music",
    "Ты не идиот",
    "You are not an idiot",
    "Не убей себя на этой тренировке",
    "Don't kill yourself",
    "Не поддерживаю терроризм",
    "Не убивайте людей",
    "Я мусульманин",
    "Я гей",
    "Поддерживаю права женщин",
    "Голосуйте за нашу партию",
    "Пропаганда здорового образа жизни",
    "Критикую решения правительства",
    "Мат как средство выразительности",
  ]) {
    assert.equal(localTextViolation(value), null, value);
    assert.deepEqual(moderateText(value), [], value);
    assert.ok(validateProfileContent({ ...defaultProfile, bio: value }).profile, value);
  }
});

test("direct personal attacks and threats block with an actionable reason", () => {
  for (const value of [
    "Ты идиот",
    "Ты полный мудак",
    "@alex — ублюдок",
    "Иван Петров — дебил",
    "You are a fucking idiot",
    "Иди нахуй",
    "Fuck you",
    "Я тебя убью",
    "убей себя",
    "Сдохни",
    "I will rape you",
    "Kill yourself",
    "Ты дeбил",
    "Ты дурак",
    "Идиот ты",
    "Нужно убить всех мусульман",
  ]) {
    assert.ok(
      moderateText(value).some((f) => f.severity === "block"),
      value,
    );
    const checked = validateProfileContent({ ...defaultProfile, bio: value });
    assert.equal(checked.profile, null, value);
    assert.ok(checked.issues[0]?.message.length, value);
  }
});

test("hate and violent recruitment block while mentions and disagreement remain usable", () => {
  for (const value of [
    "Смерть всем евреям",
    "Убейте всех мусульман",
    "Все женщины недолюди",
    "All immigrants are subhuman",
    "Join ISIS",
    "Вступайте в ИГИЛ",
    "Поддерживаю терроризм",
    "Организуйте теракты",
    "Heil Hitler",
  ])
    assert.ok(
      moderateText(value).some((f) => f.severity === "block"),
      value,
    );
  for (const value of [
    "Исследую историю ИГИЛ",
    "Осуждаю терроризм",
    "Не поддерживаю нацизм",
    "Мусульмане заслуживают равных прав",
    "Christians and Muslims are welcome here",
  ])
    assert.deepEqual(moderateText(value), [], value);
});

test("reported abuse produces an advisory; one sentence cannot excuse a new threat", () => {
  for (const value of [
    "Мне написали: «убей себя»",
    "Не говорите «ты идиот»",
    'He wrote: "I will kill you"',
    "Осуждаю лозунг «Heil Hitler»",
    "Убей себя — это пример травли",
    "Почему фраза «ты идиот» обидна?",
    "Плохой пример: «Kill yourself»",
  ]) {
    const findings = moderateText(value);
    assert.ok(
      findings.some((f) => f.severity === "warning"),
      value,
    );
    assert.equal(
      findings.some((f) => f.severity === "block"),
      false,
      value,
    );
    assert.ok(validateProfileContent({ ...defaultProfile, bio: value }).profile, value);
  }
  for (const value of [
    "Я против насилия. Я тебя убью",
    "Не говорите «ты идиот», но ты мудак",
    'He wrote "I will kill you", but I will kill you',
  ])
    assert.ok(
      moderateText(value).some((f) => f.severity === "block"),
      value,
    );
});

test("reputational allegations are never declared false or automatically blocked", () => {
  for (const value of [
    "Иван Петров — мошенник",
    "@alex — вор",
    "Компания Ромашка ворует деньги клиентов",
    "This person is a scammer",
    "Иван Петров украл деньги",
  ]) {
    const findings = moderateText(value);
    assert.ok(
      findings.some((f) => f.category === "reputation_claim" && f.severity === "warning"),
      value,
    );
    assert.equal(localTextViolation(value), null, value);
    const profile = { ...defaultProfile, bio: value };
    assert.ok(validateProfileContent(profile).profile, value);
    assert.ok(
      profileModerationWarnings(profile).some((w) => w.path === "bio"),
      value,
    );
  }
  assert.deepEqual(moderateText("Мне не понравилось обслуживание, больше не пойду"), []);
});

test("rich text is moderated as a whole, preserving context across formatting", () => {
  const reported = {
    id: "text",
    type: "text" as const,
    textRuns: [{ text: "Не говорите «" }, { text: "убей себя", bold: true }, { text: "»" }],
  };
  assert.deepEqual(validateBlockContent(reported), []);
  assert.ok(blockModerationWarnings(reported).some((w) => w.path === "textRuns"));
  assert.ok(
    validateBlockContent({ ...reported, textRuns: [{ text: "Ты " }, { text: "мудак" }] }).length,
  );
  assert.ok(
    validateBlockContent({ ...reported, textRuns: [{ text: "Я тебя у" }, { text: "бью" }] }).length,
  );
  const nested = {
    ...defaultProfile,
    blocks: [
      {
        id: "faq",
        type: "faq" as const,
        faqItems: [{ id: "q", question: "О проекте", answer: "@alex — мошенник" }],
      },
    ],
  };
  assert.ok(profileModerationWarnings(nested).some((w) => w.path === "blocks.0.faqItems.0.answer"));
  assert.ok(validateProfileContent({ ...defaultProfile, blocks: [reported] }).profile);
});
