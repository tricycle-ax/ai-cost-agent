"use client";

import { LabeledSlider } from "./labeled-slider";
import { PriceTableEditor } from "./price-table-editor";
import { TokenTableEditor } from "./token-table-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NOVA_TIERS, NOVA_TIER_LABEL, type PriceEntry, type TokenOverride, type TokenStepRow } from "@/lib/services";

interface Props {
  fx: number;
  onFxChange: (n: number) => void;
  fxCaption: string;
  prices: Record<string, PriceEntry>;
  onPricesChange: (p: Record<string, PriceEntry>) => void;
  onRefreshPrices: () => void;
  refreshing: boolean;
  priceMessage: string | null;
  tokenRows: TokenStepRow[];
  tokenOverrides: Record<string, TokenOverride>;
  onTokenOverridesChange: (o: Record<string, TokenOverride>) => void;
  novaTier: string;
  onNovaTierChange: (t: string) => void;
}

export function SidebarGlobalParams(props: Props) {
  return (
    <aside className="w-full shrink-0 space-y-6 border-b p-4 lg:h-screen lg:w-[420px] lg:overflow-y-auto lg:border-r lg:border-b-0 lg:sticky lg:top-0">
      <h2 className="text-lg font-semibold">⚙️ 전역 파라미터</h2>

      <div>
        <LabeledSlider
          label="환율 (KRW/USD)"
          value={props.fx}
          onChange={props.onFxChange}
          min={1000}
          max={2000}
          step={10}
          format={(v) => `₩${v.toLocaleString()}`}
        />
        <p className="mt-1 text-xs text-muted-foreground">{props.fxCaption}</p>
      </div>

      <PriceTableEditor
        prices={props.prices}
        onChange={props.onPricesChange}
        onRefresh={props.onRefreshPrices}
        refreshing={props.refreshing}
        message={props.priceMessage}
      />

      <TokenTableEditor rows={props.tokenRows} overrides={props.tokenOverrides} onChange={props.onTokenOverridesChange} />

      <div className="space-y-1.5">
        <Label>AWS Nova 서비스 티어</Label>
        <Select value={props.novaTier} onValueChange={(v) => props.onNovaTierChange(v as string)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(NOVA_TIERS).map((t) => (
              <SelectItem key={t} value={t}>
                {NOVA_TIER_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">💡 모델을 Nova로 교체한 모든 단계에 이 티어가 적용됩니다.</p>
      </div>
    </aside>
  );
}
