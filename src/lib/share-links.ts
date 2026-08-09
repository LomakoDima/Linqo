// Pure URL builders for each platform's real share-intent page — no side
// effects, no clipboard/window access, so both ShareCard and SuccessDialog
// can reuse the exact same links. Discord has no official web share-intent
// URL, so it's handled separately (clipboard, not a link) by the callers.
export function shareLinks(input: { url: string; title: string; text: string }): {
  twitter: string;
  linkedin: string;
  reddit: string;
  telegram: string;
  whatsapp: string;
  email: string;
} {
  const { url, title, text } = input;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const ti = encodeURIComponent(title);
  return {
    twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${ti}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    email: `mailto:?subject=${ti}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  };
}
