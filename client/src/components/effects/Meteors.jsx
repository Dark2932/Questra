import { useMemo } from 'react';

export default function Meteors({ number = 20, className = '' }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: number }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 5}s`,
        duration: `${Math.random() * 3 + 3}s`,
        size: Math.random() * 2 + 1,
      })),
    [number],
  );

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {meteors.map((m) => (
        <div
          key={m.id}
          className="absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.25)]"
          style={{
            left: m.left,
            animationDelay: m.delay,
            animationDuration: m.duration,
            width: `${m.size}px`,
            height: `${m.size}px`,
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 h-[1px] w-[60px] -translate-x-full bg-gradient-to-r from-white/50 to-transparent" />
        </div>
      ))}
    </div>
  );
}
