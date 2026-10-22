import React, { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Container,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EventIcon from "@mui/icons-material/Event";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "../context/AuthContext";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/events");
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "none",
      }}
      component="header"
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 1 }}>
          {/* Brand Logo & Title */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              color: "inherit",
              "&:hover": { opacity: 0.9 },
            }}
            aria-label="EventWise AI Home"
          >
            <Avatar
              sx={{
                bgcolor: "primary.main",
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              }}
            >
              <AutoAwesomeIcon sx={{ color: "#ffffff", fontSize: 22 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 800,
                  fontFamily: "'Outfit', sans-serif",
                  background: "linear-gradient(90deg, #818cf8 0%, #f472b6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  display: "block",
                  lineHeight: 1.2,
                }}
              >
                EventWise AI
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                GenAI Planning Platform
              </Typography>
            </Box>
          </Box>

          {/* Navigation Actions */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              component={RouterLink}
              to="/events"
              startIcon={<EventIcon />}
              sx={{ color: "text.primary", fontWeight: 500 }}
              aria-label="View My Events"
            >
              My Events
            </Button>
            <Button
              component={RouterLink}
              to="/events"
              variant="contained"
              color="primary"
              startIcon={<AutoAwesomeIcon />}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                fontWeight: 600,
              }}
              aria-label="Create New Event"
            >
              Workspace
            </Button>

            {/* User Menu */}
            <Box sx={{ ml: 1 }}>
              <IconButton
                onClick={handleMenuOpen}
                aria-label="User account menu"
                aria-controls="user-menu"
                aria-haspopup="true"
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "secondary.dark",
                    fontSize: "0.95rem",
                  }}
                >
                  {user?.full_name ? user.full_name[0].toUpperCase() : "P"}
                </Avatar>
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    backgroundColor: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {user?.full_name || "Event Planner"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {user?.email || "planner@eventwise.ai"}
                  </Typography>
                </Box>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/events");
                  }}
                  sx={{ gap: 1.5, py: 1.2 }}
                >
                  <EventIcon fontSize="small" />
                  Event Workspace
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.2, color: "text.secondary" }}>
                  <LogoutIcon fontSize="small" />
                  Reset Session
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
