// 라이트/다크 검증 팔레트 — app.py PALETTE / INK 1:1 포트.
import type { ServiceKey } from "./services";

export const SERV_ORDER: ServiceKey[] = ["coordi", "review", "search", "vod", "batchpro"];
export const SHORT_NAME: Record<ServiceKey, string> = {
  coordi: "코디",
  review: "상품평",
  search: "검색추천",
  vod: "VOD영상",
  batchpro: "속성추출",
};

const PALETTE = {
  light: ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#eb6834"],
  dark: ["#3987e5", "#199e70", "#c98500", "#008300", "#d95926"],
};

export const INK = {
  light: {
    primary: "#0b0b0b",
    secondary: "#52514e",
    muted: "#898781",
    grid: "#e1e0d9",
    axis: "#c3c2b7",
    surface: "#fcfcfb",
  },
  dark: {
    primary: "#ffffff",
    secondary: "#c3c2b7",
    muted: "#898781",
    grid: "#2c2c2a",
    axis: "#383835",
    surface: "#1a1a19",
  },
};

export function seriesColor(dark: boolean): Record<ServiceKey, string> {
  const p = dark ? PALETTE.dark : PALETTE.light;
  return Object.fromEntries(SERV_ORDER.map((k, i) => [k, p[i]])) as Record<ServiceKey, string>;
}

export function ink(dark: boolean) {
  return dark ? INK.dark : INK.light;
}
