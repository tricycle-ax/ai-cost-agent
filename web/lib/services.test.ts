// 자가점검: services.py의 demo()를 그대로 이식. `pnpm test`(node --test)로 실행.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SERVICES, DEFAULT_OPTIONS, DEFAULT_PRICES, DEFAULT_FX, costUnit, type ServiceKey } from "./services.ts";

const EXPECTED_STEP_COUNT: Record<ServiceKey, number> = {
  coordi: 4, // mode1
  review: 2,
  search: 4, // 2 steps + exa search + exa contents (exa_enabled=true by default)
  vod: 2, // luma_prob=0 → no fallback step
  batchpro: 4,
};

for (const k of Object.keys(SERVICES) as ServiceKey[]) {
  test(`costUnit(${k}) is positive and has expected step count`, () => {
    const { usd, krw, breakdown } = costUnit(k, DEFAULT_OPTIONS[k], DEFAULT_PRICES, {}, DEFAULT_FX);
    assert.ok(usd > 0, `${k}: usd should be > 0, got ${usd}`);
    assert.equal(krw, usd * DEFAULT_FX);
    assert.equal(breakdown.length, EXPECTED_STEP_COUNT[k], `${k}: unexpected step count`);
  });
}

test("batchpro flex tier is cheaper than standard", () => {
  const flex = costUnit("batchpro", DEFAULT_OPTIONS.batchpro, DEFAULT_PRICES, {}, DEFAULT_FX);
  const standard = costUnit(
    "batchpro",
    { ...DEFAULT_OPTIONS.batchpro, nova_tier: "standard" },
    DEFAULT_PRICES,
    {},
    DEFAULT_FX,
  );
  assert.ok(flex.usd < standard.usd);
});
