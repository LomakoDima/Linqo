// Local, deterministic RU/EN heuristics. No fact checking, legal verdicts or
// semantic model. Strong findings block; uncertain context asks for review.
export type ModerationCategory =
  "threat" | "harassment" | "hate" | "violent_promotion" | "reputation_claim";
export type ModerationFinding = {
  category: ModerationCategory;
  severity: "block" | "warning";
  message: string;
};

const MESSAGES: Record<ModerationCategory, string> = {
  threat: "Remove threats, wishes of death or encouragement to harm someone.",
  harassment:
    "Rephrase the personal attack. Strong language is allowed; targeted humiliation is not.",
  hate: "Remove calls to harm, dehumanise or deny rights to a group of people.",
  violent_promotion:
    "Remove support for violent extremism, recruitment or encouragement of attacks.",
  reputation_claim:
    "Check this claim about a person or organisation. The local check cannot verify it; distinguish opinion from a factual accusation.",
};
const REPORT_MESSAGE =
  "This may be a quotation, report or condemnation of abuse. Check that the context is clear to readers.";
const edge = "(?=$|[^\\p{L}\\p{N}_])";
const left = "(?:^|[^\\p{L}\\p{N}_])";
const cyrillicShapes: Record<string, string> = {
  a: "а",
  c: "с",
  e: "е",
  o: "о",
  p: "р",
  x: "х",
  y: "у",
  k: "к",
  m: "м",
  t: "т",
  h: "н",
  b: "в",
};
const groups =
  "(?:евре(?:и|ев|ям)|мусульман[\\p{L}]*|христиан[\\p{L}]*|русск[\\p{L}]*|украинц[\\p{L}]*|казах[\\p{L}]*|мигрант[\\p{L}]*|женщин[\\p{L}]*|мужчин[\\p{L}]*|ге(?:и|ев|ям)|лесбиян[\\p{L}]*|трансгендер[\\p{L}]*|инвалид[\\p{L}]*|jews|muslims|christians|russians|ukrainians|kazakhs|immigrants|women|men|gay people|trans people|black people|disabled people)";
const insults =
  "(?:идиот[\\p{L}]*|дебил[\\p{L}]*|дурак[\\p{L}]*|дура|кретин[\\p{L}]*|тупица|мудак[\\p{L}]*|мудил[\\p{L}]*|долбо[её]б[\\p{L}]*|ублюд[\\p{L}]*|мраз[ьия][\\p{L}]*|твар[ьи][\\p{L}]*|урод(?:ина|ы|ом|ка)?|пидор[\\p{L}]*|ничтожество|сука|гандон|чмо|idiot|moron|scumbag|cunt|bitch|asshole|dumbass|piece of shit|worthless loser)";
const explicitTarget =
  /(?:^|[^\p{L}\p{N}_])(?:ты|вы|you(?:'re)?|u|@[\p{L}\p{N}_-]{1,64}|этот человек|эта девушка|этот парень|this person)(?:\s|[,—:–-])+(?:(?:ты|вы|просто|полный|полная|полное|настоящий|конченый|ебаный|гр[её]баный|вообще|такой|такая|не|совсем|самый|are|is|a|an|fucking|complete|utter|just|such|not)[\s,—:–-]+){0,5}$/iu;
const suffixTarget = /^[\s,—:–-]+(?:ты|вы|you|@[\p{L}\p{N}_-]{1,64})(?=$|[^\p{L}\p{N}_])/iu;
const namedTarget =
  /(?:^|\s)[A-ZА-ЯЁ][a-zа-яё]{1,29}\s+[A-ZА-ЯЁ][a-zа-яё]{1,29}(?:\s*[—:–-]\s*|\s+(?:is|это)\s+)(?:[\p{L}'-]+\s+){0,3}$/u;
const claimTarget =
  /(?:@[\p{L}\p{N}_-]{1,64}|(?:ты|вы|он|она|you|he|she|they|этот человек|this person)|(?:компания|банк|магазин|сервис|организация|company|bank|shop)\s+[\p{L}\p{N}«»"'_-]{1,40})[\s,—:–-]*(?:(?:это|is|are|известный|настоящий|a|an)\s+){0,3}$/iu;
const claimName =
  /(?:^|\s)[A-ZА-ЯЁ][a-zа-яё]{1,29}(?:\s+[A-ZА-ЯЁ][a-zа-яё]{1,29}){0,2}\s*[—:–-]\s*(?:(?:известный|настоящий|a|an)\s+){0,2}$/u;
const claimVerbName = /(?:^|\s)[A-ZА-ЯЁ][a-zа-яё]{1,29}\s+[A-ZА-ЯЁ][a-zа-яё]{1,29}\s+$/u;
const praiseAfter =
  /^[\s,—:–-]+(?:гений|молодец|легенда|талант|лучший|лучшая|genius|legend|amazing|brilliant)(?=$|[^\p{L}\p{N}_])/iu;
const reportBefore =
  /(?:не\s+(?:говорите|говори|пишите|пиши|называйте|называй)|(?:он|она|мне|они)\s+(?:написал[аи]?|сказал[аи]?|угрожал[аи]?)|цитат[аыу]|цитирую|фраз[аыуе]|лозунг[а-я]*|контрпример|плохой\s+пример|пример\s+(?:угрозы|оскорбления|травли)|осуждаю\s+(?:фразу|лозунг)|(?:do not|don't|never)\s+(?:ever\s+)?(?:say|write|call)|(?:he|she|they)\s+(?:said|wrote|threatened)|example of (?:abuse|a threat)|the (?:phrase|slogan)|condemn the (?:slogan|phrase))[^.!?;\n]{0,100}$/iu;
const reportAfter =
  /^[\s"'»”]*[—:–-]?\s*(?:это\s+(?:пример\s+)?(?:угроз[аы]|оскорблени[ея]|травл[яи]|разжигани[ея])|is\s+(?:an?\s+)?(?:example of\s+)?(?:abuse|a threat|harassment))/iu;
const negationBefore =
  /(?:^|[^\p{L}])(?:не|нельзя|запрещено|противопоказано|don't|never|not|do not)\s+(?:(?:нужно|надо|стоит|совсем|полный|should|ever|an?|fucking|complete|такой|такая|какой-то)\s+){0,2}[«"“']?\s*$/iu;
const oppositionAfter =
  /^[\s"'»”]*[—:–-]?\s*(?:это\s+)?(?:недопустимо|недопустимы|неприемлемо|запрещено|не\s+поддерживаю|is\s+(?:wrong|unacceptable)|are\s+unacceptable)/iu;

type Rule = { category: ModerationCategory; pattern: RegExp; target?: "insult" | "claim" };
const rules: Rule[] = [
  {
    category: "threat",
    pattern: new RegExp(
      left +
        "(?:я\\s+тебя\\s+(?:убью|зарежу|изнасилую)|я\\s+вас\\s+убью|изнасилую\\s+тебя|убей(?:те)?\\s+себя|сдохни(?:те)?|i\\s+will\\s+(?:kill|rape)\\s+you|kill\\s+yourself|you\\s+should\\s+(?:die|kill\\s+yourself))" +
        edge,
      "giu",
    ),
  },
  {
    category: "threat",
    pattern: new RegExp(
      left +
        "(?:убивайте|убейте|расстреляйте|уничтожьте|kill|murder)\\s+(?:всех\\s+|all\\s+)?(?:людей|people|детей|children|разработчиков|developers|" +
        groups +
        ")" +
        edge,
      "giu",
    ),
  },
  {
    category: "hate",
    pattern: new RegExp(
      left +
        "(?:смерть\\s+всем\\s+" +
        groups +
        "|(?:все\\s+|all\\s+)?" +
        groups +
        "\\s+(?:(?:это|are)\\s+)?(?:недолюди|низшая\\s+раса|должны\\s+умереть|не\\s+заслуживают\\s+прав|subhuman|inferior|should\\s+die|deserve\\s+no\\s+rights))" +
        edge,
      "giu",
    ),
  },
  {
    category: "threat",
    pattern: new RegExp(
      left +
        "(?:нужно|надо|следует|давайте)\\s+(?:убить|уничтожить|расстрелять)\\s+(?:всех\\s+)?(?:человека|людей|детей|его|е[её]|тебя|@[\\p{L}\\p{N}_-]{1,64}|" +
        groups +
        ")" +
        edge,
      "giu",
    ),
  },
  {
    category: "violent_promotion",
    pattern: new RegExp(
      left +
        "(?:heil\\s+hitler|sieg\\s+heil|(?:поддерживаю|одобряю|прославляю|славлю)\\s+(?:терроризм|теракты|нацизм)|(?:терроризм|теракты)\\s*[—:–-]\\s*(?:это\\s+)?(?:хорошо|круто)|(?:join|support|recruit\\s+for|вступай(?:те)?\\s+в|присоединяйся\\s+к|поддержи(?:те)?)\\s+(?:игил|исис|isis|isil|аль[- ]каид[ау]|al[- ]qaeda|ку[- ]клукс[- ]клан|ku\\s+klux\\s+klan|террористическ[\\p{L}]*\\s+(?:организаци[\\p{L}]*|групп[\\p{L}]*)|a?\\s*terrorist\\s+(?:group|organisation|organization)))" +
        edge,
      "giu",
    ),
  },
  {
    category: "violent_promotion",
    pattern: new RegExp(
      left +
        "(?:совершайте|устраивайте|организуйте|готовьте)\\s+теракт[\\p{L}]*|\\b(?:carry\\s+out|organize|prepare)\\s+(?:a\\s+)?terrorist\\s+attack",
      "giu",
    ),
  },
  { category: "harassment", pattern: new RegExp(left + insults + edge, "giu"), target: "insult" },
  {
    category: "harassment",
    pattern: new RegExp(
      left +
        "(?:иди(?:те)?\\s+на\\s*хуй|пош[её]л\\s+ты\\s+на\\s*хуй|пошла\\s+ты\\s+на\\s*хуй|fuck\\s+you|go\\s+fuck\\s+yourself)" +
        edge,
      "giu",
    ),
  },
  {
    category: "reputation_claim",
    pattern: new RegExp(
      left +
        "(?:вор(?:ует)?|мошенник[\\p{L}]*|насильник[\\p{L}]*|педофил[\\p{L}]*|убийца|украл[аи]?|крад[её]т|обманывает|присваивает|scammer|fraudster|rapist|thief|pedophile|murderer|steals|defrauds)" +
        edge,
      "giu",
    ),
    target: "claim",
  },
];

export function moderateText(value: string): ModerationFinding[] {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/[\p{L}]+/gu, (token) => {
      if (!/[а-яё]/iu.test(token)) return token;
      return token.replace(/[aceopxykmthb]/giu, (char) => {
        const mapped = cyrillicShapes[char.toLowerCase()];
        return char === char.toUpperCase() ? mapped.toUpperCase() : mapped;
      });
    });
  const findings = new Map<ModerationCategory, ModerationFinding>();
  // Context cannot carry across a sentence, newline, or an adversative clause.
  const clauses = normalized.split(/[.!?;\n]+|\s+(?:но|однако|зато|but|however)\s+/iu);
  for (const clause of clauses)
    for (const rule of rules) {
      for (const match of clause.matchAll(new RegExp(rule.pattern))) {
        const index = match.index ?? 0;
        const start = index + (/^[^\p{L}\p{N}_]/u.test(match[0]) ? 1 : 0);
        const prefix = clause.slice(Math.max(0, start - 160), start);
        const suffix = clause.slice(index + match[0].length, index + match[0].length + 140);
        if (
          rule.target === "insult" &&
          !explicitTarget.test(prefix) &&
          !namedTarget.test(prefix) &&
          !suffixTarget.test(suffix)
        )
          continue;
        if (
          rule.target === "claim" &&
          !claimTarget.test(prefix) &&
          !claimName.test(prefix) &&
          !claimVerbName.test(prefix) &&
          !namedTarget.test(prefix)
        )
          continue;
        // Some profane forms are also used as praise. Do not treat a clear
        // positive address as abuse simply because it contains a swear word.
        if (
          rule.target === "insult" &&
          /^(?:сука|bitch)$/iu.test(match[0].trim()) &&
          praiseAfter.test(suffix)
        )
          continue;
        if (negationBefore.test(prefix) || oppositionAfter.test(suffix)) continue;
        const reported = reportBefore.test(prefix) || reportAfter.test(suffix);
        const severity = rule.category === "reputation_claim" || reported ? "warning" : "block";
        const previous = findings.get(rule.category);
        if (previous?.severity === "block") continue;
        findings.set(rule.category, {
          category: rule.category,
          severity,
          message:
            reported && severity === "warning" && rule.category !== "reputation_claim"
              ? REPORT_MESSAGE
              : MESSAGES[rule.category],
        });
      }
    }
  return [...findings.values()];
}

export function blockedTextFinding(value: string): ModerationFinding | undefined {
  return moderateText(value).find((finding) => finding.severity === "block");
}
