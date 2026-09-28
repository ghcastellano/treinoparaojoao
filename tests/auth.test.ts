import test from "node:test";
import assert from "node:assert/strict";
import { sign, verify, validPassword } from "../lib/auth";
process.env.SESSION_SECRET = "test-only-secret-with-more-than-32-characters";
process.env.FAMILY_PASSWORD = "test-only-password-123";
test("signed sessions validate role and expiry", () => {
  const token = sign("child", 1000);
  assert.equal(verify(token, "child", 2000), true);
  assert.equal(verify(token, "parent", 2000), false);
  assert.equal(verify(sign("parent", 1000), "parent", 1_000_000), false);
  assert.equal(verify(token + "tampered", "child", 2000), false);
});
test("missing and malformed cookies fail closed", () => {
  for (const v of [undefined, "", "foo", "e30.fake", "a.b.c", "x".repeat(2000)])
    assert.equal(verify(v, "child"), false);
});
test("family password never accepts empty, wrong or non-string input", () => {
  assert.equal(validPassword(process.env.FAMILY_PASSWORD), true);
  for (const v of ["", null, {}, "incorrect", "x".repeat(300)])
    assert.equal(validPassword(v), false);
});
