import React from "react";
import { Outlet } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
        role="status"
        aria-label="Loading workspace"
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return <Outlet />;
};

