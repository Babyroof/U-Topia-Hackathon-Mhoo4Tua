import { CheckIcon } from "@heroicons/react/24/outline";

const POINTS = [
  "Use your latest paper deed, the one the land office has on record",
  "Copy every detail exactly as printed, including the location and area",
  "The partner checks against the current register; outdated details are rejected",
];

/** Document-with-checks illustration in the theme colours (inline, no image file). */
const Illustration = () => (
  <svg viewBox="0 0 240 170" className="w-56 h-auto" aria-hidden>
    <g className="text-primary" fill="currentColor" opacity="0.08">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i} x="30" y={30 + i * 10} width="70" height="4" rx="2" />
      ))}
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x="150" y={20 + i * 10} width="70" height="4" rx="2" />
      ))}
    </g>
    {/* back sheet */}
    <rect x="92" y="18" width="104" height="138" rx="12" className="fill-primary" opacity="0.25" />
    {/* front sheet */}
    <rect
      x="78"
      y="10"
      width="104"
      height="138"
      rx="12"
      className="fill-base-100 stroke-base-content"
      strokeWidth="2"
    />
    {[0, 1, 2, 3].map(i => (
      <g key={i} transform={`translate(0 ${i * 30})`}>
        <circle cx="100" cy="36" r="9" className="fill-success" />
        <path d="M96 36l3 3 6-6" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <rect x="116" y="31" width="50" height="5" rx="2.5" className="fill-primary" opacity="0.45" />
        <rect x="116" y="40" width="32" height="5" rx="2.5" className="fill-primary" opacity="0.25" />
      </g>
    ))}
    {/* phone */}
    <rect x="44" y="84" width="40" height="70" rx="8" className="fill-primary stroke-base-content" strokeWidth="2" />
    <rect x="50" y="94" width="28" height="44" rx="3" className="fill-base-100" />
    <path
      d="M57 116l5 5 9-10"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      className="text-success"
      strokeLinecap="round"
    />
  </svg>
);

/** Shown before the deed form: make sure the user brings current, exact details. */
export const TokenizeIntro = ({ onStart }: { onStart: () => void }) => (
  <section className="surface w-full max-w-xl px-6 py-8 sm:px-10 flex flex-col items-center text-center gap-4">
    <Illustration />
    <h1 className="text-2xl sm:text-3xl m-0">Time to check your deed details</h1>
    <p className="m-0 opacity-80">
      We need your most up-to-date information. The partner compares your request with the current land office register,
      so please make sure that:
    </p>
    <ul className="list-none p-0 m-0 flex flex-col gap-3 text-left w-full">
      {POINTS.map(p => (
        <li key={p} className="flex items-start gap-3">
          <CheckIcon className="h-6 w-6 text-success shrink-0" strokeWidth={2.5} aria-hidden />
          <span>{p}</span>
        </li>
      ))}
    </ul>
    <button className="btn btn-primary btn-lg w-full mt-2" onClick={onStart}>
      Start entering my deed
    </button>
  </section>
);
