import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(function Select({ label, children, className = '', ...props }, ref) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={`w-full h-10 px-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-900
            appearance-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
            transition-all duration-200 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
});

export default Select;
