/**
 * Redact an email address for log output. Keeps the first character of the
 * local part and the full domain so log lines remain useful for debugging
 * delivery flows without leaking full PII into Railway logs (per GR 12).
 *
 *   maskEmail("peter@2wrap.com")  => "p***@2wrap.com"
 *   maskEmail("ab@x.io")          => "a***@x.io"
 *   maskEmail("")                 => ""
 *   maskEmail("not-an-email")     => "not-an-email"
 */
export function maskEmail(email: string): string {
  if (!email) return email;
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length === 0) return email;
  return `${local[0]}***${domain}`;
}
