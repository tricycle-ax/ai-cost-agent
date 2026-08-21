"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODEL_KIND, KIND_LABEL, KIND_FIELD } from "@/lib/pricing";
import type { PriceEntry } from "@/lib/services";

interface Props {
  prices: Record<string, PriceEntry>;
  onChange: (prices: Record<string, PriceEntry>) => void;
  onRefresh: () => void;
  refreshing: boolean;
  message: string | null;
}

export function PriceTableEditor({ prices, onChange, onRefresh, refreshing, message }: Props) {
  const setField = (model: string, field: keyof PriceEntry, v: number) => {
    onChange({ ...prices, [model]: { ...prices[model], [field]: v } });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">단가 테이블 (USD)</p>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "조회 중..." : "🔄 단가 자동 업데이트"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">⚠️ 기본값은 조사일 참고치. luma/exa는 수동 유지.</p>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <div className="rounded-md border max-h-72 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>모델</TableHead>
              <TableHead>과금</TableHead>
              <TableHead className="text-right">단가</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(MODEL_KIND).map((model) => {
              const kind = MODEL_KIND[model];
              const p = prices[model] ?? {};
              return (
                <TableRow key={model}>
                  <TableCell className="font-mono text-xs">{model}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{KIND_LABEL[kind]}</TableCell>
                  <TableCell>
                    {kind === "token" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-7 w-20 text-right"
                          value={p.in ?? 0}
                          onChange={(e) => setField(model, "in", Number(e.target.value))}
                        />
                        <span className="text-xs text-muted-foreground">/</span>
                        <Input
                          type="number"
                          step="0.0001"
                          className="h-7 w-20 text-right"
                          value={p.out ?? 0}
                          onChange={(e) => setField(model, "out", Number(e.target.value))}
                        />
                      </div>
                    ) : (
                      <Input
                        type="number"
                        step="0.0001"
                        className="ml-auto h-7 w-24 text-right"
                        value={p[KIND_FIELD[kind]!] ?? 0}
                        onChange={(e) => setField(model, KIND_FIELD[kind]!, Number(e.target.value))}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
