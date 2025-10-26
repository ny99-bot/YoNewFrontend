// API Configuration for Pack-It Backend
// ===========================================
// TODO: Replace this with your actual backend base URL
export const API_BASE_URL = 'https://your-backend-api.com';

// API Client for Pack-It Backend
export const packItAPI = {
  // Get AI suggestions for missing items
  async getSuggestions({ destination, dates, airline, travelClass, purpose, items }) {
    const response = await fetch(`${API_BASE_URL}/gemini/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        dates,
        airline,
        travelClass,
        purpose,
        items
      })
    });
    
    if (!response.ok) throw new Error('Failed to get AI suggestions');
    return await response.json();
    // Expected response: { missing: [], climate: [], purpose: [] }
  },

  // Get weight estimates for items
  async getWeightEstimates({ items }) {
    const response = await fetch(`${API_BASE_URL}/gemini/weight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) throw new Error('Failed to get weight estimates');
    return await response.json();
    // Expected response: { items: [{name, qty, aiWeight}], totalG: number }
  },

  // Get optimization recommendations
  async getOptimization({ items, limitKg }) {
    const response = await fetch(`${API_BASE_URL}/gemini/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, limitKg })
    });
    
    if (!response.ok) throw new Error('Failed to get optimization');
    return await response.json();
    // Expected response: { keep: [], drop: [], totalG: number, limitG: number }
  },

  // Get packing strategy steps
  async getPackingSteps({ items, luggageType = 'suitcase' }) {
    const response = await fetch(`${API_BASE_URL}/gemini/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, luggageType })
    });
    
    if (!response.ok) throw new Error('Failed to get packing steps');
    return await response.json();
    // Expected response: { steps: [{title, body}], luggageType: string }
  }
};