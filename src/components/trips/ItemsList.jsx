import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categoryColors = {
  'Clothing': 'bg-blue-100 text-blue-700',
  'Toiletries': 'bg-purple-100 text-purple-700',
  'Electronics': 'bg-orange-100 text-orange-700',
  'Documents': 'bg-green-100 text-green-700',
  'Medications': 'bg-red-100 text-red-700',
  'Shoes': 'bg-yellow-100 text-yellow-700',
  'Accessories': 'bg-pink-100 text-pink-700',
  'Other': 'bg-gray-100 text-gray-700'
};

export default function ItemsList({ items, onRemoveItem, showWeight = false }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No items added yet</p>
        <p className="text-sm text-gray-400 mt-1">Add items to start building your packing list</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card className="p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <Badge className={categoryColors[item.category] || categoryColors['Other']}>
                        {item.category}
                      </Badge>
                      <span className="text-sm text-gray-500">× {item.quantity}</span>
                    </div>
                    {showWeight && item.weight && (
                      <p className="text-xs text-gray-500 mt-1">~{item.weight.toFixed(2)} kg</p>
                    )}
                  </div>
                </div>
                {onRemoveItem && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(index)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}