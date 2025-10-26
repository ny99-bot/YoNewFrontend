import Layout from "./Layout.jsx";
import Home from "./Home";
import NewTrip from "./NewTrip";
import TripSummary from "./TripSummary";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";

const PAGES = {
  Home,
  NewTrip,
  TripSummary,
};

// Helper to get the current page name for Layout props
function _getCurrentPage(url) {
  if (url.endsWith("/")) url = url.slice(0, -1);
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || "Home";
}

function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        {/* 👇 Root route */}
        <Route path="/" element={<Home />} />
        {/* 👇 Other routes */}
        <Route path="/Home" element={<Home />} />
        <Route path="/NewTrip" element={<NewTrip />} />
        <Route path="/TripSummary" element={<TripSummary />} />
        {/* 👇 Catch-all (optional) */}
        <Route path="*" element={<Home />} />
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
