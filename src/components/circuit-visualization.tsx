interface CircuitVisualizationProps {
  gpName: string;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildTrackPath(seedText: string) {
  const seed = hashString(seedText);
  const cx = 100;
  const cy = 60;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < 14; i += 1) {
    const angle = (Math.PI * 2 * i) / 14;
    const wobbleA = ((seed >> (i % 16)) & 0xff) / 255;
    const wobbleB = ((seed >> ((i + 5) % 16)) & 0xff) / 255;
    const radiusX = 45 + wobbleA * 30;
    const radiusY = 25 + wobbleB * 22;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    points.push({ x, y });
  }

  const start = points[0];
  let d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;

  for (let i = 1; i <= points.length; i += 1) {
    const current = points[i % points.length];
    const prev = points[(i - 1) % points.length];
    const mx = (prev.x + current.x) / 2;
    const my = (prev.y + current.y) / 2;
    d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }

  d += " Z";
  return d;
}

export function CircuitVisualization({ gpName }: CircuitVisualizationProps) {
  const path = buildTrackPath(gpName || "Circuit");

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-mutedForeground">Circuit Visualization</p>
      <svg viewBox="0 0 200 120" className="mt-2 h-28 w-full">
        <rect x="2" y="2" width="196" height="116" rx="10" className="fill-transparent stroke-neutral-800" />
        <path d={path} className="fill-none stroke-accent" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="100" cy="60" r="2.5" className="fill-white/80" />
      </svg>
      <p className="mt-1 text-[11px] text-mutedForeground">Stylized schematic for {gpName}</p>
    </div>
  );
}
