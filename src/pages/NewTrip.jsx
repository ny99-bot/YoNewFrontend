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
  // 🔸 NEW: suitcase lookup API
  lookupLuggage,
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
  Search,
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

  // local UI helpers
  const [customRec, setCustomRec] = useState("");
  const [luggageQuery, setLuggageQuery] = useState("");

  // working draft of the trip
  const [tripData, setTripData] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    airline: "",
    travel_class: "Economy",
    purpose: "Vacation",
    // suitcase size (liters) affects packing strategy
    suitcaseSizeL: 40, // 40 (carry-on), 60 (medium), 90 (large)
    // optional precise dimensions (cm). If provided, we’ll send to backend and it will recompute liters from dims.
    suitcaseDims: { lengthCm: "", widthCm: "", depthCm: "" },

    // items the user is packing
    items: [],
    // AI suggestions (toggle-able objects)
    suggestions: [], // [{id,text,category,reason,selected}]
    // raw legacy field (kept for compatibility, not used for UI now)
    ai_suggestions: null,

    // weight + airline limit info
    total_weight: 0,
    airline_limit: 23,
    optimization: null,

    // packing plan
    packing_steps: [],
    packing_plan: null, // { suitcaseSizeL, suitcaseDims, orderedPackingList, steps }
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
    if (currentStep === 3 && tripData.suggestions.length === 0 && !loading) {
      fetchAISuggestions();
    }

    // Step 4 => get weight + optimization
    if (currentStep === 4 && tripData.total_weight === 0 && !loading) {
      fetchWeightData();
    }

    // Step 5 => get packing steps
    if (currentStep === 5 && !tripData.packing_plan && !loading) {
      fetchPackingSteps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  //
  // ====== BACKEND CALLS ======
  //

  const fetchAISuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAiSuggestions({
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

      // Expect shape: { suggestions: [{id,text,category,reason,selected}] }
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];

      updateTripData({
        suggestions,
        // keep legacy ai_suggestions for backward-compat (not used for UI now)
        ai_suggestions: data,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to get AI suggestions. Please check your backend connection.");
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
        // optimizationResult: { keep, drop, totalG, limitG } (keep/drop are items)
      }

      updateTripData({
        items: itemsWithWeights,
        total_weight: totalWeightKg,
        optimization: optimizationResult,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to calculate weights. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPackingSteps = async () => {
    setLoading(true);
    setError(null);
    try {
      // Transform items so backend sees count + aiWeight fields
      const itemsForPack = (tripData.items || []).map((it) => ({
        ...it,
        count: it.quantity ?? it.qty ?? 1,
        aiWeight: it.weight ?? it.aiWeight ?? 0,
      }));

      const stepsData = await getPackingSteps({
        items: itemsForPack,
        recommendationsSelected: (tripData.suggestions || []).filter((s) => s.selected),
        suitcaseSizeL: tripData.suitcaseSizeL || 40,
        suitcaseDims: normalizeDimsForApi(tripData.suitcaseDims),
        luggageType: "suitcase",
      });

      // Expect shape: { suitcaseSizeL, suitcaseDims, orderedPackingList, steps }
      updateTripData({
        packing_plan: stepsData || null,
        packing_steps: stepsData?.steps || [],
      });
    } catch (err) {
      console.error(err);
      setError("Failed to get packing strategy. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  //
  // ====== LOCAL ITEM / SUGGESTION EDITING ======
  //

  const addItem = (item) => {
    updateTripData({
      items: [...tripData.items, item],
      // reset computeds to recompute
      total_weight: 0,
      optimization: null,
      packing_plan: null,
      packing_steps: [],
    });
  };

  const removeItem = (index) => {
    const nextItems = tripData.items.filter((_, i) => i !== index);
    updateTripData({
      items: nextItems,
      total_weight: 0,
      optimization: null,
      packing_plan: null,
      packing_steps: [],
    });
  };

  const toggleSuggestion = (id, selected) => {
    updateTripData({
      suggestions: (tripData.suggestions || []).map((s) =>
        s.id === id ? { ...s, selected } : s
      ),
      packing_plan: null,
      packing_steps: [],
    });
  };

  const addCustomSuggestion = () => {
    const text = (customRec || "").trim();
    if (!text) return;
    const id = "custom:" + text.toLowerCase().replace(/\s+/g, "-");
    updateTripData({
      suggestions: [
        ...(tripData.suggestions || []),
        { id, text, category: "custom", reason: "User-added", selected: true },
      ],
    });
    setCustomRec("");
  };

  //
  // ====== LUGGAGE LOOKUP & MANUAL DIMS ======
  //

  function normalizeDimsForApi(dims) {
    const L = Number(dims?.lengthCm);
    const W = Number(dims?.widthCm);
    const D = Number(dims?.depthCm);
    if (!L || !W || !D) return null;
    return { lengthCm: L, widthCm: W, depthCm: D };
  }

  const handleManualDimsChange = (key, val) => {
    const next = {
      ...tripData.suitcaseDims,
      [key]: val,
    };
    // Optionally compute liters client-side (display only). The backend will recompute anyway.
    let liters = tripData.suitcaseSizeL;
    const L = Number(next.lengthCm),
      W = Number(next.widthCm),
      D = Number(next.depthCm);
    if (L > 0 && W > 0 && D > 0) {
      liters = Math.round((L * W * D) / 1000);
    }
    updateTripData({
      suitcaseDims: next,
      suitcaseSizeL: liters,
      packing_plan: null,
      packing_steps: [],
    });
  };

  const handleLuggageLookup = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lookupLuggage({ query: luggageQuery });
      if (data?.dims) {
        updateTripData({
          suitcaseDims: {
            lengthCm: String(data.dims.lengthCm ?? ""),
            widthCm: String(data.dims.widthCm ?? ""),
            depthCm: String(data.dims.depthCm ?? ""),
          },
          suitcaseSizeL: Number(data.liters ?? tripData.suitcaseSizeL),
          packing_plan: null,
          packing_steps: [],
        });
      }
    } catch (e) {
      console.error(e);
      setError("Could not look up suitcase info.");
    } finally {
      setLoading(false);
    }
  };

  //
  // ====== NAV BETWEEN STEPS ======
  //

  const handleNext = async () => {
    setError(null);

    // Step 1 validation
    if (currentStep === 1) {
      if (!tripData.destination || !tripData.start_date || !tripData.end_date) {
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

      const acceptedRecs = (tripData.suggestions || []).filter((s) => s.selected);

      const tripPayload = {
        destination: tripData.destination,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        airline: tripData.airline,
        travelClass: tripData.travel_class,
        purpose: tripData.purpose,
        status: "completed",

        airlineLimitKg: tripData.airline_limit,
        totalWeightKg: tripData.total_weight,

        suitcaseSizeL: tripData.suitcaseSizeL,
        suitcaseDims: normalizeDimsForApi(tripData.suitcaseDims),

        // store what user accepted from AI
        acceptedRecommendations: acceptedRecs,

        // pack plan for summary
        packingPlan: tripData.packing_plan,
        packingSteps: tripData.packing_steps,

        // keep legacy fields if you want to inspect later
        aiSuggestionsRaw: tripData.ai_suggestions,
        optimization: tripData.optimization,

        createdAt: new Date().toISOString(),
      };

      const { tripId } = await saveTrip(uid, null, tripPayload);

      // save items in bulk
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
                  onChange={(e) => updateTripData({ airline: e.target.value })}
                  placeholder="e.g., Delta, United, Emirates"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cabin Class</Label>
                  <Select
                    value={tripData.travel_class}
                    onValueChange={(value) => updateTripData({ travel_class: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Economy">Economy</SelectItem>
                      <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="First">First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Trip Purpose</Label>
                  <Select
                    value={tripData.purpose}
                    onValueChange={(value) => updateTripData({ purpose: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacation">Vacation</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Adventure">Adventure</SelectItem>
                      <SelectItem value="Family Visit">Family Visit</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="airline_limit">Baggage Limit (kg)</Label>
                  <Input
                    id="airline_limit"
                    type="number"
                    value={tripData.airline_limit}
                    onChange={(e) =>
                      updateTripData({
                        airline_limit: parseFloat(e.target.value) || 23,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Suitcase Size</Label>
                  <Select
                    value={String(tripData.suitcaseSizeL)}
                    onValueChange={(v) =>
                      updateTripData({
                        suitcaseSizeL: Number(v),
                        packing_plan: null,
                        packing_steps: [],
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">Carry-on ~40L</SelectItem>
                      <SelectItem value="60">Medium ~60L</SelectItem>
                      <SelectItem value="90">Large ~90L</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Suitcase: find online OR enter dimensions */}
              <div className="grid gap-4">
                <div>
                  <Label>Find your suitcase (name or URL)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder='e.g., "Samsonite 21”" or paste a product link'
                      value={luggageQuery}
                      onChange={(e) => setLuggageQuery(e.target.value)}
                    />
                    <Button type="button" onClick={handleLuggageLookup} variant="secondary">
                      <Search className="w-4 h-4 mr-2" />
                      Lookup
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We’ll estimate dimensions (mocked now; can be powered by Gemini later).
                  </p>
                </div>

                <div>
                  <Label>Or enter dimensions (cm)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Length"
                      value={tripData.suitcaseDims.lengthCm}
                      onChange={(e) => handleManualDimsChange("lengthCm", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Width"
                      value={tripData.suitcaseDims.widthCm}
                      onChange={(e) => handleManualDimsChange("widthCm", e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Depth"
                      value={tripData.suitcaseDims.depthCm}
                      onChange={(e) => handleManualDimsChange("depthCm", e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We’ll convert to liters automatically. Current estimate:{" "}
                    <b>{tripData.suitcaseSizeL} L</b>
                  </p>
                </div>
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
              <ItemsList items={tripData.items} onRemoveItem={removeItem} />
            </div>
          </div>
        )}

        {/* STEP 3: AI SUGGESTIONS (toggle-able + add custom) */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-none shadow-lg">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Getting AI suggestions...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      Smart Suggestions for {tripData.destination || "your trip"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(tripData.suggestions || []).length === 0 ? (
                      <p className="text-gray-600">No suggestions yet.</p>
                    ) : (
                      (tripData.suggestions || []).map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={!!s.selected}
                              onChange={(e) => toggleSuggestion(s.id, e.target.checked)}
                              className="mt-1"
                            />
                            <div>
                              <div className="text-gray-900">{s.text}</div>
                              <div className="text-xs text-gray-500">
                                {s.category} {s.reason ? `• ${s.reason}` : ""}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              // quick add an accepted suggestion to items
                              addItem({ name: s.text, quantity: 1, category: "Other" })
                            }
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to list
                          </Button>
                        </label>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Add Your Own Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Input
                      placeholder="e.g., Sunglasses"
                      value={customRec}
                      onChange={(e) => setCustomRec(e.target.value)}
                    />
                    <Button onClick={addCustomSuggestion}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* STEP 4: WEIGHT & LIMITS */}
        {currentStep === 4 && (
          <div className="space-y-6">
            {loading ? (
              <Card className="border-none shadow-lg">
                <CardContent className="py-16 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Calculating weights...</p>
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
                  <ItemsList items={tripData.items} showWeight={true} />
                </div>

                {tripData.optimization && tripData.total_weight > tripData.airline_limit && (
                  <Card className="border-none shadow-lg bg-yellow-50/50">
                    <CardHeader>
                      <CardTitle className="text-yellow-900">Optimization Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Recommended to Keep:
                        </h4>
                        <div className="space-y-1">
                          {(tripData.optimization.keep || []).map((item, i) => (
                            <div key={i} className="text-sm text-gray-700">
                              ✓ {item.name || String(item)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Consider Removing:
                        </h4>
                        <div className="space-y-1">
                          {(tripData.optimization.drop || []).map((item, i) => (
                            <div key={i} className="text-sm text-gray-700">
                              × {item.name || String(item)}
                            </div>
                          ))}
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
                  <p className="text-gray-600">Generating packing strategy...</p>
                </CardContent>
              </Card>
            ) : tripData.packing_plan ? (
              <>
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader>
                    <CardTitle>Your Packing Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Suitcase size: {tripData.packing_plan.suitcaseSizeL}L
                      {tripData.packing_plan.suitcaseDims
                        ? ` • ${tripData.packing_plan.suitcaseDims.lengthCm}×${tripData.packing_plan.suitcaseDims.widthCm}×${tripData.packing_plan.suitcaseDims.depthCm} cm`
                        : ""}{" "}
                      • Follow the sequence below.
                    </p>
                  </CardContent>
                </Card>

                {/* Ordered Packing List (every single item in order) */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Optimal Order (All Items)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ol className="list-decimal ml-6 space-y-1">
                      {(tripData.packing_plan.orderedPackingList || []).map((it, idx) => (
                        <li key={idx}>
                          {it.name}{" "}
                          <span className="text-xs opacity-60">({it.category})</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                {/* Human-readable steps (with layers) */}
                {(tripData.packing_steps || []).map((step, i) => (
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
                          {Array.isArray(step.items) && step.items.length > 0 ? (
                            <ul className="list-disc ml-6 text-gray-700">
                              {step.items.map((name, j) => (
                                <li key={j}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-600">{step.body}</p>
                          )}
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
