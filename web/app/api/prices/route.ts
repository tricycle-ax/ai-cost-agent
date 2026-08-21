import { DEFAULT_PRICES } from "@/lib/services";
import { refreshPrices } from "@/lib/pricing";
import type { PriceEntry } from "@/lib/services";

// LiteLLM 공개 단가 데이터셋에서 우리 모델 단가 일괄 갱신. 수동 새로고침 버튼 트리거이므로 캐시 없음.
export async function POST(request: Request) {
  const base = (await request.json().catch(() => null)) as Record<string, PriceEntry> | null;
  const result = await refreshPrices(base ?? DEFAULT_PRICES);
  return Response.json(result);
}
