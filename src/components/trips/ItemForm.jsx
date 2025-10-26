import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const categories = [
  'Clothing',
  'Toiletries',
  'Electronics',
  'Documents',
  'Medications',
  'Shoes',
  'Accessories',
  'Other'
];

export default function ItemForm({ onAddItem }) {
  const [item, setItem] = useState({
    name: '',
    quantity: 1,
    category: 'Clothing'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (item.name.trim()) {
      onAddItem(item);
      setItem({ name: '', quantity: 1, category: 'Clothing' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Add Item</h3>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="itemName">Item Name</Label>
          <Input
            id="itemName"
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            placeholder="e.g., T-shirt, Jeans, Toothbrush"
            className="mt-1"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => setItem({ ...item, quantity: parseInt(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={item.category} onValueChange={(value) => setItem({ ...item, category: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add to List
        </Button>
      </div>
    </form>
  );
}