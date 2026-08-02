/**
 * `jose` v6 ships ESM only, which the CommonJS Jest runtime cannot parse.
 * Unit tests here reach it only transitively (via the auth session helpers)
 * and never assert on JWT behaviour, so this stub keeps those suites running.
 *
 * If JWT signing/verification ever needs direct test coverage, exercise it in
 * an ESM-capable environment (e.g. a Playwright/e2e run) rather than widening
 * this mock.
 */

export class SignJWT {
  constructor(private readonly payload: Record<string, unknown> = {}) {}
  setProtectedHeader() {
    return this;
  }
  setSubject(subject: string) {
    this.payload.sub = subject;
    return this;
  }
  setIssuedAt() {
    return this;
  }
  setExpirationTime() {
    return this;
  }
  async sign() {
    return `test-token.${Buffer.from(JSON.stringify(this.payload)).toString("base64url")}`;
  }
}

export async function jwtVerify(token: string) {
  const [, encoded] = token.split(".");
  if (!encoded) throw new Error("Invalid token");
  return { payload: JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) };
}
