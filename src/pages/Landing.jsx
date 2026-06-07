import React from "react";
import { Navigate } from "react-router-dom";

// Landing page that shows the external site first, with a clear link to the Kids Home page
export default function Landing() {
  return <Navigate to="/Home" replace />;
}

