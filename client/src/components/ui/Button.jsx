import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-gradient-to-r from-accent to-emerald-600 text-white shadow-lg shadow-accent/20 hover:shadow-accent/35 hover:brightness-110',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-sm',
  danger: 'text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  children,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
