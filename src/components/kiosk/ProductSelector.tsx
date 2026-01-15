'use client';

import { cn, formatPrice, formatDuration } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductSelectorProps {
  products: Product[];
  selectedId: string | null;
  onSelect: (productId: string) => void;
}

export function ProductSelector({ products, selectedId, onSelect }: ProductSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onSelect(product.id)}
          className={cn(
            'p-6 rounded-xl border-2 transition-all text-center',
            'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
            selectedId === product.id
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-blue-300'
          )}
        >
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {formatDuration(product.durationMin)}
          </div>
          <div className="text-xl font-semibold text-blue-600">
            {formatPrice(product.price)}
          </div>
          {product.isDefault && (
            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
              추천
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
