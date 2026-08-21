"use client";

import { useEffect, useMemo, useState } from "react";
import { SidebarGlobalParams } from "@/components/sidebar-global-params";
import { ServiceTabs } from "@/components/service-tabs";
import { ComparisonTable } from "@/components/comparison-table";
import { CostLineChart } from "@/components/cost-line-chart";
import { FxSensitivityTable } from "@/components/fx-sensitivity-table";
import { computeServiceCost } from "@/lib/compute-service-cost";
import { DEFAULT_OPTIONS, DEFAULT_PRICES, DEFAULT_FX, tokenSteps, type PriceEntry, type TokenOverride, type ServiceKey } from "@/lib/services";
import { SERV_ORDER } from "@/lib/theme-palette";
import { Separator } from "@/components/ui/separator";

const INITIAL_OPTS: Record<ServiceKey, Record<string, unknown>> = { ...DEFAULT_OPTIONS };
const INITIAL_QTY: Record<ServiceKey, number> = { coordi: 100, review: 100, search: 100, vod: 100, batchpro: 100 };
const TOKEN_ROWS = tokenSteps();
const INITIAL_TOKEN_OVERRIDES: Record<string, TokenOverride> = Object.fromEntries(
  TOKEN_ROWS.map((r) => [r.sid, { in: r.in_tok, out: r.out_tok, sys: r.sys_tok }]),
);

export default function Home() {
  // 실시간 USD→KRW 환율 1회 조회 (app.py의 _live_fx() 대체, /api/fx가 1시간 캐싱).
  const [fx, setFx] = useState(DEFAULT_FX);
  const [fxMeta, setFxMeta] = useState({ rate: DEFAULT_FX, ok: true, loaded: false });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/fx")
      .then((r) => r.json())
      .then((d: { rate: number; ok: boolean }) => {
        if (cancelled) return;
        setFx(Math.max(1000, Math.min(2000, Math.round(d.rate))));
        setFxMeta({ rate: d.rate, ok: d.ok, loaded: true });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [prices, setPrices] = useState<Record<string, PriceEntry>>(DEFAULT_PRICES);
  const [priceMessage, setPriceMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [tokenOverrides, setTokenOverrides] = useState<Record<string, TokenOverride>>(INITIAL_TOKEN_OVERRIDES);
  const [novaTier, setNovaTier] = useState("flex");
  const [opts, setOpts] = useState(INITIAL_OPTS);
  const [qty, setQty] = useState(INITIAL_QTY);
  const [stepModelOverrides, setStepModelOverrides] = useState<Record<string, string>>({});

  const costs = useMemo(() => {
    return Object.fromEntries(
      SERV_ORDER.map((k) => [k, computeServiceCost(k, opts[k], prices, tokenOverrides, novaTier, stepModelOverrides, fx)]),
    ) as Record<ServiceKey, ReturnType<typeof computeServiceCost>>;
  }, [opts, prices, tokenOverrides, novaTier, stepModelOverrides, fx]);

  const unitUsd = Object.fromEntries(SERV_ORDER.map((k) => [k, costs[k].usd])) as Record<ServiceKey, number>;
  const unitKrw = Object.fromEntries(SERV_ORDER.map((k) => [k, costs[k].krw])) as Record<ServiceKey, number>;

  const handleRefreshPrices = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/prices", { method: "POST", body: JSON.stringify(prices) });
      const { prices: next, updated, skipped, error } = await res.json();
      if (error) {
        setPriceMessage(`❌ ${error}`);
      } else {
        setPrices(next);
        setPriceMessage(`✅ ${updated.length}개 갱신 · 수동유지: ${skipped.join(", ") || "없음"}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <SidebarGlobalParams
        fx={fx}
        onFxChange={setFx}
        fxCaption={
          fxMeta.loaded
            ? `기본값 = ${fxMeta.ok ? "실시간" : "폴백"} ₩${Math.round(fxMeta.rate).toLocaleString()}/USD · 출처 open.er-api.com`
            : "환율 조회 중..."
        }
        prices={prices}
        onPricesChange={setPrices}
        onRefreshPrices={handleRefreshPrices}
        refreshing={refreshing}
        priceMessage={priceMessage}
        tokenRows={TOKEN_ROWS}
        tokenOverrides={tokenOverrides}
        onTokenOverridesChange={setTokenOverrides}
        novaTier={novaTier}
        onNovaTierChange={setNovaTier}
      />

      <main className="flex-1 space-y-8 p-4 lg:p-6">
        <div>
          <h1 className="text-2xl font-semibold">💸 AI 서비스 비용 산출 대시보드</h1>
          <p className="text-sm text-muted-foreground">5개 서비스의 기준 산출물 1건당 비용을 환율·수량·단가 변동에 따라 시뮬레이션.</p>
        </div>

        <ServiceTabs
          opts={opts}
          onOptsChange={(k, patch) => setOpts((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }))}
          qty={qty}
          onQtyChange={(k, n) => setQty((prev) => ({ ...prev, [k]: n }))}
          fx={fx}
          costs={costs}
          onStepModelChange={(key, model) => setStepModelOverrides((prev) => ({ ...prev, [key]: model }))}
        />

        <Separator />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">📊 통합 비교</h2>
          <ComparisonTable costs={costs} qty={qty} />
          <CostLineChart unitKrw={unitKrw} />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">환율 민감도 (총비용 KRW)</h3>
            <FxSensitivityTable unitUsd={unitUsd} qty={qty} fx={fx} />
          </div>
        </section>

        <p className="text-xs text-muted-foreground">산출 엔진: lib/services.ts · 단가/토큰/환율은 모두 추정 기본값이며 UI에서 수정 가능합니다.</p>
      </main>
    </div>
  );
}
