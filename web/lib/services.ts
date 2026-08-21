/**
 * 5개 AI 서비스의 호출 구조(데이터) + 비용 산출 함수.
 * services.py 1:1 포트 — 로직 변경 없음. 데이터(SERVICES)만 고치면 단계/횟수/토큰/모델이 변경된다.
 * 출처: WORK_INSTRUCTION.md 3절(코드 기반 고정값). 단가·입력토큰은 추정 기본값이므로 UI에서 반드시 수정.
 *
 * 과금 방식 3종(WI 4절):
 *   token = (in_tok×in단가 + out_tok×out단가) / 1,000,000
 *   image = 장수 × 장당단가
 *   video = 초×초당단가  (또는 개당단가)
 */

export const TOKEN = "token";
export const IMAGE = "image";
export const VIDEO = "video";
export const REQUEST = "request";
export const PAGE = "page";
export type Billing = typeof TOKEN | typeof IMAGE | typeof VIDEO | typeof REQUEST | typeof PAGE;

export interface Step {
  id: string;
  name: string;
  model: string;
  billing: Billing;
  count: number;
  in_tok?: number;
  out_tok?: number;
  sys_tok?: number;
  per_call?: number;
}

export interface PriceEntry {
  in?: number;
  out?: number;
  per_image?: number;
  per_second?: number;
  per_video?: number;
  per_request?: number;
  per_page?: number;
}

// ---- 비디오: Veo 3.1 티어(lite/fast/pro) × 해상도(720p/1080p). 기본 lite/720p. ----
// 단가(USD/초) = Google Gemini API 공식 가격(2026-06-30 확인).
//   https://ai.google.dev/gemini-api/docs/pricing  (Veo 3.1)
//   lite = veo-3.1-lite-generate-preview, fast = veo-3.1-fast-generate-preview,
//   pro  = Veo 3.1 Standard (veo-3.1-generate-preview)
export const VIDEO_MODELS: Record<string, string> = { lite: "Veo 3.1 Lite", fast: "Veo 3.1 Fast", pro: "Veo 3.1 Standard" };
export const VIDEO_RESOLUTIONS = ["720p", "1080p"];

export function videoKey(model: string, res: string) {
  return `veo-${model}-${res}`;
}

export const VIDEO_PRICES: Record<string, PriceEntry> = {
  [videoKey("lite", "720p")]: { per_second: 0.05 },
  [videoKey("lite", "1080p")]: { per_second: 0.08 },
  [videoKey("fast", "720p")]: { per_second: 0.1 },
  [videoKey("fast", "1080p")]: { per_second: 0.12 },
  [videoKey("pro", "720p")]: { per_second: 0.4 }, // Standard: 720p/1080p 동일
  [videoKey("pro", "1080p")]: { per_second: 0.4 },
};

// ---- 단가 기본값(USD). 조사일(2026-07) 참고값. 공식 페이지에서 확인·수정. ----
export const DEFAULT_PRICES: Record<string, PriceEntry> = {
  // USD / 1M tokens
  "gpt-4o": { in: 2.5, out: 10.0 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  // AWS Bedrock Nova 2 Lite (토큰/1M). 공식값 미확정 → Bifrost 추정치($0.30/$2.50).
  // 코드는 service_tier="flex" 사용 → 실제 청구는 더 낮을 수 있음(단가표에서 조정).
  "amazon-nova-2-lite": { in: 0.3, out: 2.5 },
  // USD / image — Gemini 3.1 Flash Image(Nano Banana 2) 1K(1024x1024) 장당.
  // 공식: https://ai.google.dev/gemini-api/docs/pricing ($0.067/1K장, 2026-06-30)
  "gemini-3.1-flash-image": { per_image: 0.067 },
  // USD / second — 비디오 모델×해상도 매트릭스
  ...VIDEO_PRICES,
  // USD / video  (vod Luma 폴백, 개당)
  "luma-dream-machine": { per_video: 0.4 },
  // USD / request & page — Exa 외부 검색 API (https://exa.ai/pricing)
  "exa-search": { per_request: 0.007 }, // $7/1k 검색 요청(결과 ≤10)
  "exa-contents": { per_page: 0.001 }, // $1/1k 본문 페이지
};

export const DEFAULT_FX = 1380.0; // KRW/USD — 실시간 환율 조회 실패 시 폴백

// ---- AWS Bedrock Nova 2 서비스 티어 (batchPro 실코드: nova-2 → serviceTier="flex") ----
// Standard(기본 On-Demand) 대비 Flex는 약 50% 할인(best-effort·지연 허용, 프롬프트 캐시와 중복 적용).
// 출처: AWS Bedrock Service Tiers — https://aws.amazon.com/bedrock/service-tiers/
export const NOVA_TIERS: Record<string, number> = { standard: 1.0, flex: 0.5 };
export const NOVA_TIER_LABEL: Record<string, string> = {
  standard: "Standard (기본 · On-Demand)",
  flex: "Flex (약 50% 할인 · best-effort)",
};

// 모델 → 공급사 (단계별 내역 표시용)
export const MODEL_PROVIDER: Record<string, string> = {
  "gpt-4o": "OpenAI",
  "gpt-4o-mini": "OpenAI",
  "gemini-2.5-flash": "Google",
  "gemini-3.1-flash-image": "Google",
  "amazon-nova-2-lite": "AWS",
  "luma-dream-machine": "Luma",
  "exa-search": "Exa",
  "exa-contents": "Exa",
};

export function providerOf(model: string): string {
  if (model in MODEL_PROVIDER) return MODEL_PROVIDER[model];
  if (model.startsWith("veo-")) return "Google"; // Veo 3.1 (veo-lite/pro-720p/1080p)
  return "-";
}

function tok(sid: string, name: string, model: string, in_tok: number, out_tok: number, count = 1, sys_tok = 0): Step {
  return { id: sid, name, model, billing: TOKEN, count, in_tok, out_tok, sys_tok };
}

function img(sid: string, name: string, model: string, per_call = 1, count = 1): Step {
  return { id: sid, name, model, billing: IMAGE, count, per_call };
}

function vid(sid: string, name: string, model: string, per_call = 5.0, count = 1): Step {
  return { id: sid, name, model, billing: VIDEO, count, per_call };
}

function req(sid: string, name: string, model: string, count: number): Step {
  return { id: sid, name, model, billing: REQUEST, count };
}

function page(sid: string, name: string, model: string, count: number): Step {
  return { id: sid, name, model, billing: PAGE, count };
}

export interface ServiceDef {
  name: string;
  unit: string;
  provider: string;
  url?: string;
  modes?: Record<string, string>;
  recipes?: Record<string, Step[]>;
  selectable_model?: string[];
  steps?: Step[];
}

// ---- 서비스 단계 레시피(데이터) ----
// coordi: 모드별 레시피. mode3_tryon 의 착장 이미지 per_call 은 런타임에 N으로 치환.
// review: 모델 런타임 선택. search: 큐레이션 단계 캐시 적중률로 count 감소.
// vod: 분석 단계 count=평균 이미지 수, Veo 초=런타임, Luma 폴백=확률 추가.
export const SERVICES: Record<string, ServiceDef> = {
  coordi: {
    name: "상품 코디 추천",
    unit: "코디 1개",
    provider: "Google",
    url: "https://tricycle-coordi-agent.streamlit.app",
    modes: {
      mode1: "모드1/A (자동코디: 추천+좌표+트렌드+화보)",
      mode2: "모드2/B (수동조합: 좌표+트렌드+화보)",
      modeC_rec: "모드3/C-추천만 (사진업로드: 파싱+재랭킹+좌표+트렌드+화보)",
      modeC_tryon: "모드3/C-착장포함 (사진업로드: 파싱+재랭킹+좌표+트렌드+화보+착장N)",
      mode3_rec: "모드4/D-추천만 (단품추천: 추천+트렌드)",
      mode3_tryon: "모드4/D-착장포함 (단품추천: 추천+트렌드+착장N)",
    },
    recipes: {
      mode1: [
        tok("coordi_rec", "코디 추천", "gemini-2.5-flash", 1200, 1000),
        tok("coordi_det", "좌표 검출", "gemini-2.5-flash", 800, 400),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
        img("coordi_flat", "화보 이미지 생성", "gemini-3.1-flash-image", 1),
      ],
      mode2: [
        tok("coordi_det", "좌표 검출", "gemini-2.5-flash", 800, 400),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
        img("coordi_flat", "화보 이미지 생성", "gemini-3.1-flash-image", 1),
      ],
      modeC_rec: [
        tok("coordi_img_parse", "착장 사진 비전 파싱", "gemini-2.5-flash", 2500, 800),
        tok("coordi_vis_match", "후보 비주얼 재랭킹(품목당)", "gemini-2.5-flash", 2000, 200, 5),
        tok("coordi_det", "좌표 검출", "gemini-2.5-flash", 800, 400),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
        img("coordi_flat", "화보 이미지 생성", "gemini-3.1-flash-image", 1),
      ],
      modeC_tryon: [
        tok("coordi_img_parse", "착장 사진 비전 파싱", "gemini-2.5-flash", 2500, 800),
        tok("coordi_vis_match", "후보 비주얼 재랭킹(품목당)", "gemini-2.5-flash", 2000, 200, 5),
        tok("coordi_det", "좌표 검출", "gemini-2.5-flash", 800, 400),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
        img("coordi_flat", "화보 이미지 생성", "gemini-3.1-flash-image", 1),
        img("coordi_tryon", "착장 이미지 생성", "gemini-3.1-flash-image", 1),
      ],
      mode3_rec: [
        tok("coordi_rec", "코디 추천", "gemini-2.5-flash", 1200, 1000),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
      ],
      mode3_tryon: [
        tok("coordi_rec", "코디 추천", "gemini-2.5-flash", 1200, 1000),
        tok("coordi_tr", "트렌드 평가", "gemini-2.5-flash", 600, 300),
        img("coordi_tryon", "착장 이미지 생성", "gemini-3.1-flash-image", 1),
      ],
    },
  },
  review: {
    name: "상품평 초안 자동작성·검증",
    unit: "상품평 1개",
    provider: "OpenAI",
    url: "https://tricycle-review-agent.streamlit.app",
    selectable_model: ["gpt-4o", "gpt-4o-mini"],
    steps: [
      tok("rev_val", "이미지 검증", "gpt-4o-mini", 1000, 250), // max_tokens 250, 런타임 모델 치환
      tok("rev_gen", "리뷰 작성", "gpt-4o-mini", 1200, 1000), // max_tokens 1000
    ],
  },
  search: {
    name: "검색 키워드 추천상품",
    unit: "추천 1번",
    provider: "OpenAI/LiteLLM",
    url: "https://tricycle-search-agent.streamlit.app",
    steps: [
      tok("srch_guide", "가이드 생성", "gpt-4o-mini", 800, 700), // max_tokens 700
      tok("srch_cur", "AI 큐레이션", "gpt-4o-mini", 1500, 800), // max_tokens 800, ttl=600 캐시
    ],
  },
  vod: {
    name: "모델 워킹/턴 영상",
    unit: "동영상 1개",
    provider: "OpenAI+Google",
    url: "https://tricycle-vod-agent.streamlit.app",
    steps: [
      tok("vod_analyze", "이미지 분석/크롭", "gpt-4o-mini", 500, 300), // count=평균 이미지 수(1~14)
      vid("vod_veo", "비디오 생성(Veo)", videoKey("lite", "720p"), 10.0),
    ],
  },
  batchpro: {
    name: "상품 속성·카테고리 추출",
    unit: "상품 1건",
    provider: "AWS Bedrock (Nova 2 Lite)",
    // 출처: batchPro-main. 상품 1건당 Nova 2 Lite 호출 3회(1차 기본정보+대카, 2차 중분류, 3차 소분류).
    // 1차는 이미지(기본 6장) 입력 포함 → bp_img 단계(장당 토큰). 토큰은 추정(코드에 입력토큰 명시 없음).
    // in_tok=비캐시 입력(사용자 텍스트+이미지, 정상 과금), sys_tok=캐시된 시스템 프롬프트(90% 할인)
    // 토큰 = litellm/Bedrock 실측값(1상품 예시). 1차: in 794+캐시 6243+out 617. 2/3차: in 384+캐시 1072+out 217.
    // 1차 비캐시(794) = 사용자 텍스트 + 이미지 6장(장당 약 100).
    steps: [
      tok("bp_basic", "1차 기본정보+대카 추론", "amazon-nova-2-lite", 194, 500, 1, 6243),
      tok("bp_img", "1차 이미지 입력(장당)", "amazon-nova-2-lite", 100, 0, 6),
      tok("bp_cat_m", "2차 중분류 추론", "amazon-nova-2-lite", 384, 170, 1, 1072),
      tok("bp_cat_s", "3차 소분류 추론", "amazon-nova-2-lite", 384, 170, 1, 1072),
    ],
  },
};

export interface CoordiOptions {
  [key: string]: unknown;
  mode: string;
  try_on_n: number;
  parsed_items_n: number;
  retry_pct: number;
}
export interface ReviewOptions {
  [key: string]: unknown;
  model: string;
  val_retries: number;
}
export interface SearchOptions {
  [key: string]: unknown;
  cache_hit_pct: number;
  exa_enabled: boolean;
  exa_calls: number;
  exa_results: number;
}
export interface VodOptions {
  [key: string]: unknown;
  avg_images: number;
  video_sec: number;
  luma_prob: number;
  video_model: string;
  video_res: string;
}
export interface BatchproOptions {
  [key: string]: unknown;
  images: number;
  cache_read_mult: number;
  nova_tier: string;
}
export type ServiceOptions = CoordiOptions | ReviewOptions | SearchOptions | VodOptions | BatchproOptions;

// ---- 서비스별 기본 옵션(UI 초기값) ----
export const DEFAULT_OPTIONS: {
  coordi: CoordiOptions;
  review: ReviewOptions;
  search: SearchOptions;
  vod: VodOptions;
  batchpro: BatchproOptions;
} = {
  coordi: { mode: "mode1", try_on_n: 3, parsed_items_n: 5, retry_pct: 0.0 },
  review: { model: "gpt-4o-mini", val_retries: 0.0 },
  search: { cache_hit_pct: 0.0, exa_enabled: true, exa_calls: 2, exa_results: 5 },
  vod: { avg_images: 14, video_sec: 10.0, luma_prob: 0.0, video_model: "lite", video_res: "720p" },
  batchpro: { images: 6, cache_read_mult: 0.1, nova_tier: "flex" }, // 실코드는 nova-2 → flex
};

export type ServiceKey = keyof typeof DEFAULT_OPTIONS;

/** 옵션을 적용해 실제 단계 리스트(횟수/단위 확정) 반환. 유일한 분기 지점. */
export function concreteSteps(svcKey: ServiceKey, opts: Record<string, unknown>): Step[] {
  const s = SERVICES[svcKey];
  const out: Step[] = [];
  if (svcKey === "coordi") {
    const o = opts as unknown as CoordiOptions;
    for (const raw of s.recipes![o.mode]) {
      const st = { ...raw };
      if (st.id === "coordi_tryon") st.per_call = o.try_on_n;
      else if (st.id === "coordi_vis_match") st.count = o.parsed_items_n ?? 5;
      out.push(st);
    }
    const rw = 1 + o.retry_pct / 100; // 재시도 가중률 → 기댓값 호출 수
    for (const st of out) st.count *= rw;
  } else if (svcKey === "review") {
    const o = opts as unknown as ReviewOptions;
    for (const raw of s.steps!) out.push({ ...raw, model: o.model });
    out[0].count = 1 + o.val_retries; // 검증 재시도 평균 추가 호출
  } else if (svcKey === "search") {
    const o = opts as unknown as SearchOptions;
    for (const raw of s.steps!) out.push({ ...raw });
    out[1].count = 1 - o.cache_hit_pct / 100; // 캐시 적중 시 큐레이션 미호출
    if (o.exa_enabled) {
      // Exa 트렌드 수집(선택)
      out.push(req("srch_exa", "Exa 트렌드 검색", "exa-search", o.exa_calls));
      out.push(page("srch_exa_body", "Exa 본문(contents)", "exa-contents", o.exa_calls * o.exa_results));
    }
  } else if (svcKey === "vod") {
    const o = opts as unknown as VodOptions;
    const a = { ...s.steps![0], count: o.avg_images };
    out.push(a);
    const v = { ...s.steps![1] };
    v.model = videoKey(o.video_model, o.video_res);
    v.per_call = o.video_sec;
    out.push(v);
    if (o.luma_prob > 0) {
      out.push({
        id: "vod_luma",
        name: "Luma 폴백",
        model: "luma-dream-machine",
        billing: VIDEO,
        count: o.luma_prob / 100,
        per_call: 1,
      });
    }
  } else if (svcKey === "batchpro") {
    const o = opts as unknown as BatchproOptions;
    for (const raw of s.steps!) {
      const st = { ...raw };
      if (st.id === "bp_img") st.count = o.images; // 이미지 장수만큼 입력 토큰 과금
      out.push(st);
    }
  }
  return out;
}

export interface TokenOverride {
  in: number;
  out: number;
  sys?: number;
}

/**
 * 단일 단계 비용(USD). tok={in,out,sys} 로 토큰 오버라이드 가능.
 * sys_tok(캐시 대상 시스템 프롬프트)은 cache_read_mult × input 단가로 과금(캐시 미사용=1.0).
 * price_mult는 Bedrock Nova 서비스 티어(Standard/Flex) 할인 — amazon-nova 모델에만 적용.
 */
export function stepUsd(
  step: Step,
  prices: Record<string, PriceEntry>,
  tokOverride?: TokenOverride,
  cacheReadMult = 1.0,
  priceMult = 1.0,
): number {
  const p = prices[step.model];
  if (step.billing === TOKEN) {
    const it = tokOverride ? tokOverride.in : step.in_tok!;
    const ot = tokOverride ? tokOverride.out : step.out_tok!;
    const sys = (tokOverride ? tokOverride.sys : undefined) ?? step.sys_tok ?? 0;
    const mult = step.model.startsWith("amazon-nova") ? priceMult : 1.0; // Flex 티어는 Nova 한정
    return (((it + sys * cacheReadMult) * (p.in ?? 0) + ot * (p.out ?? 0)) / 1_000_000) * step.count * mult;
  }
  if (step.billing === IMAGE) return step.count * (step.per_call ?? 1) * (p.per_image ?? 0);
  if (step.billing === REQUEST) return step.count * (p.per_request ?? 0);
  if (step.billing === PAGE) return step.count * (p.per_page ?? 0);
  // VIDEO
  if (p.per_video !== undefined) return step.count * p.per_video;
  return step.count * (step.per_call ?? 1) * (p.per_second ?? 0);
}

export interface BreakdownRow {
  단계: string;
  공급사: string;
  모델: string;
  과금: string;
  USD: number;
  KRW: number;
}

const BILLING_LABEL: Record<Billing, string> = {
  token: "토큰",
  image: "이미지",
  video: "비디오",
  request: "검색요청",
  page: "본문",
};

export interface CostUnitResult {
  usd: number;
  krw: number;
  breakdown: BreakdownRow[];
}

/** 기준 산출물 1건당 비용. */
export function costUnit(
  svcKey: ServiceKey,
  opts: Record<string, unknown>,
  prices: Record<string, PriceEntry>,
  tokOverrides: Record<string, TokenOverride> = {},
  fx = DEFAULT_FX,
): CostUnitResult {
  const cacheReadMult = (opts.cache_read_mult as number | undefined) ?? 1.0; // 1.0=캐시 미사용, <1.0(예:0.10)=캐시 읽기 단가
  const priceMult = NOVA_TIERS[(opts.nova_tier as string | undefined) ?? "standard"] ?? 1.0; // Bedrock Nova 서비스 티어
  let total = 0;
  const bd: BreakdownRow[] = [];
  for (const st of concreteSteps(svcKey, opts)) {
    const u = stepUsd(st, prices, tokOverrides[st.id], cacheReadMult, priceMult);
    total += u;
    bd.push({
      단계: st.name,
      공급사: providerOf(st.model),
      모델: st.model,
      과금: BILLING_LABEL[st.billing],
      USD: u,
      KRW: u * fx,
    });
  }
  return { usd: total, krw: total * fx, breakdown: bd };
}

/** 편집 가능한 토큰 단계 목록(모듈 로드 시 1회 계산되는 정적 데이터). */
export interface TokenStepRow {
  sid: string;
  svc: string;
  step: string;
  in_tok: number;
  out_tok: number;
  sys_tok: number;
}

export function tokenSteps(): TokenStepRow[] {
  const rows: TokenStepRow[] = [];
  const seen = new Set<string>();
  const coordiAll = Object.values(SERVICES.coordi.recipes!).flat();
  const all = [...coordiAll, ...SERVICES.review.steps!, ...SERVICES.search.steps!, ...SERVICES.vod.steps!, ...SERVICES.batchpro.steps!];
  for (const st of all) {
    if (st.billing === TOKEN && !seen.has(st.id)) {
      seen.add(st.id);
      const ownerKey = Object.keys(SERVICES).find((s) => {
        const v = SERVICES[s];
        const stepsOfV = v.steps ?? Object.values(v.recipes ?? {}).flat();
        return stepsOfV.some((x) => x.id === st.id);
      })!;
      rows.push({
        sid: st.id,
        svc: SERVICES[ownerKey].name,
        step: st.name,
        in_tok: st.in_tok ?? 0,
        out_tok: st.out_tok ?? 0,
        sys_tok: st.sys_tok ?? 0,
      });
    }
  }
  return rows;
}
