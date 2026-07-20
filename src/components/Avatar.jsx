const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initialsFor(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
};

export default function Avatar({ name, size = 'sm' }) {
  if (!name) return null;
  return (
    <span
      title={name}
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0 ${SIZES[size]} ${colorFor(name)}`}
    >
      {initialsFor(name)}
    </span>
  );
}
