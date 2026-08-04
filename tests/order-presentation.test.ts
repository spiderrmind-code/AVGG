import assert from "node:assert/strict";
import test from "node:test";
import { maskOrderEmail } from "../lib/order-presentation";

test("masks valid order emails without exposing the local part", () => {
  assert.equal(maskOrderEmail("a@gmail.com"), "*@gmail.com");
  assert.equal(maskOrderEmail("ab@gmail.com"), "a*@gmail.com");
  assert.equal(maskOrderEmail("usuario@gmail.com"), "u*****o@gmail.com");
});

test("omits invalid and absent order emails", () => {
  for (const value of ["correo.invalido", "", null, undefined]) assert.equal(maskOrderEmail(value), undefined);
});
