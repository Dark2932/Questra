export default function GradientText({ children, className = '' }) {
  return (
    <span
      className={`bg-gradient-to-r from-accent via-emerald-400 to-teal-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient ${className}`}
    >
      {children}
    </span>
  );
}
