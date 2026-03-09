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

const TRACK_TEMPLATES = [
  "M28 54 C42 22, 86 18, 118 28 C148 38, 174 50, 166 74 C156 102, 112 106, 78 94 C56 86, 42 82, 32 92 C24 100, 16 90, 20 78 C24 66, 20 62, 28 54",
  "M24 66 C22 40, 50 24, 82 22 C116 20, 158 28, 170 52 C178 68, 168 84, 148 90 C128 96, 122 106, 100 106 C70 106, 44 96, 30 84 C22 76, 24 72, 24 66",
  "M30 40 C44 20, 84 20, 110 30 C138 40, 166 44, 170 64 C174 86, 146 100, 118 98 C92 96, 86 86, 66 88 C44 90, 24 78, 26 62 C28 50, 24 48, 30 40",
  "M34 34 C54 18, 84 16, 112 20 C136 24, 162 30, 170 48 C178 66, 162 80, 136 84 C114 88, 98 96, 72 96 C50 96, 30 84, 24 70 C18 56, 24 44, 34 34",
  "M22 54 C30 28, 62 18, 92 24 C112 28, 126 40, 148 38 C164 36, 176 48, 174 64 C172 84, 148 92, 126 92 C108 92, 96 102, 74 102 C44 102, 22 88, 20 70 C18 62, 18 60, 22 54",
  "M30 72 C20 54, 34 28, 66 22 C96 16, 136 22, 158 38 C174 50, 176 70, 162 82 C148 94, 128 94, 110 98 C84 104, 58 102, 42 92 C34 88, 34 80, 30 72"
] as const;

function selectTrackPath(seedText: string) {
  const seed = hashString(seedText || "Circuit");
  return TRACK_TEMPLATES[seed % TRACK_TEMPLATES.length];
}

export function CircuitVisualization({ gpName }: CircuitVisualizationProps) {
  const path = selectTrackPath(gpName);

  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-gradient-to-br from-neutral-900/80 via-black/40 to-neutral-900/80 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-mutedForeground">Circuit Visualization</p>
      <svg viewBox="0 0 200 120" className="mt-2 h-32 w-full">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x="2" y="2" width="196" height="116" rx="10" fill="url(#grid)" className="stroke-neutral-800" />
        <path d={path} className="fill-none stroke-neutral-700" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} className="fill-none stroke-accent" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="28" y1="58" x2="42" y2="58" className="stroke-white" strokeWidth="2.5" />
        <circle cx="28" cy="58" r="2.8" className="fill-white" />
      </svg>
      <p className="mt-1 text-[11px] text-mutedForeground">Stylized schematic for {gpName}</p>
    </div>
  );
}
