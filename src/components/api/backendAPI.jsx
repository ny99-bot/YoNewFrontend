/**
 * =============================================================================
 * PACK-IT BACKEND API CONFIGURATION
 * =============================================================================
 * 
 * IMPORTANT: Replace the API_BASE_URL below with your actual backend URL
 * 
 * Example: export const API_BASE_URL = 'https://api.yourbackend.com';
 * 
 * This file contains all API calls to your Gemini-powered backend.
 * Each function corresponds to one endpoint as specified in requirements.
 * =============================================================================
 */

// TODO: REPLACE THIS WITH YOUR ACTUAL BACKEND URL
export const API_BASE_URL = 'https://your-backend-api.com';

/**
 * Backend API Client for Pack-It
 * All functions return promises that resolve to the expected data format
 */
export const backendAPI = {
  /**
   * Get AI-powered packing suggestions
   * Endpoint: POST /gemini/suggest
   * 
   * @param {Object} data - Trip and packing data
   * @param {string} data.destination - Destination city/country
   * @param {Object} data.dates - { start: string, end: string }
   * @param {string} data.airline - Airline name
   * @param {string} data.travelClass - Economy, Premium Economy, Business, or First
   * @param {string} data.purpose - Trip purpose
   * @param {Array} data.items - Array of { name, quantity, category }
   * 
   * @returns {Promise<Object>} { missing: string[], climate: string[], purpose: string[] }
   */
  async getSuggestions({ destination, dates, airline, travelClass, purpose, items }) {
    try {
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
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      throw error;
    }
  },

  /**
   * Get weight estimates for packing items
   * Endpoint: POST /gemini/weight
   * 
   * @param {Array} items - Array of { name, quantity, category }
   * 
   * @returns {Promise<Object>} { items: Array<{name, qty, aiWeight}>, totalG: number }
   */
  async getWeightEstimates({ items }) {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get weight estimates:', error);
      throw error;
    }
  },

  /**
   * Get optimization recommendations for overweight luggage
   * Endpoint: POST /gemini/optimize
   * 
   * @param {Array} items - Array of items with weights
   * @param {number} limitKg - Airline weight limit in kg
   * 
   * @returns {Promise<Object>} { keep: string[], drop: string[], totalG: number, limitG: number }
   */
  async getOptimization({ items, limitKg }) {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, limitKg })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get optimization:', error);
      throw error;
    }
  },

  /**
   * Get step-by-step packing instructions
   * Endpoint: POST /gemini/steps
   * 
   * @param {Array} items - Array of items to pack
   * @param {string} luggageType - Type of luggage (default: 'suitcase')
   * 
   * @returns {Promise<Object>} { steps: Array<{title, body}>, luggageType: string }
   */
  async getPackingSteps({ items, luggageType = 'suitcase' }) {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, luggageType })
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get packing steps:', error);
      throw error;
    }
  }
};