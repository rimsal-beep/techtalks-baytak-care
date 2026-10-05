// Small visual pieces shared by the properties pages: a decorative house scene and line icons.

const ICON_PATHS = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.6 2.6l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.1-.5-.5-2.1 2.8-2.4z" />
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ---------- decorative house scene (the database has no property photo) ---------- */

type Palette = {
  sky: [string, string];
  sun: string;
  far: string;
  near: string;
  wall: string;
  roof: string;
  glass: string;
  door: string;
  leaf: string;
  stars: boolean;
};

const PALETTES: Palette[] = [
  // golden hour
  { sky: ["#F6E1BE", "#F2C78A"], sun: "#FFF3D2", far: "#D9B88C", near: "#BCA37C", wall: "#F4EADA", roof: "#B5503C", glass: "#2E4A6A", door: "#7A4B33", leaf: "#8E9B66", stars: false },
  // clear day
  { sky: ["#CCE1F1", "#EBF4F8"], sun: "#FFFFFF", far: "#A9BFAE", near: "#8DA68D", wall: "#F5EFE3", roof: "#9E4B3B", glass: "#27496D", door: "#6F4A36", leaf: "#7F9D78", stars: false },
  // dusk
  { sky: ["#2C4068", "#E5A98F"], sun: "#F7F0DA", far: "#3C4C6E", near: "#2B3956", wall: "#EADFCB", roof: "#7C403B", glass: "#F6D387", door: "#5A3A2C", leaf: "#324A47", stars: true },
];

function hash(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A small illustrated house. The look (time of day, house style) is picked from the property id.
 * `viewBox` lets a wide banner show just the band of the scene that contains the house.
 */
export function PropertyArt({ seed, viewBox = "0 0 800 480" }: { seed: string; viewBox?: string }) {
  const h = hash(seed);
  const p = PALETTES[h % 3];
  const block = (h >> 3) % 2 === 1;
  const sunX = 130 + (h % 4) * 150;
  const gid = `pa${h.toString(36)}`;

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="800" height="480" fill={`url(#${gid}-sky)`} />

      {p.stars &&
        [[90, 60], [210, 110], [330, 50], [470, 90], [560, 40], [690, 120], [740, 60], [150, 170]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#FFF8E6" opacity=".85" />
        ))}

      <circle cx={sunX} cy="112" r="82" fill={p.sun} opacity=".22" />
      <circle cx={sunX} cy="112" r="46" fill={p.sun} />

      <path d="M0 330 C120 268 240 300 360 322 S610 282 800 312 V480 H0Z" fill={p.far} />
      <path d="M0 400 C160 352 300 384 450 374 S700 352 800 384 V480 H0Z" fill={p.near} />
      <ellipse cx="400" cy="394" rx="190" ry="14" fill="#000" opacity=".12" />

      {/* tree */}
      <rect x="628" y="334" width="10" height="62" fill="#6B5642" />
      <ellipse cx="633" cy="316" rx="50" ry="60" fill={p.leaf} />
      <ellipse cx="164" cy="372" rx="36" ry="30" fill={p.leaf} opacity=".9" />

      {block ? (
        <g>
          <rect x="330" y="190" width="140" height="204" fill={p.wall} />
          <rect x="322" y="180" width="156" height="14" fill={p.roof} />
          {[0, 1, 2, 3].flatMap((r) =>
            [0, 1, 2].map((c) => (
              <rect key={`${r}-${c}`} x={345 + c * 40} y={208 + r * 42} width="26" height="28" rx="2" fill={p.glass} />
            ))
          )}
          <rect x="388" y="354" width="24" height="40" rx="2" fill={p.door} />
        </g>
      ) : (
        <g>
          <rect x="455" y="232" width="18" height="44" fill={p.wall} />
          <rect x="300" y="285" width="200" height="109" fill={p.wall} />
          <polygon points="278,291 400,214 522,291" fill={p.roof} />
          <rect x="322" y="318" width="40" height="38" rx="2" fill={p.glass} />
          <rect x="438" y="318" width="40" height="38" rx="2" fill={p.glass} />
          <rect x="386" y="334" width="28" height="60" rx="2" fill={p.door} />
          <circle cx="408" cy="366" r="2" fill={p.wall} />
        </g>
      )}
    </svg>
  );
}
