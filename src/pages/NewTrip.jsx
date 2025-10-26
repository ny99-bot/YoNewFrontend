import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import {
  getUid,
  getAiSuggestions,
  getWeights,
  optimizeItems,
  getPackingSteps,
  saveTrip,
  saveTripItems,
} from "../apiClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Plus,
  CheckCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import StepIndicator from "../components/trips/StepIndicator";
import ItemForm from "../components/trips/ItemForm";
import ItemsList from "../components/trips/ItemsList";
import WeightDisplay from "../components/trips/WeightDisplay";

export default function NewTrip() {
  const navigate = useNavigate();

  // which screen we're on
  const [currentStep, setCurrentStep] = useState(1);

  // UX state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // this is the working draft of the trip we're building
  const [tripData, setTripData] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    airline: "",
    travel_class: "Economy",
    purpose: "Vacation",
    // items the user is packing
    items: [],
    // AI results
    ai_suggestions: null,
    // weight + airline limit info
    total_weight: 0,
    airline_limit: 23,
    optimization: null,
    // packing plan
    packing_steps: [],
  });

  // helper to update tripData
  const updateTripData = (updates) => {
    setTripData((prev) => ({ ...prev, ...updates }));
  };

  //
  // ====== AUTO-RUN LOGIC FOR STEPS 3,4,5 ======
  //
  useEffect(() => {
    // Step 3 => get AI suggestions
    if (currentStep === 3 && !tripData.ai_suggestions && !loading) {
      fetchAISuggestions();
    }

    // Step 4 => get weight + optimization
    if (currentStep === 4 && tripData.total_weight === 0 && !loading) {
      fetchWeightData();
    }

    // Step 5 => get packing steps
    if (
      currentStep === 5 &&
      tripData.packing_steps.length === 0 &&
      !loading
    ) {
      fetchPackingSteps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  //
  // ====== BACKEND CALLS (YOUR RENDER API) ======
  //

  const fetchAISuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const suggestions = await getAiSuggestions({
        destination: tripData.destination,
        dates: {
          start: tripData.start_date,
          end: tripData.end_date,
        },
        airline: tripData.airline,
        travelClass: tripData.travel_class,
        purpose: tripData.purpose,
        items: tripData.items,
      });

      // suggestions is expected to look like:
      // { missing: [...], climate: [...], purpose: [...] }
      updateTripData({
        ai_suggestions: suggestions,
      });
    } catch (err) {
      console.error(err);
      setError(
        "Failed to get AI suggestions. Please check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWeightData = async () => {
    setLoading(true);
    setError(null);
    try {
      // call backend to estimate weights
      const weightData = await getWeights({
        items: tripData.items,
      });
      // weightData: { items: [{... item, aiWeight }...], totalG }

      // attach aiWeight -> weight on each item
      const itemsWithWeights = tripData.items.map((item, i) => ({
        ...item,
        weight: weightData.items?.[i]?.aiWeight || 0,
      }));

      const totalWeightKg = (weightData.totalG || 0) / 1000;

      let optimizationResult = null;
      if (totalWeightKg > tripData.airline_limit) {
        optimizationResult = await optimizeItems({
          items: itemsWithWeights,
          limitKg: tripData.airline_limit,
        });
        // optimizationResult: { keep, drop, totalG, limitG }
      }

      updateTripData({
        items: itemsWithWeights,
        total_weight: totalWeightKg,
        optimization: optimizationResult,
      });
    } catch (err) {
      console.error(err);
      setError(
        "Failed to calculate weights. Please check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPackingSteps = async () => {
    setLoading(true);
    setError(null);
    try {
      const stepsData = await getPackingSteps({
        items: tripData.items,
        luggageType: "suitcase", // you can make this dynamic later
      });

      // stepsData: { steps: [ { title, body }, ... ], luggageType }
      updateTripData({
        packing_steps: stepsData.steps || [],
      });
    } catch (err) {
      console.error(err);
      setError(
        "Failed to get packing strategy. Please check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  //
  // ====== LOCAL ITEM EDITING ======
  //

  const addItem = (item) => {
    updateTripData({
      items: [...tripData.items, item],
    });
  };

  const removeItem = (index) => {
    updateTripData({
      items: tripData.items.filter((_, i) => i !== index),
    });
  };

  const addSuggestedItem = (itemName) => {
    addItem({
      name: itemName,
      quantity: 1,
      category: "Other",
    });
  };

  //
  // ====== NAV BETWEEN STEPS ======
  //

  const handleNext = async () => {
    setError(null);

    // Step 1 validation
    if (currentStep === 1) {
      if (
        !tripData.destination ||
        !tripData.start_date ||
        !tripData.end_date
      ) {
        setError("Please fill in all required fields");
        return;
      }
    }

    // Step 2 validation
    if (currentStep === 2) {
      if (tripData.items.length === 0) {
        setError("Please add at least one item to your packing list");
        return;
      }
    }

    // Final step => save trip
    if (currentStep === 5) {
      await handleSaveTrip();
      return;
    }

    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((s) => s - 1);
  };

  //
  // ====== SAVE FINAL TRIP TO YOUR BACKEND ======
  //

  const handleSaveTrip = async () => {
    setLoading(true);
    setError(null);

    try {
      const uid = getUid(); // comes from apiClient (localStorage fallback)

      // Build a shape the backend can store
      // You get to define this. Here's a reasonable default:
      const tripPayload = {
        destination: tripData.destination,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        airline: tripData.airline,
        travelClass: tripData.travel_class,
        purpose: tripData.purpose,
        status: "completed",

        // optional extras you may want to store:
        airlineLimitKg: tripData.airline_limit,
        totalWeightKg: tripData.total_weight,
        aiSuggestions: tripData.ai_suggestions,
        packingSteps: tripData.packing_steps,
        optimization: tripData.optimization,
        createdAt: new Date().toISOString(),
      };

      // saveTrip(uid, tripId?, tripData)
      // - tripId can be null to create a new one
      // This should return { tripId: "abc123" } (you can implement that in apiClient/server)
      const { tripId } = await saveTrip(uid, null, tripPayload);

      // Then save items in bulk
      // saveTripItems(uid, tripId, itemsArray)
      await saveTripItems(uid, tripId, tripData.items);

      // After saving, go to summary
      navigate(createPageUrl("TripSummary") + `?id=${tripId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to save trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  //
  // ====== RENDER UI ======
  //

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 via-white to-blue-50/20 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                currentStep === 1
                  ? navigate(createPageUrl("Home"))
                  : handleBack()
              }
              disabled={loading}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">New Trip</h1>
          </div>
          <StepIndicator currentStep={currentStep} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: TRIP DETAILS */}
        {currentStep === 1 && (
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={tripData.destination}
                  onChange={(e) =>
                    updateTripData({ destination: e.target.value })
                  }
                  placeholder="e.g., Paris, Tokyo, New York"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={tripData.start_date}
                    onChange={(e) =>
                      updateTripData({ start_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={tripData.end_date}
                    onChange={(e) =>
                      updateTripData({ end_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="airline">Airline</Label>
                <Input
                  id="airline"
                  value={tripData.airline}
                  onChange={(e) =>
                    updateTripData({ airline: e.target.value })
                  }
                  placeholder="e.g., Delta, United, Emirates"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cabin Class</Label>
                  <Select
                    value={tripData.travel_class}
                    onValueChange={(value) =>
                      updateTripData({ travel_class: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Economy">Economy</SelectItem>
                      <SelectItem value="Premium Economy">
                        Premium Economy
                      </SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="First">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Trip Purpose</Label>
                  <Select
                    value={tripData.purpose}
                    onValueChange={(value) =>
                      updateTripData({ purpose: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacation">Vacation</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Adventure">Adventure</SelectItem>
                      <SelectItem value="Family Visit">
                        Family Visit
                      </SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="airline_limit">Baggage Limit (kg)</Label>
                <Input
                  id="airline_limit"
                  type="number"
                  value={tripData.airline_limit}
                  onChange={(e) =>
                    updateTripData({
                      airline_limit:
                        parseFloat(e.target.value) || 23,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: PACKING ITEMS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <ItemForm onAddItem={addItem} />

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Your Packing List
              </h3>
              <ItemsList
                items={tripData.items}
                onRemoveItem={removeItem}
              />
            </div>
          </div>
        )}

        {/* STEP 3: AI SUGGESTIONS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-none shadow-lg">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Getting AI suggestions...
                  </p>
                </CardContent>
              </Card>
            ) : tripData.ai_suggestions ? (
              <>
                {tripData.ai_suggestions.missing?.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-500" />
                        You Might Be Missing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tripData.ai_suggestions.missing.map(
                        (item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                          >
                            <span className="text-gray-900">
                              {item}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                addSuggestedItem(item)
                              }
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}

                {tripData.ai_suggestions.climate?.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle>
                        Climate Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tripData.ai_suggestions.climate.map(
                        (tip, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 bg-green-50 rounded-lg"
                          >
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-900">
                              {tip}
                            </span>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}

                {tripData.ai_suggestions.purpose_specific
                  ?.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle>
                        For Your {tripData.purpose}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tripData.ai_suggestions.purpose_specific.map(
                        (tip, i) => (
                          <div
                            key={i}
                            className="flex gap-3 p-3 bg-purple-50 rounded-lg"
                          >
                            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-900">
                              {tip}
                            </span>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* STEP 4: WEIGHT & LIMITS */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-none shadow-lg">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Calculating weights...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <WeightDisplay
                  totalWeight={tripData.total_weight}
                  limit={tripData.airline_limit}
                />

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Items with Weights
                  </h3>
                  <ItemsList
                    items={tripData.items}
                    showWeight={true}
                  />
                </div>

                {tripData.optimization &&
                  tripData.total_weight >
                    tripData.airline_limit && (
                    <Card className="border-none shadow-lg bg-yellow-50/50">
                      <CardHeader>
                        <CardTitle className="text-yellow-900">
                          Optimization Suggestions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Recommended to Keep:
                          </h4>
                          <div className="space-y-1">
                            {tripData.optimization.keep?.map(
                              (item, i) => (
                                <div
                                  key={i}
                                  className="text-sm text-gray-700"
                                >
                                  ✓ {item}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Consider Removing:
                          </h4>
                          <div className="space-y-1">
                            {tripData.optimization.drop?.map(
                              (item, i) => (
                                <div
                                  key={i}
                                  className="text-sm text-gray-700"
                                >
                                  × {item}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </div>
        )}

        {/* STEP 5: PACKING STRATEGY */}
        {currentStep === 5 && (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-none shadow-lg">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Generating packing strategy...
                  </p>
                </CardContent>
              </Card>
            ) : tripData.packing_steps.length > 0 ? (
              <>
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader>
                    <CardTitle>Your Packing Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Follow these steps for optimal packing:
                    </p>
                  </CardContent>
                </Card>

                {tripData.packing_steps.map((step, i) => (
                  <Card key={i} className="border-none shadow-md">
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2 text-gray-900">
                            {step.title}
                          </h3>
                          <p className="text-gray-600">
                            {step.body}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : null}
          </div>
        )}

        {/* STEP NAVIGATION */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : currentStep === 5 ? (
              <>
                Finish Trip
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
