/**
 * Turn free text (e.g. couple names or a wedding hashtag) into a URL/subdomain-safe slug.
 * "Aanya & Vihaan #Sharma2026" -> "aanya-vihaan-sharma2026"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '') // trim hyphens
    .replace(/-{2,}/g, '-') // collapse repeats
    .slice(0, 63); // DNS label max
}
