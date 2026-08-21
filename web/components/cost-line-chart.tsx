"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SERV_ORDER, SHORT_NAME, seriesColor, ink } from "@/lib/theme-palette";
import type { ServiceKey } from "@/lib/services";

interface Props {
  unitKrw: Record<ServiceKey, number>;
}

// Recharts' 내부 label render prop 타입이 제네릭이라 구체 타입과 맞지 않음 — 런타임 형태만 신뢰.
function endLabel(lastIndex: number, text: string, color: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function EndLabel(props: any) {
    const x = Number(props.x);
    const y = Number(props.y);
    if (props.index !== lastIndex || Number.isNaN(x) || Number.isNaN(y)) return <g />;
    return (
      <text x={x + 6} y={y} dy={4} fill={color} fontSize={11} textAnchor="start">
        {text}
      </text>
    );
  }
  return EndLabel;
}

export function CostLineChart({ unitKrw }: Props) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const colors = seriesColor(dark);
  const theme = ink(dark);

  const [sweepMax, setSweepMax] = useState(1000);
  const [logY, setLogY] = useState(true);

  const data = useMemo(() => {
    const xs = Array.from(new Set(Array.from({ length: 60 }, (_, i) => Math.max(1, Math.round((sweepMax * i) / 59)))));
    return xs.map((x) => {
      const row: Record<string, number> = { x };
      for (const k of SERV_ORDER) row[k] = unitKrw[k] * x;
      return row;
    });
  }, [sweepMax, unitKrw]);
  const lastIndex = data.length - 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-64 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <Label>스윕 최대 건수</Label>
            <span className="tabular-nums text-muted-foreground">{sweepMax.toLocaleString()}</span>
          </div>
          <Slider value={sweepMax} onValueChange={(v) => setSweepMax(v as number)} min={10} max={10000} step={50} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox checked={logY} onCheckedChange={(c) => setLogY(Boolean(c))} id="logy" />
          <Label htmlFor="logy" className="text-sm font-normal">
            Y축 로그 스케일 (vod↔review 격차 큼)
          </Label>
        </div>
      </div>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 60, bottom: 10, left: 10 }}>
            <CartesianGrid stroke={theme.grid} />
            <XAxis
              dataKey="x"
              stroke={theme.axis}
              tick={{ fill: theme.muted, fontSize: 11 }}
              label={{ value: "기준 수량 (건)", position: "insideBottom", offset: -5, fill: theme.muted }}
            />
            <YAxis
              scale={logY ? "log" : "linear"}
              domain={logY ? ["auto", "auto"] : [0, "auto"]}
              stroke={theme.axis}
              tick={{ fill: theme.muted, fontSize: 11 }}
              tickFormatter={(v: number) => `₩${v.toLocaleString()}`}
              width={90}
              allowDataOverflow
            />
            <Tooltip
              contentStyle={{ background: theme.surface, border: `1px solid ${theme.grid}`, color: theme.primary }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [`₩${Number(value).toLocaleString()}`, SHORT_NAME[name as ServiceKey]]}
              labelFormatter={(x) => `${Number(x).toLocaleString()}건`}
            />
            {SERV_ORDER.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={k}
                stroke={colors[k]}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                label={endLabel(lastIndex, SHORT_NAME[k], colors[k])}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
