/**
 * The Dart Counter mark: an orbit ring, open at the top left, where a dart
 * flies in to the bull. Same drawing as public/favicon.svg and the app icons.
 */
export function Logo({ className, onAnimationEnd }: { className?: string; onAnimationEnd?: () => void }) {
  return (
    <svg className={className} onAnimationEnd={onAnimationEnd} viewBox="0 0 100 100" aria-hidden="true">
      <circle className="logo__track" cx="50" cy="50" r="36" />
      {/* Three quarters, from 12 o'clock round to 9 o'clock. */}
      <circle className="logo__orbit" cx="50" cy="50" r="36" pathLength={100} strokeDasharray="75 100" transform="rotate(-90 50 50)" />
      <circle className="logo__bull" cx="50" cy="50" r="11" />
      {/* The dart: point, barrel, then the flight. */}
      <path className="logo__point" d="M33 33L42 42" />
      <path className="logo__dart" d="M24 24L33 33" />
      <path className="logo__flight" d="M25 25L19 7L14 14L7 19Z" />
    </svg>
  )
}
