"use client";

import { LabeledSlider } from "./labeled-slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  SERVICES,
  VIDEO_MODELS,
  VIDEO_RESOLUTIONS,
  type ServiceKey,
  type CoordiOptions,
  type ReviewOptions,
  type SearchOptions,
  type VodOptions,
  type BatchproOptions,
} from "@/lib/services";
import type { ServiceCostResult } from "@/lib/compute-service-cost";

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-28"
      />
    </div>
  );
}

interface Props {
  svcKey: ServiceKey;
  opts: Record<string, unknown>;
  onOptsChange: (patch: Record<string, unknown>) => void;
  qty: number;
  onQtyChange: (n: number) => void;
  fx: number;
  cost: ServiceCostResult;
  onStepModelChange: (key: string, model: string) => void;
}

export function ServiceTab({ svcKey, opts, onOptsChange, qty, onQtyChange, fx, cost, onStepModelChange }: Props) {
  const svc = SERVICES[svcKey];
  const { rows, usd: usd1, krw: krw1 } = cost;

  return (
    <div className="grid grid-cols-1 gap-6 py-4 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-4">
        {svc.url && (
          <a
            href={svc.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-primary underline underline-offset-4"
          >
            🔗 {svc.name} — 서비스 새 탭에서 열기
          </a>
        )}
        <p className="text-sm">
          <span className="font-medium">제공자:</span> {svc.provider}
        </p>

        <LabeledSlider label="기준 수량 (건)" value={qty} onChange={onQtyChange} min={1} max={10000} step={10} />

        {svcKey === "coordi" && <CoordiOptionsForm opts={opts as unknown as CoordiOptions} onChange={onOptsChange} />}
        {svcKey === "review" && (
          <ReviewOptionsForm opts={opts as unknown as ReviewOptions} models={svc.selectable_model!} onChange={onOptsChange} />
        )}
        {svcKey === "search" && <SearchOptionsForm opts={opts as unknown as SearchOptions} onChange={onOptsChange} />}
        {svcKey === "vod" && <VodOptionsForm opts={opts as unknown as VodOptions} onChange={onOptsChange} />}
        {svcKey === "batchpro" && <BatchproOptionsForm opts={opts as unknown as BatchproOptions} onChange={onOptsChange} />}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="1건당 (USD)" value={`$${usd1.toFixed(6)}`} />
          <Metric label="1건당 (KRW)" value={`₩${krw1.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
          <Metric label={`총비용 (${qty.toLocaleString()}건)`} value={`₩${Math.round(krw1 * qty).toLocaleString()}`} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>단계</TableHead>
                <TableHead>모델 (변경 가능)</TableHead>
                <TableHead>공급사</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead className="text-right">KRW</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ step, chosen, choices, provider, usd, key }) => (
                <TableRow key={step.id}>
                  <TableCell className="whitespace-normal text-sm">{step.name}</TableCell>
                  <TableCell>
                    <Select value={chosen} onValueChange={(v) => onStepModelChange(key, v as string)}>
                      <SelectTrigger className="h-7 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {choices.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{provider}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">${usd.toFixed(6)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">₩{(usd * fx).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 모델은 같은 과금 방식 내에서만 교체 가능(토큰 단계→LLM, 이미지 단계→이미지, 비디오 단계→Veo/Luma).
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CoordiOptionsForm({ opts: o, onChange }: { opts: CoordiOptions; onChange: (p: Record<string, unknown>) => void }) {
  const svc = SERVICES.coordi;
  const showParsedItems = o.mode.includes("modeC");
  const showTryOn = o.mode.includes("tryon") || o.mode === "mode1" || o.mode === "mode2";
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-sm">모드</Label>
        <Select value={o.mode} onValueChange={(v) => onChange({ mode: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(svc.modes!).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showParsedItems && (
        <NumField label="파싱/재랭킹 품목 수 (개)" value={o.parsed_items_n} min={1} max={10} onChange={(v) => onChange({ parsed_items_n: v })} />
      )}
      {showTryOn && <NumField label="착장 횟수 N" value={o.try_on_n} min={1} max={50} onChange={(v) => onChange({ try_on_n: v })} />}
      <LabeledSlider label="재시도 가중률 (%)" value={o.retry_pct} min={0} max={300} step={5} onChange={(v) => onChange({ retry_pct: v })} />
    </>
  );
}

function ReviewOptionsForm({
  opts: o,
  models,
  onChange,
}: {
  opts: ReviewOptions;
  models: string[];
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-sm">모델</Label>
        <Select value={o.model} onValueChange={(v) => onChange({ model: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <LabeledSlider
        label="검증 재시도 평균 (회)"
        value={o.val_retries}
        min={0}
        max={5}
        step={0.1}
        onChange={(v) => onChange({ val_retries: v })}
      />
    </>
  );
}

function SearchOptionsForm({ opts: o, onChange }: { opts: SearchOptions; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <LabeledSlider
        label="큐레이션 캐시 적중률 (%)"
        value={o.cache_hit_pct}
        min={0}
        max={100}
        step={5}
        onChange={(v) => onChange({ cache_hit_pct: v })}
      />
      <div className="flex items-center gap-2">
        <Checkbox checked={o.exa_enabled} onCheckedChange={(c) => onChange({ exa_enabled: Boolean(c) })} id="exa_enabled" />
        <Label htmlFor="exa_enabled" className="text-sm font-normal">
          Exa 트렌드 수집 포함
        </Label>
      </div>
      <NumField label="Exa 검색 호출 수" value={o.exa_calls} min={1} max={10} onChange={(v) => onChange({ exa_calls: v })} />
      <NumField label="Exa 결과 수/호출" value={o.exa_results} min={1} max={10} onChange={(v) => onChange({ exa_results: v })} />
    </>
  );
}

function VodOptionsForm({ opts: o, onChange }: { opts: VodOptions; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <LabeledSlider label="평균 분석 이미지 수" value={o.avg_images} min={1} max={14} onChange={(v) => onChange({ avg_images: v })} />
      <div className="space-y-1.5">
        <Label className="text-sm">비디오 모델</Label>
        <Select value={o.video_model} onValueChange={(v) => onChange({ video_model: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(VIDEO_MODELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">해상도</Label>
        <Select value={o.video_res} onValueChange={(v) => onChange({ video_res: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_RESOLUTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <LabeledSlider
        label="비디오 길이 (초)"
        value={o.video_sec}
        min={1}
        max={30}
        step={1}
        onChange={(v) => onChange({ video_sec: v })}
      />
      <LabeledSlider label="Luma 폴백 확률 (%)" value={o.luma_prob} min={0} max={100} step={5} onChange={(v) => onChange({ luma_prob: v })} />
    </>
  );
}

function BatchproOptionsForm({ opts: o, onChange }: { opts: BatchproOptions; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <LabeledSlider label="분석 이미지 수" value={o.images} min={1} max={6} onChange={(v) => onChange({ images: v })} />
      <div className="flex items-center gap-2">
        <Checkbox
          checked={o.cache_read_mult < 1.0}
          onCheckedChange={(c) => onChange({ cache_read_mult: c ? 0.1 : 1.0 })}
          id="bp_cache"
        />
        <Label htmlFor="bp_cache" className="text-sm font-normal">
          프롬프트 캐시 적용 (시스템 프롬프트, 읽기 90% 할인)
        </Label>
      </div>
    </>
  );
}
