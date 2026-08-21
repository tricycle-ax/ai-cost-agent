import { DEFAULT_FX } from "@/lib/services";

// 실시간 USD→KRW 환율 (open.er-api.com, API 키 불필요). 실패 시 DEFAULT_FX 폴백.
export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    const data = (await res.json()) as { rates: { KRW: number } };
    return Response.json({ rate: data.rates.KRW, ok: true });
  } catch {
    return Response.json({ rate: DEFAULT_FX, ok: false });
  }
}
