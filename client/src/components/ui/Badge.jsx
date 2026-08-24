const variants = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
  single: 'bg-blue-50 text-blue-600 border-blue-200',
  multiple: 'bg-purple-50 text-purple-600 border-purple-200',
  text: 'bg-amber-50 text-amber-600 border-amber-200',
  required: 'bg-red-50 text-red-600 border-red-200',
  optional: 'bg-gray-50 text-gray-500 border-gray-200',
  exam: 'bg-orange-50 text-orange-600 border-orange-200',
  survey: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function Badge({ variant = 'active', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${
        variants[variant] || variants.active
      } ${className}`}
    >
      {children}
    </span>
  );
}
