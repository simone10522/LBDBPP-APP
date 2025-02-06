import React from 'react';
import { X } from 'lucide-react';

interface ParticipantListProps {
  participants: string[];
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

export default function ParticipantList({ participants, onRemove, readonly }: ParticipantListProps) {
  return (
    <ul className="space-y-2">
      {participants.map((participant, index) => (
        <li 
          key={index}
          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
        >
          <span>{participant}</span>
          {!readonly && onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
