import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERV_ORDER, SHORT_NAME } from "@/lib/theme-palette";
import type { ServiceKey } from "@/lib/services";

interface Props {
  unitUsd: Record<ServiceKey, number>;
  qty: Record<ServiceKey, number>;
  fx: number;
}

export function FxSensitivityTable({ unitUsd, qty, fx }: Props) {
  const fxVals = Array.from(new Set([1300, 1350, 1380, 1400, 1450, 1500, Math.round(fx)])).sort((a, b) => a - b);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>환율</TableHead>
            {SERV_ORDER.map((k) => (
              <TableHead key={k} className="text-right">
                {SHORT_NAME[k]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fxVals.map((f) => (
            <TableRow key={f}>
              <TableCell>
                {f.toLocaleString()}
                {f === Math.round(fx) && <span className="text-muted-foreground"> ←현재</span>}
              </TableCell>
              {SERV_ORDER.map((k) => (
                <TableCell key={k} className="text-right tabular-nums">
                  ₩{Math.round(unitUsd[k] * f * qty[k]).toLocaleString()}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
