interface IconProps {
  size?: number;
  className?: string;
}

function svgProps({ size = 22, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export function IconBarbell(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 12h2M19 12h2M7 12h10" />
      <rect x="5" y="8" width="2.4" height="8" rx="0.8" />
      <rect x="16.6" y="8" width="2.4" height="8" rx="0.8" />
      <rect x="9" y="6.5" width="2" height="11" rx="0.7" transform="translate(-6.5 0)" opacity="0" />
    </svg>
  );
}

export function IconHistory(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.5" />
      <path d="M4 4v4.5H8.5" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 4v16h16" />
      <path d="M7.5 14.5l3.5-4 3 2.5 4.5-6" />
    </svg>
  );
}

export function IconPlan(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M8 5h12M8 12h12M8 19h12" />
      <circle cx="4.2" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.2" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGear(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.35.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.39 2.54a7 7 0 0 0-2.42 1.4l-2.35-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .48.05.94.14 1.4l-2 1.55 2 3.46 2.35-.95a7 7 0 0 0 2.42 1.4l.39 2.54h3.4l.39-2.54a7 7 0 0 0 2.42-1.4l2.35.95 2-3.46-2-1.55c.09-.46.14-.92.14-1.4Z" />
    </svg>
  );
}

export function IconPlay(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconArrowUp(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function IconArrowDown(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

export function IconCloud(p: IconProps & { slash?: boolean }) {
  return (
    <svg {...svgProps(p)}>
      <path d="M7 18a4.5 4.5 0 1 1 .6-8.96A6 6 0 0 1 19.3 10.6 3.8 3.8 0 0 1 18 18H7Z" />
      {p.slash ? <path d="M4 20 20 4" /> : null}
    </svg>
  );
}

export function IconPopOut(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
      <path d="M14 4h6v6" />
      <path d="M20 4l-8 8" />
    </svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

// ---- implement icons (how an exercise is loaded) ----

export function IconBodyweight(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="5" r="2.3" />
      <path d="M12 8.5v6M8 10l4-1.5 4 1.5M12 14.5 9.5 20M12 14.5l2.5 5.5" />
    </svg>
  );
}

export function IconDumbbell(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="2.5" y="9" width="3" height="6" rx="0.8" />
      <rect x="5.5" y="7" width="3" height="10" rx="0.8" />
      <path d="M8.5 12h7" />
      <rect x="15.5" y="7" width="3" height="10" rx="0.8" />
      <rect x="18.5" y="9" width="3" height="6" rx="0.8" />
    </svg>
  );
}

export function IconBarbellLoad(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M1.5 12h2M20.5 12h2M8.5 12h7" />
      <rect x="3.5" y="6.5" width="2.4" height="11" rx="0.7" />
      <rect x="6" y="8.5" width="2.4" height="7" rx="0.7" />
      <rect x="15.6" y="8.5" width="2.4" height="7" rx="0.7" />
      <rect x="18.1" y="6.5" width="2.4" height="11" rx="0.7" />
    </svg>
  );
}

export function IconFixedBar(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M7 12h10" />
      <circle cx="5" cy="12" r="2.6" />
      <circle cx="19" cy="12" r="2.6" />
    </svg>
  );
}

export function IconCable(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="5" r="2.6" />
      <path d="M9.4 5H6v3M12 7.6V16" />
      <path d="M8.5 16h7l-1 4h-5l-1-4Z" />
    </svg>
  );
}

export function IconMachine(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="6" y="4" width="12" height="4" rx="0.8" />
      <rect x="6" y="10" width="12" height="4" rx="0.8" />
      <rect x="6" y="16" width="12" height="4" rx="0.8" />
      <path d="M3 12h3" />
    </svg>
  );
}

export function IconPlate(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" opacity="0.6" />
    </svg>
  );
}
