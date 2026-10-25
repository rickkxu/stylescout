import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { filled?: boolean };
const base = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const HeartIcon = ({ filled, ...p }: P) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.5 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.4 0 5.5 3.4 4.3 6.6-1.8 4.8-9.3 9.4-9.3 9.4z" />
  </svg>
);
export const ThumbDownIcon = ({ filled, ...p }: P) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M10 15v4a2.5 2.5 0 0 0 2.5 2.5L17 13V3H6.3a2 2 0 0 0-2 1.7l-1.3 8A2 2 0 0 0 5 15h5z" />
    <path d="M17 3h2.7A1.8 1.8 0 0 1 21.5 5v6.3a1.8 1.8 0 0 1-1.8 1.7H17" />
  </svg>
);
export const ChatIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />
  </svg>
);
export const MicIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
export const SendIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const HomeIcon = ({ filled, ...p }: P) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />
  </svg>
);
export const UserIcon = ({ filled, ...p }: P) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6z" />
  </svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v3h3M4 13a8 8 0 0 0 14.6 4.5M20 20v-3h-3" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const BagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const PencilIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
  </svg>
);
