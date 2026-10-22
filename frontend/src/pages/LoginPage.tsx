import React from "react";
import { Navigate } from "react-router-dom";

export const LoginPage: React.FC = () => {
  return <Navigate to="/events" replace />;
};

export default LoginPage;
