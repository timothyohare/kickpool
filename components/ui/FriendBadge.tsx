'use client';

interface Props {
  name: string;
  colour: string;
  size?: 'sm' | 'md';
}

export default function FriendBadge({ name, colour, size = 'sm' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white ${padding}`}
      style={{ backgroundColor: colour }}
    >
      {name}
    </span>
  );
}
