// 단계별 모델 교체(stepModelOverrides)를 반영한 서비스 1건당 비용 계산.
// app.py 영역B의 인라인 계산(단계표 렌더 + 합계)을 페이지/컴포넌트가 공유하는 순수 함수로 분리.
import {
  SERVICES,
  NOVA_TIERS,
  concreteSteps,
  stepUsd,
  providerOf,
  type ServiceKey,
  type Step,
  type PriceEntry,
  type TokenOverride,
} from "./services";
import { modelsFor } from "./pricing";

export interface ServiceCostRow {
  step: Step;
  chosen: string;
  choices: string[];
  provider: string;
  usd: number;
  key: string;
}

export interface ServiceCostResult {
  rows: ServiceCostRow[];
  usd: number;
  krw: number;
}

export function computeServiceCost(
  svcKey: ServiceKey,
  opts: Record<string, unknown>,
  prices: Record<string, PriceEntry>,
  tokenOverrides: Record<string, TokenOverride>,
  novaTier: string,
  stepModelOverrides: Record<string, string>,
  fx: number,
): ServiceCostResult {
  const cacheReadMult = (opts.cache_read_mult as number | undefined) ?? 1.0;
  const priceMult = NOVA_TIERS[novaTier] ?? 1.0; // 글로벌 Nova 티어(사이드바) — app.py와 동일하게 opts가 아닌 전역값 사용

  let usd = 0;
  const rows: ServiceCostRow[] = concreteSteps(svcKey, opts).map((raw) => {
    const choices = modelsFor(raw.billing);
    const key = `${svcKey}:${raw.id}`;
    let chosen = stepModelOverrides[key] ?? raw.model;
    if (!choices.includes(chosen)) chosen = choices.includes(raw.model) ? raw.model : choices[0];
    const step = { ...raw, model: chosen };
    const rowUsd = stepUsd(step, prices, tokenOverrides[step.id], cacheReadMult, priceMult);
    usd += rowUsd;
    return { step, chosen, choices, provider: providerOf(chosen), usd: rowUsd, key };
  });

  return { rows, usd, krw: usd * fx };
}

export function serviceName(svcKey: ServiceKey) {
  return SERVICES[svcKey].name;
}
