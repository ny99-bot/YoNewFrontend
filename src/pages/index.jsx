// src/pages/index.jsx
import React from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from "react-router-dom";
import Layout from "./Layout.jsx";

import Home from "./Home";
import NewTrip from "./NewTrip";
import TripSummary from "./TripSummary";

const PAGES = { Home, NewTrip, TripSummary };

function _getCurrentPage(url) {
  if (url.endsWith("/")) url = url.slice(0, -1);
  let last = url.split("/").pop() || "Home";
  if (last.includes("?")) last = last.split("?")[0];
  const pageName = Object.keys(PAGES).find(
    (p) => p.toLowerCase() === last.toLowerCase()
  );
  return pageName || "Home";
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        {/* Home (both cases) */}
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* NewTrip (both cases) */}
        <Route path="/NewTrip" element={<NewTrip />} />
        <Route path="/newtrip" element={<NewTrip />} />

        {/* TripSummary (both cases) */}
        <Route path="/TripSummary" element={<TripSummary />} />
        <Route path="/tripsummary" element={<TripSummary />} />

        {/* Fallback: send unknown routes to Home */}
        <Route path="*" element={<Navigate to="/Home" replace />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
