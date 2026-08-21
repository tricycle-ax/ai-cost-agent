"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { TokenStepRow, TokenOverride } from "@/lib/services";

interface Props {
  rows: TokenStepRow[];
  overrides: Record<string, TokenOverride>;
  onChange: (overrides: Record<string, TokenOverride>) => void;
}

export function TokenTableEditor({ rows, overrides, onChange }: Props) {
  const setField = (sid: string, base: TokenOverride, field: keyof TokenOverride, v: number) => {
    onChange({ ...overrides, [sid]: { ...base, [field]: v } });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">입력 토큰 추정치</p>
      <p className="text-xs text-muted-foreground">코드에 명시된 값은 출력 max_tokens뿐. input은 추정(수정 가능).</p>
      <div className="rounded-md border max-h-72 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>서비스</TableHead>
              <TableHead>단계</TableHead>
              <TableHead className="text-right">input</TableHead>
              <TableHead className="text-right">output</TableHead>
              <TableHead className="text-right">시스템(캐시)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const v = overrides[r.sid] ?? { in: r.in_tok, out: r.out_tok, sys: r.sys_tok };
              return (
                <TableRow key={r.sid}>
                  <TableCell className="text-xs text-muted-foreground whitespace-normal">{r.svc}</TableCell>
                  <TableCell className="text-xs whitespace-normal">{r.step}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step={100}
                      className="ml-auto h-7 w-20 text-right"
                      value={v.in}
                      onChange={(e) => setField(r.sid, v, "in", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step={100}
                      className="ml-auto h-7 w-20 text-right"
                      value={v.out}
                      onChange={(e) => setField(r.sid, v, "out", Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step={100}
                      className="ml-auto h-7 w-20 text-right"
                      value={v.sys ?? 0}
                      onChange={(e) => setField(r.sid, v, "sys", Number(e.target.value))}
                    />
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
