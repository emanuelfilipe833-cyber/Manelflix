
import React from 'react';
import { IPTVItem } from '../types';
import { ChevronRight, PlayCircle } from 'lucide-react';

interface ContentRowProps {
  title: string;
  items: IPTVItem[];
  onSelect: (item: IPTVItem) => void;
}

const ContentRow: React.FC<ContentRowProps> = ({ title, items, onSelect }) => {
  if (items.length === 0) return null;

  return (
    <div className="py-4 px-4 md:px-12 group">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-100 flex items-center gap-2">
        {title} <ChevronRight size={20} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </h2>
      <div className="flex gap-2 md:gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="flex-shrink-0 w-[140px] md:w-[220px] relative transition-transform duration-300 hover:scale-105 cursor-pointer z-10"
          >
            <div className="aspect-[2/3] md:aspect-video bg-gray-900 rounded-md overflow-hidden shadow-lg border border-transparent hover:border-gray-500">
              <img
                src={item.logo}
                alt={item.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.name}/300/450`;
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <PlayCircle className="text-white" size={48} />
              </div>
            </div>
            <p className="mt-2 text-sm md:text-base font-medium truncate text-gray-300">{item.name}</p>
            {item.group === 'Live' && (
              <span className="absolute top-2 left-2 bg-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                AO VIVO
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContentRow;
