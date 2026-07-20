/**
 * A whisper-faint decorative backdrop drawn behind the entire app.
 *
 * Two mirrored filigree flourishes anchor opposite corners (top-left and
 * bottom-right, echoing the reference art) with a scatter of soft "bubble"
 * rings between them. It's rendered as a single fixed, non-interactive layer at
 * a very low opacity so it livens the canvas without ever competing with real
 * content. Purely ornamental — hidden from assistive tech.
 */
export function OrnamentBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* top-left flourish */}
      <Flourish className="absolute -left-16 -top-20 h-[34rem] w-[34rem] text-waku-cinematic/[0.028]" />
      {/* bottom-right flourish, mirrored */}
      <Flourish className="absolute -bottom-24 -right-16 h-[38rem] w-[38rem] rotate-180 text-iris-300/[0.025]" />
    </div>
  );
}

/**
 * One corner's worth of filigree — sweeping vines that spiral into curls, plus
 * a few floating rings. Drawn in a 460×460 space emanating from the (0,0)
 * corner; `currentColor` carries the (already very low) tint from the caller.
 */
function Flourish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* primary sweeping vine */}
        <path d="M-10 66 C 150 22 224 150 176 252 C 150 306 96 322 78 384 C 62 436 128 474 214 456" />
        {/* branch curling off the primary vine into a spiral */}
        <path d="M176 252 C 240 240 286 286 258 334 C 242 362 208 356 210 326 C 211 308 230 304 238 318" />
        {/* second vine, shallower */}
        <path d="M34 -8 C 66 120 34 202 126 252 C 198 292 258 250 312 302" />
        {/* terminal curl of the second vine */}
        <path d="M312 302 C 356 302 378 336 360 368 C 348 388 320 380 324 358 C 326 346 342 344 348 354" />
        {/* fine flourish thread */}
        <path d="M96 40 C 130 96 118 150 168 168 C 214 184 250 156 296 176" strokeWidth={1.25} />
      </g>

      {/* floating rings — the "bubble" motif from the reference art */}
      <g stroke="currentColor" fill="none">
        <circle cx="352" cy="104" r="34" strokeWidth={1.5} />
        <circle cx="392" cy="150" r="14" strokeWidth={1.25} />
        <circle cx="286" cy="120" r="7" strokeWidth={1.25} />
        <circle cx="150" cy="316" r="10" strokeWidth={1.25} />
        <circle cx="210" cy="360" r="4.5" strokeWidth={1} />
      </g>

      {/* a couple of solid specks for depth */}
      <g fill="currentColor">
        <circle cx="330" cy="140" r="2.5" />
        <circle cx="128" cy="288" r="2" />
        <circle cx="240" cy="318" r="1.6" />
      </g>
    </svg>
  );
}
