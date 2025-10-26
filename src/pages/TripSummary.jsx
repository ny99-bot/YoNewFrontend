import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Home,
  Calendar,
  Plane,
  Package,
} from "lucide-react";
import { format } from "date-fns";

import ItemsList from "../components/trips/ItemsList";
import WeightDisplay from "../components/trips/WeightDisplay";

// 🔁 you'll add these in apiClient.js
import { getUid, fetchTripDetails } from "../apiClient";

export default function TripSummary() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // load trip on mount
  useEffect(() => {
    const loadTrip = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tripId = urlParams.get("id");

        if (!tripId) {
          setLoading(false);
          return;
        }

        const uid = getUid();

        // ask backend for this trip (and items)
        // fetchTripDetails should call something like:
        //   GET /trips/list?uid=... OR /trips/:id?uid=...
        //   GET /trips/items?uid=...&tripId=...
        //
        // and combine them into one object.
        //
        // expected shape:
        // {
        //   trip: {...},
        //   items: [...]
        // }
        const data = await fetchTripDetails(uid, tripId);

        // Map backend fields into the shape the UI expects
        // Feel free to adjust this mapping based on your backend save format
        const mappedTrip = {
          id: data.trip.id || tripId,
          destination: data.trip.destination,
          start_date: data.trip.startDate,
          end_date: data.trip.endDate,
          airline: data.trip.airline || "",
          travel_class: data.trip.travelClass || data.trip.travel_class || "Economy",
          purpose: data.trip.purpose || "Trip",
          status: data.trip.status || "completed",

          // weight/limits
          airline_limit:
            data.trip.airlineLimitKg ??
            data.trip.airline_limit ??
            23,
          total_weight:
            data.trip.totalWeightKg ??
            data.trip.total_weight ??
            0,

          // packing stuff
          packing_steps:
            data.trip.packingSteps ??
            data.trip.packing_steps ??
            [],

          // items (with weights)
          items: data.items || [],
        };

        setTrip(mappedTrip);
      } catch (err) {
        console.error("Failed to load trip:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, []);

  // loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  // no trip found (bad id / fetch fail)
  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Trip not found
          </h2>
          <Button onClick={() => navigate(createPageUrl("Home"))}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // duration in days
  const durationDays = (() => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffMs = end - start;
    if (isNaN(diffMs)) return null;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20">
      {/* Header / Hero */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Home"))}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
              <Plane className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">
                {trip.destination || "Trip"}
              </h1>

              <div className="flex flex-wrap gap-3 text-blue-100">
                {/* Dates */}
                {(trip.start_date || trip.end_date) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {trip.start_date
                        ? format(
                            new Date(trip.start_date),
                            "MMM d"
                          )
                        : "?"}{" "}
                      -{" "}
                      {trip.end_date
                        ? format(
                            new Date(trip.end_date),
                            "MMM d, yyyy"
                          )
                        : "?"}
                    </span>
                  </div>
                )}

                {/* Duration */}
                {durationDays && (
                  <>
                    <span>•</span>
                    <span>{durationDays} days</span>
                  </>
                )}

                {/* Airline */}
                {trip.airline && (
                  <>
                    <span>•</span>
                    <span>{trip.airline}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Trip Details Card */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Cabin Class</p>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                {trip.travel_class || "—"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Purpose</p>
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                {trip.purpose || "—"}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Total Items</p>
              <p className="font-semibold text-gray-900">
                {trip.items?.length || 0}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                {trip.status === "completed" ? "Completed" : "Draft"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Weight Summary */}
        {trip.total_weight ? (
          <WeightDisplay
            totalWeight={trip.total_weight}
            limit={trip.airline_limit}
          />
        ) : null}

        {/* Packing List */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Final Packing List
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ItemsList
              items={trip.items || []}
              showWeight={!!trip.total_weight}
            />
          </CardContent>
        </Card>

        {/* Packing Strategy */}
        {trip.packing_steps && trip.packing_steps.length > 0 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Packing Strategy</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {trip.packing_steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {step.title}
                    </h4>
                    <p className="text-gray-600 text-sm">{step.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Back Home button */}
        <Button
          onClick={() => navigate(createPageUrl("Home"))}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          size="lg"
        >
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
