// 단가 자동 업데이트(LiteLLM 공개 단가 데이터셋) + 모델별 과금 종류 메타데이터.
// app.py의 MODEL_KIND / LITELLM_KEY / _litellm_to_price / refresh_prices 1:1 포트.
import { REQUEST, PAGE, VIDEO_PRICES, type Billing, type PriceEntry, TOKEN, IMAGE, VIDEO } from "./services";

export const LITELLM_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

// 우리 모델 → LiteLLM JSON 키. 미매핑(luma, exa)은 수동 유지.
export const LITELLM_KEY: Record<string, string> = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "amazon-nova-2-lite": "amazon.nova-2-lite-v1:0",
  "gemini-3.1-flash-image": "gemini-3.1-flash-image",
  "veo-lite-720p": "gemini/veo-3.1-lite-generate-preview",
  "veo-lite-1080p": "gemini/veo-3.1-lite-generate-preview",
  "veo-fast-720p": "gemini/veo-3.1-fast-generate-preview",
  "veo-fast-1080p": "gemini/veo-3.1-fast-generate-preview",
  "veo-pro-720p": "gemini/veo-3.1-generate-preview",
  "veo-pro-1080p": "gemini/veo-3.1-generate-preview",
};

// ---- 모델별 과금 종류 (UI 편집용) ----
export type ModelKind = "token" | "image" | "per_second" | "per_video" | "request" | "page";

export const MODEL_KIND: Record<string, ModelKind> = {
  "gpt-4o": "token",
  "gpt-4o-mini": "token",
  "gemini-2.5-flash": "token",
  "amazon-nova-2-lite": "token",
  "gemini-3.1-flash-image": "image",
  ...Object.fromEntries(Object.keys(VIDEO_PRICES).map((k) => [k, "per_second" as ModelKind])),
  "luma-dream-machine": "per_video",
  "exa-search": "request",
  "exa-contents": "page",
};

export const KIND_LABEL: Record<ModelKind, string> = {
  token: "토큰/1M",
  image: "이미지/장",
  per_second: "비디오/초",
  per_video: "비디오/개",
  request: "검색/건",
  page: "본문/페이지",
};

// 단계(과금 방식)별 선택 가능 모델 — 같은 과금 종류끼리만 호환.
const BILLING_KINDS: Record<Billing, Set<ModelKind>> = {
  [TOKEN]: new Set(["token"]),
  [IMAGE]: new Set(["image"]),
  [VIDEO]: new Set(["per_second", "per_video"]),
  [REQUEST]: new Set(["request"]),
  [PAGE]: new Set(["page"]),
};

// 과금 종류 → PriceEntry 필드명 (token은 in/out 2필드라 별도 처리)
export const KIND_FIELD: Partial<Record<ModelKind, keyof PriceEntry>> = {
  image: "per_image",
  per_second: "per_second",
  per_video: "per_video",
  request: "per_request",
  page: "per_page",
};

export function modelsFor(billing: Billing): string[] {
  const kinds = BILLING_KINDS[billing];
  return Object.entries(MODEL_KIND)
    .filter(([, kd]) => kinds.has(kd))
    .map(([m]) => m);
}

interface LiteLLMEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  output_cost_per_image?: number;
  output_cost_per_second?: number;
  output_cost_per_second_1080p?: number;
}

/** LiteLLM 항목 → 우리 단가 dict. 토큰은 /1M 환산. */
function litellmToPrice(model: string, entry: LiteLLMEntry): PriceEntry | null {
  const k = MODEL_KIND[model];
  if (k === "token") {
    return { in: (entry.input_cost_per_token ?? 0) * 1e6, out: (entry.output_cost_per_token ?? 0) * 1e6 };
  }
  if (k === "image") {
    return { per_image: entry.output_cost_per_image ?? 0 };
  }
  if (k === "per_second") {
    // Veo: 1080p는 별도 필드 사용
    if (model.endsWith("1080p") && entry.output_cost_per_second_1080p !== undefined) {
      return { per_second: entry.output_cost_per_second_1080p };
    }
    return { per_second: entry.output_cost_per_second ?? 0 };
  }
  return null; // per_video(luma) / request·page(exa) → LiteLLM 미포함, 수동
}

export interface RefreshPricesResult {
  prices: Record<string, PriceEntry>;
  updated: string[];
  skipped: string[];
  error: string | null;
}

/** LiteLLM 공개 단가에서 우리 모델 단가 갱신. */
export async function refreshPrices(base: Record<string, PriceEntry>): Promise<RefreshPricesResult> {
  let data: Record<string, LiteLLMEntry>;
  try {
    const res = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(20_000) });
    data = await res.json();
  } catch (e) {
    return { prices: base, updated: [], skipped: Object.keys(LITELLM_KEY), error: `조회 실패: ${e}` };
  }
  const next: Record<string, PriceEntry> = Object.fromEntries(Object.entries(base).map(([k, v]) => [k, { ...v }]));
  const updated: string[] = [];
  const skipped: string[] = [];
  for (const [our, lk] of Object.entries(LITELLM_KEY)) {
    const entry = data[lk];
    const price = entry ? litellmToPrice(our, entry) : null;
    if (price) {
      next[our] = price;
      updated.push(our);
    } else {
      skipped.push(our);
    }
  }
  return { prices: next, updated, skipped, error: null };
}
