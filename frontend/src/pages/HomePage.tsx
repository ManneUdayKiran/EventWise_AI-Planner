import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Stack,
  Chip,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ChatIcon from "@mui/icons-material/Chat";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CakeIcon from "@mui/icons-material/Cake";
import GroupsIcon from "@mui/icons-material/Groups";

export const HomePage: React.FC = () => {


  return (
    <Box sx={{ py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: "center", mb: { xs: 8, md: 12 } }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "16px !important" }} />}
            label="GenAI-Powered Event Management"
            color="primary"
            variant="outlined"
            sx={{
              px: 1.5,
              py: 2.2,
              borderRadius: 1.5,
              borderColor: "primary.light",
              color: "primary.light",
              fontWeight: 600,
              mb: 3,
            }}
          />
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.5rem", sm: "3.75rem", md: "4.5rem" },
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 3,
            }}
          >
            Plan Extraordinary Events with{" "}
            <Box
              component="span"
              sx={{
                background: "linear-gradient(135deg, #818cf8 0%, #f472b6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Intelligent Precision
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              maxWidth: 750,
              mx: "auto",
              mb: 4,
              fontWeight: 400,
              lineHeight: 1.6,
            }}
          >
            A stateful, AI-powered planner designed for Weddings, Birthdays, and Community
            gatherings. Automate category budgets, dynamic timelines, vendor checklists, and
            targeted plan modifications.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 6 }}
          >
            <Button
              component={RouterLink}
              to="/events"
              variant="contained"
              size="large"
              startIcon={<CelebrationIcon />}
              sx={{
                px: 4,
                py: 1.6,
                fontSize: "1.05rem",
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
                boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
              }}
            >
              Start Planning Events
            </Button>
            <Button
              component={RouterLink}
              to="/events"
              variant="outlined"
              size="large"
              startIcon={<AutoAwesomeIcon />}
              sx={{
                px: 4,
                py: 1.6,
                fontSize: "1.05rem",
                borderColor: "rgba(255, 255, 255, 0.25)",
                color: "text.primary",
                "&:hover": {
                  borderColor: "primary.light",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                },
              }}
            >
              Explore Event Setup
            </Button>
          </Stack>

          {/* Event Types Supported */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", p: 1 }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(236, 72, 153, 0.15)",
                      color: "#f472b6",
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <CelebrationIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                    Dream Weddings
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Catering per guest, venue contracts, floral decor, candid photography, and
                    detailed milestone schedules.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", p: 1 }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(99, 102, 241, 0.15)",
                      color: "#818cf8",
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <CakeIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                    Memorable Birthdays
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Themed decorations, DJ entertainment, invitations, personalized cake ideas,
                    and budget tracking.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card sx={{ height: "100%", p: 1 }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(16, 185, 129, 0.15)",
                      color: "#34d399",
                      width: 56,
                      height: 56,
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <GroupsIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
                    Community Gatherings
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Logistics, stage equipment rental, volunteer team tasks, security permits, and
                    cost sharing.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Feature Highlights */}
        <Box sx={{ mt: 10 }}>
          <Typography
            variant="h3"
            sx={{ textAlign: "center", mb: 6, fontWeight: 700 }}
          >
            End-to-End Event Management Modules
          </Typography>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <AccountBalanceWalletIcon sx={{ color: "primary.light", fontSize: 36, mb: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Budget Manager
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Deterministic calculation of estimated vs actual expenses, remaining budget,
                    cost per guest, and real-time overspending alerts.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <CalendarMonthIcon sx={{ color: "secondary.light", fontSize: 36, mb: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Timeline & Tasks
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Automated milestone generation, priority levels, overdue alerts, and
                    rescheduling that preserves completed progress.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <FactCheckIcon sx={{ color: "success.light", fontSize: 36, mb: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Vendor Checklist
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    8 vendor categories, quotation recordings, booking statuses, payment logs,
                    and user-entered quote comparison.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <ChatIcon sx={{ color: "warning.light", fontSize: 36, mb: 1.5 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    AI Plan Assistant
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Ask natural-language changes ("Reduce decoration budget by ₹10,000") with
                    confirmation gates and delta preview.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};
