'use client';

import Link from 'next/link';
import type { Friend } from '@/types';

interface Props {
  friends: Friend[];
  currentFriendId: string;
}

export default function FriendPicker({ friends, currentFriendId }: Props) {
  function remember(friendId: string) {
    document.cookie = `kickpool_me=${friendId}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <div className="flex gap-1.5 flex-wrap px-4 py-3">
      {friends.map((f) => (
        <Link
          key={f.id}
          href={`/my-teams?friend=${f.id}`}
          onClick={() => remember(f.id)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
          style={
            f.id === currentFriendId
              ? { backgroundColor: f.colour, borderColor: f.colour, color: 'white' }
              : { backgroundColor: 'white', borderColor: '#d1d5db', color: '#4b5563' }
          }
        >
          {f.name}
        </Link>
      ))}
    </div>
  );
}
