import type { CaseProfile, TestKey, TestResult } from "./types";

export function getTest(caseProfile: CaseProfile, key: TestKey): TestResult {
  return caseProfile.tests[key];
}