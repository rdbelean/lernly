import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCalcInput, parseStudentNumber } from "./calcCheck";
import { CORPORATE_FINANCE_EXERCISES } from "./seed";

const wacc = CORPORATE_FINANCE_EXERCISES[0];
const tv = CORPORATE_FINANCE_EXERCISES[1];

test("parseStudentNumber parses German commas, dots, units, and thousands", () => {
  assert.equal(parseStudentNumber("7,4"), 7.4);
  assert.equal(parseStudentNumber("6.8"), 6.8);
  assert.equal(parseStudentNumber("6,8 %"), 6.8);
  assert.equal(parseStudentNumber("200 Mio."), 200);
  assert.equal(parseStudentNumber("1.000,5"), 1000.5);
  assert.equal(parseStudentNumber("abc"), null);
  assert.equal(parseStudentNumber("   "), null);
});

test("WACC accepts 6,8 and 6.8 as correct", () => {
  assert.equal(evaluateCalcInput(wacc, "6,8").kind, "correct");
  assert.equal(evaluateCalcInput(wacc, "6.8 %").kind, "correct");
});

test("WACC identifies forgotten tax shield on 7,4", () => {
  const result = evaluateCalcInput(wacc, "7,4");
  assert.equal(result.kind, "wrong");
  assert.match(result.feedback, /Steuer auf Fremdkapital vergessen/);
});

test("WACC returns generic hint on unrelated wrong numbers", () => {
  const result = evaluateCalcInput(wacc, "12,0");
  assert.equal(result.kind, "wrong");
  assert.equal(result.feedback, wacc.genericError);
});

test("Terminal Value accepts 200 and flags forgotten growth rate at 150", () => {
  assert.equal(evaluateCalcInput(tv, "200").kind, "correct");
  const forgotG = evaluateCalcInput(tv, "150");
  assert.equal(forgotG.kind, "wrong");
  assert.match(forgotG.feedback, /Wachstumsrate g/);
});
