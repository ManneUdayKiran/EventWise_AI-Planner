import React from "react";
import { Navigate } from "react-router-dom";

export const RegisterPage: React.FC = () => {
  return <Navigate to="/events" replace />;
};

export default RegisterPage;
