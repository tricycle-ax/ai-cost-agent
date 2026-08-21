"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceTab } from "./service-tab";
import { SERVICES } from "@/lib/services";
import { SERV_ORDER } from "@/lib/theme-palette";
import type { ServiceKey } from "@/lib/services";
import type { ServiceCostResult } from "@/lib/compute-service-cost";

interface Props {
  opts: Record<ServiceKey, Record<string, unknown>>;
  onOptsChange: (svcKey: ServiceKey, patch: Record<string, unknown>) => void;
  qty: Record<ServiceKey, number>;
  onQtyChange: (svcKey: ServiceKey, n: number) => void;
  fx: number;
  costs: Record<ServiceKey, ServiceCostResult>;
  onStepModelChange: (key: string, model: string) => void;
}

export function ServiceTabs({ opts, onOptsChange, qty, onQtyChange, fx, costs, onStepModelChange }: Props) {
  return (
    <Tabs defaultValue={SERV_ORDER[0]}>
      <TabsList className="h-auto flex-wrap">
        {SERV_ORDER.map((k) => (
          <TabsTrigger key={k} value={k}>
            {SERVICES[k].name} ({SERVICES[k].unit})
          </TabsTrigger>
        ))}
      </TabsList>
      {SERV_ORDER.map((k) => (
        <TabsContent key={k} value={k}>
          <ServiceTab
            svcKey={k}
            opts={opts[k]}
            onOptsChange={(patch) => onOptsChange(k, patch)}
            qty={qty[k]}
            onQtyChange={(n) => onQtyChange(k, n)}
            fx={fx}
            cost={costs[k]}
            onStepModelChange={onStepModelChange}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
