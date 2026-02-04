import React, { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import Home from "./Home";
import { CITY_NAMES } from "../constants/cities";

function CityFeed() {
  const location = useLocation();
  const cityName = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("city") ?? params.get("");
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    return CITY_NAMES.find((name) => name.toLowerCase() === normalized) || null;
  }, [location.search]);

  if (!cityName) {
    return <Navigate to="/" replace />;
  }

  return <Home cityName={cityName} />;
}

export default CityFeed;
