export default function Logo({ size = 22, className = '' }) {
  const c = 2 * Math.PI * 24;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * 0.84} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <circle cx="11.74" cy="19.14" r="4.2" fill="currentColor" />
      <path d="M32 19 Q33.9 30.1 45 32 Q33.9 33.9 32 45 Q30.1 33.9 19 32 Q30.1 30.1 32 19Z" fill="currentColor" />
    </svg>
  );
}
