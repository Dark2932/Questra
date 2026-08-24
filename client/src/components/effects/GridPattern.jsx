export default function GridPattern({ className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.04] dark:via-accent/[0.08] to-transparent" />
    </div>
  );
}

