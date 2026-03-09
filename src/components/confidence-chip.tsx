import { Badge } from "@/components/ui/badge";

export function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  if (pct >= 85) return <Badge variant="success">{pct}%</Badge>;
  if (pct >= 70) return <Badge variant="warning">{pct}%</Badge>;
  return <Badge variant="danger">{pct}%</Badge>;
}
