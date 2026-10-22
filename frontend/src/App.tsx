import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { EventWorkspacePage } from "./pages/EventWorkspacePage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Routes>
            {/* Landing & Event Setup Routes */}
            <Route path="/" element={<HomePage />} />

            {/* Direct Event Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/events" element={<DashboardPage />} />
              <Route path="/events/:eventId" element={<EventWorkspacePage />} />
            </Route>

            {/* Deprecated Auth Routes Redirect to Event Workspace */}
            <Route path="/login" element={<Navigate to="/events" replace />} />
            <Route path="/register" element={<Navigate to="/events" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
};

export default App;
