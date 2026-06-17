/**
 * Smart first goalscorer name comparison.
 *
 * The football API often returns abbreviated names (e.g. "H. Kane") while
 * users type the full name ("Harry Kane"). This function handles that safely.
 *
 * Rules (in order):
 * 1. Exact match (case-insensitive) → ✅ match
 * 2. Initial + last name match (both directions):
 *      "Harry Kane" vs "H. Kane" → H=H, Kane=Kane → ✅ match
 *      "H. Kane" vs "Harry Kane" → same → ✅ match
 * 3. Everything else → ❌ no match
 *
 * ⚠️ We deliberately do NOT fall back to last-name-only matching, because two
 * players can share the same surname (e.g. "Lautaro Martinez" vs "Nico Martinez").
 * Requiring the first initial to also match keeps the comparison safe.
 */
export function scorerMatch(predicted: string, actual: string): boolean {
  if (!predicted || !actual) return false;

  const p = predicted.trim().toLowerCase();
  const a = actual.trim().toLowerCase();

  // Rule 1: exact match
  if (p === a) return true;

  // Helper: try to match "Full Name" against "X. LastName" abbreviated form
  function matchFullVsAbbr(full: string, abbr: string): boolean {
    const abbrWords = abbr.split(/\s+/);
    // Abbreviated form must be at least 2 tokens and first token ends with "."
    if (abbrWords.length < 2 || !abbrWords[0].endsWith(".")) return false;

    const abbrInitial = abbrWords[0].charAt(0);
    const abbrLast = abbrWords[abbrWords.length - 1];

    const fullWords = full.split(/\s+/);
    if (fullWords.length < 2) return false;

    const fullInitial = fullWords[0].charAt(0);
    const fullLast = fullWords[fullWords.length - 1];

    return fullInitial === abbrInitial && fullLast === abbrLast;
  }

  // Rule 2a: predicted is full, actual is abbreviated (most common API case)
  if (matchFullVsAbbr(p, a)) return true;

  // Rule 2b: predicted is abbreviated, actual is full
  if (matchFullVsAbbr(a, p)) return true;

  return false;
}
