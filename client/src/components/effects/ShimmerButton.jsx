import { motion } from 'framer-motion';

export default function ShimmerButton({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-accent to-emerald-500 px-8 font-semibold text-white shadow-lg shadow-accent/25 overflow-hidden transition-shadow hover:shadow-accent/40 ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.button>
  );
}
