import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Weight } from 'lucide-react';

export default function WeightDisplay({ totalWeight, limit }) {
  const percentage = limit ? Math.min((totalWeight / limit) * 100, 100) : 0;
  const isOverLimit = totalWeight > limit;
  const warningThreshold = limit * 0.9;
  const isNearLimit = totalWeight > warningThreshold && !isOverLimit;

  return (
    <Card className={`border-2 ${
      isOverLimit 
        ? 'bg-red-50/50 border-red-200' 
        : isNearLimit 
        ? 'bg-yellow-50/50 border-yellow-200'
        : 'bg-green-50/50 border-green-200'
    }`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Weight className={`w-5 h-5 ${
              isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'
            }`} />
            <h3 className="font-semibold text-gray-900">Total Weight</h3>
          </div>
          {isOverLimit ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className={`text-4xl font-bold ${
              isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {totalWeight.toFixed(1)}
            </span>
            <span className="text-gray-500 text-lg">/ {limit} kg</span>
          </div>

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                isOverLimit 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : isNearLimit 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-green-500 to-green-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${
              isOverLimit ? 'text-red-700' : isNearLimit ? 'text-yellow-700' : 'text-green-700'
            }`}>
              {isOverLimit 
                ? `Over limit by ${(totalWeight - limit).toFixed(1)} kg` 
                : isNearLimit
                ? `${(limit - totalWeight).toFixed(1)} kg remaining`
                : 'Within limit'
              }
            </span>
            <span className="text-gray-500">{percentage.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}