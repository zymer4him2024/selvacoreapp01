export const DUAL_MODE_EMAIL = 'zymer4him@gmail.com';

type EmailSource = { email?: string | null } | string | null | undefined;

function extract(source: EmailSource): string | null {
  if (!source) return null;
  if (typeof source === 'string') return source;
  return source.email ?? null;
}

export function isDualModeUser(...sources: EmailSource[]): boolean {
  for (const src of sources) {
    const email = extract(src);
    if (email && email.toLowerCase().trim() === DUAL_MODE_EMAIL) return true;
  }
  return false;
}
