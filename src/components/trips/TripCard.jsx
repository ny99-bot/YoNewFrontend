import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plane, Weight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function TripCard({ trip, onClick }) {
  const duration = trip.start_date && trip.end_date 
    ? Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24))
    : 0;

  const isOverLimit = trip.total_weight && trip.airline_limit && trip.total_weight > trip.airline_limit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(59, 130, 246, 0.15)' }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer bg-gradient-to-br from-white to-blue-50/30 border-blue-100/50 hover:border-blue-200 transition-all"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {trip.destination}
                </CardTitle>
                {trip.airline && (
                  <p className="text-xs text-gray-500 mt-0.5">{trip.airline}</p>
                )}
              </div>
            </div>
            <Badge 
              variant={trip.status === 'completed' ? 'default' : 'secondary'}
              className={trip.status === 'completed' 
                ? 'bg-green-100 text-green-700 border-green-200' 
                : 'bg-gray-100 text-gray-600'
              }
            >
              {trip.status === 'completed' ? 'Completed' : 'Draft'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>
              {trip.start_date && format(new Date(trip.start_date), 'MMM d')} - {trip.end_date && format(new Date(trip.end_date), 'MMM d, yyyy')}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{duration} days</span>
          </div>

          {trip.total_weight && (
            <div className="flex items-center gap-2 text-sm">
              <Weight className="w-4 h-4 text-blue-500" />
              <span className={isOverLimit ? 'text-red-600 font-medium' : 'text-gray-600'}>
                {trip.total_weight.toFixed(1)} kg
              </span>
              {trip.airline_limit && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{trip.airline_limit} kg limit</span>
                </>
              )}
            </div>
          )}

          {trip.items && trip.items.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-medium text-blue-600">{trip.items.length}</span>
              </div>
              <span>items packed</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}