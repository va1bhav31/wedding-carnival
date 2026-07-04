import { createClient } from '@/lib/supabase/server';

export type Theme = { primary?: string; accent?: string; secondary?: string; logo?: string };

export type Wedding = {
  id: string;
  slug: string;
  bride_name: string | null;
  groom_name: string | null;
  couple_name_1: string;
  couple_name_2: string;
  welcome_message: string | null;
  theme: Theme | null;
  status: string;
};

const COLUMNS =
  'id, slug, bride_name, groom_name, couple_name_1, couple_name_2, welcome_message, theme, status';

export async function getWeddingBySlug(slug: string): Promise<Wedding | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('weddings').select(COLUMNS).eq('slug', slug).maybeSingle();
  return (data as Wedding) ?? null;
}

/** Bride/groom display names, falling back to the legacy couple_name_* columns. */
export function coupleNames(w: Wedding) {
  return {
    bride: w.bride_name || w.couple_name_1,
    groom: w.groom_name || w.couple_name_2,
  };
}

/** Resolved theme with sensible brand defaults. */
export function themeColors(w: Wedding) {
  const t = w.theme ?? {};
  return {
    primary: t.primary || '#FB4FA8',
    accent: t.accent || '#F4D71E',
    secondary: t.secondary || '#8B3FB0',
    logo: t.logo,
  };
}
