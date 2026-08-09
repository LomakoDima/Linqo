import { defaultProfile, type Profile } from "@/lib/link-store";

export interface CompletionItem {
  key: string;
  label: string;
  done: boolean;
}

// Placeholder values (defaultProfile's own name/slug/bio) don't count as
// "set" — otherwise a brand-new, untouched profile would show 60% complete
// before the user has typed anything.
export function computeProfileCompletion(profile: Profile): {
  items: CompletionItem[];
  percent: number;
} {
  const items: CompletionItem[] = [
    { key: "avatar", label: "Avatar", done: !!profile.avatar },
    {
      key: "name",
      label: "Display Name",
      done: profile.name.trim().length > 0 && profile.name !== defaultProfile.name,
    },
    {
      key: "username",
      label: "Username",
      done: profile.slug.trim().length > 0 && profile.slug !== defaultProfile.slug,
    },
    {
      key: "bio",
      label: "Bio",
      done: profile.bio.trim().length > 0 && profile.bio !== defaultProfile.bio,
    },
    {
      key: "cover",
      label: "Cover",
      done: (profile.coverType ?? "image") === "color" ? !!profile.coverStyle : !!profile.cover,
    },
  ];

  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, percent };
}
