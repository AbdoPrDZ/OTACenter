/** Project identity shared by the public site, the dashboard and the auth screens. */
export const AUTHOR = "AbdoPrDZ";
export const AUTHOR_URL = "https://github.com/AbdoPrDZ";
export const REPO_URL = "https://github.com/AbdoPrDZ/OTACenter";
export const ISSUES_URL = `${REPO_URL}/issues`;
export const RELEASES_URL = `${REPO_URL}/releases`;
export const LICENSE_NAME = "GPL-3.0-or-later";
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/** First year of the project, for the `2026–<now>` copyright range. */
const SINCE = 2026;

export function copyrightYears(): string {
  const year = new Date().getFullYear();
  return year > SINCE ? `${SINCE}–${year}` : String(SINCE);
}

/** e.g. "© 2026 AbdoPrDZ" */
export function copyrightNotice(): string {
  return `© ${copyrightYears()} ${AUTHOR}`;
}

/**
 * Contact e-mail configured on the server (`CONTACT_EMAIL`), exposed by the
 * Blade layout as `<meta name="contact-email">`. Empty when not configured.
 */
export function contactEmail(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="contact-email"]')?.content.trim() ?? "";
}
