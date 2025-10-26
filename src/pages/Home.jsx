import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Plane, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TripCard from "../components/trips/TripCard";
import { motion } from "framer-motion";

import { listTrips, getUid } from "../apiClient";

export default function Home() {
  const navigate = useNavigate();

  // Instead of base44.auth.me(), just use a placeholder "user"
  // We'll plug in real Firebase client auth later.
  const [user] = useState(() => {
    const fallbackName = "Traveler";
    const stored = localStorage.getItem("full_name");
    return { full_name: stored || fallbackName };
  });

  const uid = getUid(); // stable per-browser "user id" for now

  // Grab trips from YOUR backend
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", uid],
    queryFn: () => listTrips(uid),
    initialData: [],
  });

  const firstName = user?.full_name?.split(" ")[0] || "Traveler";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Plane className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-bold">Pack-It</h1>
            </div>
            <p className="text-blue-100 text-lg">
              Welcome back, {firstName}! ✈️
            </p>
            <p className="text-blue-200 text-sm mt-2">
              Your AI Travel Packing Assistant
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Quick Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Button
            onClick={() => navigate(createPageUrl("NewTrip"))}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all h-14 text-base"
          >
            <Plus className="w-5 h-5 mr-2" />
            Start a New Trip
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        {/* Trips Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Trips</h2>
            {trips.length > 0 && (
              <span className="text-sm text-gray-500">
                {trips.length} trip{trips.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 bg-gray-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-3xl border-2 border-dashed border-gray-200"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plane className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No trips yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Start planning your first trip and get AI-powered packing
                suggestions
              </p>
              <Button
                onClick={() => navigate(createPageUrl("NewTrip"))}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() =>
                    navigate(createPageUrl("TripSummary") + `?id=${trip.id}`)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
