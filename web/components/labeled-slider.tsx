"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}

export function LabeledSlider({ label, value, onChange, min, max, step = 1, format }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="text-muted-foreground tabular-nums">{format ? format(value) : value.toLocaleString()}</span>
      </div>
      <Slider value={value} onValueChange={(v) => onChange(v as number)} min={min} max={max} step={step} />
    </div>
  );
}
