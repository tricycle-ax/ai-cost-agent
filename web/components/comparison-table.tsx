import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SERVICES, type ServiceKey } from "@/lib/services";
import { SERV_ORDER } from "@/lib/theme-palette";
import type { ServiceCostResult } from "@/lib/compute-service-cost";

interface Props {
  costs: Record<ServiceKey, ServiceCostResult>;
  qty: Record<ServiceKey, number>;
}

export function ComparisonTable({ costs, qty }: Props) {
  return (
    <div className="space-y-1">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>서비스</TableHead>
              <TableHead>기준단위</TableHead>
              <TableHead className="text-right">1건당 USD</TableHead>
              <TableHead className="text-right">1건당 KRW</TableHead>
              <TableHead className="text-right">수량(건)</TableHead>
              <TableHead className="text-right">총비용 KRW</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SERV_ORDER.map((k) => (
              <TableRow key={k}>
                <TableCell>{SERVICES[k].name}</TableCell>
                <TableCell className="text-muted-foreground">{SERVICES[k].unit}</TableCell>
                <TableCell className="text-right tabular-nums">${costs[k].usd.toFixed(6)}</TableCell>
                <TableCell className="text-right tabular-nums">₩{costs[k].krw.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{qty[k].toLocaleString()}</TableCell>
                <TableCell className="text-right tabular-nums">₩{Math.round(costs[k].krw * qty[k]).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">ℹ️ aqua/yellow 계열은 라이트 배경에서 대비가 낮아 정확한 값은 이 표를 기준으로 확인.</p>
    </div>
  );
}
