import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  LinearProgress,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Tabs,
  Tab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CakeIcon from "@mui/icons-material/Cake";
import GroupsIcon from "@mui/icons-material/Groups";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BusinessIcon from "@mui/icons-material/Business";
import FavoriteIcon from "@mui/icons-material/Favorite";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import LocalBarIcon from "@mui/icons-material/LocalBar";
import CodeIcon from "@mui/icons-material/Code";
import CategoryIcon from "@mui/icons-material/Category";

import { eventService, CreateEventPayload, UpdateEventPayload } from "../services/eventService";
import { Event, EventType, EventStatus } from "../types";
import { useAuth } from "../context/AuthContext";

const PRESET_EVENT_TYPES = [
  { id: "wedding", label: "Wedding", Icon: CelebrationIcon, color: "#ec4899" },
  { id: "birthday", label: "Birthday", Icon: CakeIcon, color: "#f59e0b" },
  { id: "community", label: "Community", Icon: GroupsIcon, color: "#10b981" },
  { id: "corporate", label: "Corporate", Icon: BusinessIcon, color: "#38bdf8" },
  { id: "anniversary", label: "Anniversary", Icon: FavoriteIcon, color: "#f43f5e" },
  { id: "concert", label: "Concert / Music", Icon: MusicNoteIcon, color: "#8b5cf6" },
  { id: "party", label: "Party", Icon: LocalBarIcon, color: "#fbbf24" },
  { id: "hackathon", label: "Hackathon", Icon: CodeIcon, color: "#06b6d4" },
  { id: "custom", label: "Custom / Other", Icon: CategoryIcon, color: "#a855f7" },
];


export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Create Modal State
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCustomType, setIsCustomType] = useState<boolean>(false);
  const [customTypeName, setCustomTypeName] = useState<string>("");

  const [formData, setFormData] = useState<CreateEventPayload>({
    name: "",
    event_type: "wedding",
    event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    location: "",
    expected_guest_count: 100,
    total_budget: 10000,
    currency: "USD",
    theme: "",
    preferences: "",
    special_requirements: "",
  });

  // Edit Modal State
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateEventPayload>({});

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Load events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        ev.name.toLowerCase().includes(query) ||
        ev.location.toLowerCase().includes(query) ||
        ev.event_type.toLowerCase().includes(query);

      const cleanType = (ev.event_type || "").toLowerCase();
      let matchesType = true;
      if (selectedType === "all") {
        matchesType = true;
      } else if (selectedType === "wedding") {
        matchesType = cleanType === "wedding";
      } else if (selectedType === "birthday") {
        matchesType = cleanType === "birthday";
      } else if (selectedType === "community") {
        matchesType = cleanType === "community";
      } else if (selectedType === "corporate") {
        matchesType = cleanType.includes("corp") || cleanType.includes("conf");
      } else if (selectedType === "other") {
        matchesType =
          !["wedding", "birthday", "community"].includes(cleanType) && !cleanType.includes("corp");
      }
      return matchesSearch && matchesType;
    });
  }, [events, searchQuery, selectedType]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalEvents = events.length;
    const totalBudget = events.reduce((sum, e) => sum + (e.total_budget || 0), 0);
    const totalGuests = events.reduce((sum, e) => sum + (e.expected_guest_count || 0), 0);
    const totalTasks = events.reduce((sum, e) => sum + (e.stats?.total_tasks || 0), 0);
    const completedTasks = events.reduce((sum, e) => sum + (e.stats?.completed_tasks || 0), 0);
    return { totalEvents, totalBudget, totalGuests, totalTasks, completedTasks };
  }, [events]);

  // Handle Event Creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const effectiveType = isCustomType ? customTypeName.trim() : formData.event_type;
    if (isCustomType && !effectiveType) {
      setFormError("Please enter a name for your custom event type.");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Event name is required.");
      return;
    }
    if (!formData.location.trim()) {
      setFormError("Location is required.");
      return;
    }
    if (formData.expected_guest_count < 1) {
      setFormError("Guest count must be at least 1.");
      return;
    }
    if (formData.total_budget < 0) {
      setFormError("Budget cannot be negative.");
      return;
    }

    try {
      setSubmitting(true);
      const formattedDate = new Date(formData.event_date).toISOString();
      const newEvent = await eventService.createEvent({
        ...formData,
        event_type: effectiveType,
        event_date: formattedDate,
      });
      setEvents((prev) => [newEvent, ...prev]);
      setCreateOpen(false);
      // Reset form
      setFormData({
        name: "",
        event_type: "wedding",
        event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        location: "",
        expected_guest_count: 100,
        total_budget: 10000,
        currency: "USD",
        theme: "",
        preferences: "",
        special_requirements: "",
      });
      setIsCustomType(false);
      setCustomTypeName("");
      // Navigate straight to workspace
      navigate(`/events/${newEvent.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setFormError(e.response?.data?.detail || "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (ev: Event) => {
    setEditingEventId(ev.id);
    setEditFormData({
      name: ev.name,
      event_type: ev.event_type,
      event_date: new Date(ev.event_date).toISOString().slice(0, 16),
      location: ev.location,
      expected_guest_count: ev.expected_guest_count,
      total_budget: ev.total_budget,
      currency: ev.currency,
      theme: ev.theme || "",
      preferences: ev.preferences || "",
      special_requirements: ev.special_requirements || "",
      status: ev.status,
    });
    setEditOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId) return;

    try {
      setSubmitting(true);
      const payload: UpdateEventPayload = {
        ...editFormData,
      };
      if (editFormData.event_date) {
        payload.event_date = new Date(editFormData.event_date).toISOString();
      }
      const updated = await eventService.updateEvent(editingEventId, payload);
      setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditOpen(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setFormError(e.response?.data?.detail || "Failed to update event.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setDeleting(true);
      await eventService.deleteEvent(eventToDelete.id);
      setEvents((prev) => prev.filter((item) => item.id !== eventToDelete.id));
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const getEventTypeMeta = (type: string) => {
    const cleanType = (type || "").toLowerCase().trim();
    if (cleanType === "wedding") {
      return {
        label: "Wedding",
        icon: <CelebrationIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
        color: "#ec4899",
      };
    }
    if (cleanType === "birthday") {
      return {
        label: "Birthday",
        icon: <CakeIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
        color: "#f59e0b",
      };
    }
    if (cleanType === "community") {
      return {
        label: "Community Event",
        icon: <GroupsIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
        color: "#10b981",
      };
    }
    if (cleanType.includes("corp") || cleanType.includes("conf") || cleanType.includes("business")) {
      return {
        label: type || "Corporate",
        icon: <BusinessIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
        color: "#38bdf8",
      };
    }
    if (cleanType.includes("anniversary")) {
      return {
        label: type || "Anniversary",
        icon: <FavoriteIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #e11d48 0%, #fb7185 100%)",
        color: "#f43f5e",
      };
    }
    if (cleanType.includes("concert") || cleanType.includes("music") || cleanType.includes("fest")) {
      return {
        label: type || "Concert",
        icon: <MusicNoteIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)",
        color: "#8b5cf6",
      };
    }
    if (cleanType.includes("party") || cleanType.includes("drink") || cleanType.includes("cocktail")) {
      return {
        label: type || "Party",
        icon: <LocalBarIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #d97706 0%, #fde047 100%)",
        color: "#fbbf24",
      };
    }
    if (cleanType.includes("hack") || cleanType.includes("code") || cleanType.includes("tech")) {
      return {
        label: type || "Hackathon",
        icon: <CodeIcon sx={{ fontSize: 16 }} />,
        gradient: "linear-gradient(135deg, #0891b2 0%, #67e8f9 100%)",
        color: "#06b6d4",
      };
    }
    const formatted = type
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : "Custom Event";
    return {
      label: formatted,
      icon: <CategoryIcon sx={{ fontSize: 16 }} />,
      gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
      color: "#818cf8",
    };
  };

  const getDaysCountdown = (dateString: string) => {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d ago`, isPast: true };
    if (diffDays === 0) return { text: "Today!", isPast: false };
    return { text: `In ${diffDays} days`, isPast: false };
  };

  return (
    <Box sx={{ py: 4, minHeight: "90vh", bgcolor: "background.default" }}>
      <Container maxWidth="xl">
        {/* Top Header Banner */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 4,
            borderRadius: 2,
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 3,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontFamily: "'Outfit', sans-serif",
                  background: "linear-gradient(90deg, #f8fafc 0%, #cbd5e1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Welcome back, {user?.full_name?.split(" ")[0] || "Planner"}
              </Typography>
              <Chip
                label="GenAI Workspace"
                size="small"
                icon={<AutoAwesomeIcon sx={{ fontSize: "14px !important", color: "#f472b6 !important" }} />}
                sx={{
                  bgcolor: "rgba(236, 72, 153, 0.15)",
                  color: "#f472b6",
                  border: "1px solid rgba(236, 72, 153, 0.3)",
                  fontWeight: 600,
                }}
              />
            </Box>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Coordinate budgets, timelines, vendors, and AI-driven planning across your events.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              color: "#ffffff",
              fontWeight: 700,
              px: 3,
              py: 1.2,
              borderRadius: 1.5,
              boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #4f46e5 0%, #db2777 100%)",
              },
            }}
          >
            Create New Event
          </Button>
        </Paper>

        {/* Global Aggregate Metrics */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    TOTAL EVENTS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "text.primary" }}>
                    {aggregateStats.totalEvents}
                  </Typography>
                </Box>
                <CelebrationIcon sx={{ color: "#818cf8", fontSize: 36, opacity: 0.8 }} />
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    TOTAL BUDGET MANAGED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#10b981" }}>
                    ${aggregateStats.totalBudget.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoneyIcon sx={{ color: "#10b981", fontSize: 36, opacity: 0.8 }} />
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    EXPECTED GUESTS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#f59e0b" }}>
                    {aggregateStats.totalGuests.toLocaleString()}
                  </Typography>
                </Box>
                <PeopleIcon sx={{ color: "#f59e0b", fontSize: 36, opacity: 0.8 }} />
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card
              sx={{
                p: 2.5,
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    TASKS COMPLETED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#ec4899" }}>
                    {aggregateStats.completedTasks} / {aggregateStats.totalTasks}
                  </Typography>
                </Box>
                <CheckCircleOutlineIcon sx={{ color: "#ec4899", fontSize: 36, opacity: 0.8 }} />
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Filter and Search Controls */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            mb: 4,
          }}
        >
          <Tabs
            value={selectedType}
            onChange={(_, val) => setSelectedType(val)}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1.5,
              p: 0.5,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              "& .MuiTab-root": {
                minHeight: 40,
                borderRadius: 1,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "0.9rem",
              },
            }}
          >
            <Tab value="all" label="All Events" />
            <Tab value="wedding" label="Weddings" />
            <Tab value="birthday" label="Birthdays" />
            <Tab value="community" label="Community" />
            <Tab value="corporate" label="Corporate" />
            <Tab value="other" label="Custom / Other" />
          </Tabs>

          <TextField
            placeholder="Search events by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              minWidth: { xs: "100%", md: 320 },
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper",
                borderRadius: 1.5,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Error banner if any */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : filteredEvents.length === 0 ? (
          /* Empty State */
          <Paper
            elevation={0}
            sx={{
              py: 8,
              px: 4,
              textAlign: "center",
              borderRadius: 2,
              bgcolor: "background.paper",
              border: "1px dashed rgba(255, 255, 255, 0.15)",
            }}
          >
            <CelebrationIcon sx={{ fontSize: 64, color: "text.secondary", opacity: 0.5, mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, fontFamily: "'Outfit', sans-serif" }}>
              {searchQuery || selectedType !== "all" ? "No matching events found" : "No events created yet"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 450, mx: "auto", mb: 3 }}>
              {searchQuery || selectedType !== "all"
                ? "Try adjusting your search criteria or filter to locate what you are looking for."
                : "Get started by planning your first Wedding, Birthday celebration, or Community event."}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 600,
                px: 3,
              }}
            >
              Create New Event
            </Button>
          </Paper>
        ) : (
          /* Event Cards Grid */
          <Grid container spacing={3}>
            {filteredEvents.map((ev) => {
              const meta = getEventTypeMeta(ev.event_type);
              const countdown = getDaysCountdown(ev.event_date);
              const budgetSpent = ev.stats?.budget_spent || 0;
              const totalBudget = ev.total_budget || 1;
              const budgetUtilization = Math.min(Math.round((budgetSpent / totalBudget) * 100), 100);
              const isOverspent = budgetSpent > totalBudget;
              const taskProgress = ev.stats?.task_progress_percentage || 0;

              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={ev.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 2,
                      bgcolor: "background.paper",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      transition: "all 0.25s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 28px rgba(0, 0, 0, 0.35)",
                        borderColor: meta.color,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      {/* Top Chips */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Chip
                          icon={meta.icon}
                          label={meta.label}
                          size="small"
                          sx={{
                            background: meta.gradient,
                            color: "#ffffff",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            "& .MuiChip-icon": { color: "#ffffff" },
                          }}
                        />
                        <Chip
                          label={countdown.text}
                          size="small"
                          sx={{
                            bgcolor: countdown.isPast ? "rgba(148, 163, 184, 0.15)" : "rgba(16, 185, 129, 0.15)",
                            color: countdown.isPast ? "text.secondary" : "#10b981",
                            fontWeight: 600,
                            border: `1px solid ${
                              countdown.isPast ? "rgba(148, 163, 184, 0.3)" : "rgba(16, 185, 129, 0.3)"
                            }`,
                          }}
                        />
                      </Box>

                      {/* Event Title */}
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          fontWeight: 700,
                          fontFamily: "'Outfit', sans-serif",
                          mb: 1.5,
                          lineHeight: 1.25,
                        }}
                      >
                        {ev.name}
                      </Typography>

                      {/* Metadata Items */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                          <CalendarMonthIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            {new Date(ev.event_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                          <PlaceIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2" noWrap sx={{ maxWidth: "80%" }}>
                            {ev.location}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                          <PeopleIcon sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            {ev.expected_guest_count} Expected Guests
                          </Typography>
                        </Box>
                      </Box>

                      {/* Budget Utilization Meter */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            Budget Spent: ${budgetSpent.toLocaleString()} / ${ev.total_budget.toLocaleString()}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: isOverspent ? "error.main" : "text.primary",
                            }}
                          >
                            {budgetUtilization}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={budgetUtilization}
                          color={isOverspent ? "error" : "primary"}
                          sx={{ height: 6, borderRadius: 1, bgcolor: "rgba(255, 255, 255, 0.08)" }}
                        />
                      </Box>

                      {/* Task Completion Meter */}
                      <Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            Tasks: {ev.stats?.completed_tasks || 0} / {ev.stats?.total_tasks || 0} completed
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {Math.round(taskProgress)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={taskProgress}
                          color="success"
                          sx={{ height: 6, borderRadius: 1, bgcolor: "rgba(255, 255, 255, 0.08)" }}
                        />
                      </Box>
                    </CardContent>

                    {/* Card Actions */}
                    <CardActions
                      sx={{
                        p: 2,
                        pt: 0,
                        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Tooltip title="Edit Event Details">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(ev)}
                            sx={{ color: "text.secondary", "&:hover": { color: "primary.light" } }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Event">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEventToDelete(ev);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Button
                        variant="contained"
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate(`/events/${ev.id}`)}
                        sx={{
                          bgcolor: "rgba(99, 102, 241, 0.15)",
                          color: "#818cf8",
                          fontWeight: 700,
                          "&:hover": {
                            bgcolor: "primary.main",
                            color: "#ffffff",
                          },
                        }}
                      >
                        Open Planner
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* CREATE EVENT MODAL */}
      <Dialog
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1e293b",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <form onSubmit={handleCreateSubmit}>
          <DialogTitle component="div" sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
              Create New Event
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Fill in your event details. You can customize budgets, timelines, and ask the AI planner inside.
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <Grid container spacing={2.5}>
              {/* Event Type Selection */}
              <Grid size={12}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Select Event Type
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Choose a preset or enter any custom celebration
                  </Typography>
                </Box>
                <Grid container spacing={1.5}>
                  {PRESET_EVENT_TYPES.map((type) => {
                    const isSelected = isCustomType
                      ? type.id === "custom"
                      : formData.event_type === type.id;
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 2.66 }} key={type.id}>
                        <Paper
                          onClick={() => {
                            if (type.id === "custom") {
                              setIsCustomType(true);
                              if (customTypeName) {
                                setFormData({ ...formData, event_type: customTypeName });
                              }
                            } else {
                              setIsCustomType(false);
                              setFormData({ ...formData, event_type: type.id });
                            }
                          }}
                          sx={{
                            p: 1.5,
                            textAlign: "center",
                            cursor: "pointer",
                            borderRadius: 1.5,
                            border: `2px solid ${isSelected ? type.color : "rgba(255, 255, 255, 0.08)"}`,
                            bgcolor: isSelected ? "rgba(99, 102, 241, 0.12)" : "background.paper",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              borderColor: type.color,
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          <Box sx={{ color: type.color, mb: 0.5, display: "flex", justifyContent: "center" }}>
                            <type.Icon sx={{ fontSize: 20 }} />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                            {type.label}
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                {isCustomType && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Specify Your Custom Event Type"
                      required
                      autoFocus
                      placeholder="e.g. Charity Gala, Baby Shower, Product Launch, Farewell Dinner, Hackathon..."
                      value={customTypeName}
                      onChange={(e) => {
                        setCustomTypeName(e.target.value);
                        setFormData({ ...formData, event_type: e.target.value });
                      }}
                      helperText="You can specify any custom event type. Our AI Assistant and blueprint generator will customize the plan accordingly."
                    />
                  </Box>
                )}
              </Grid>

              {/* Event Title */}
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Event Name / Title"
                  required
                  placeholder="e.g. Sarah & Michael's Wedding Celebration"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Grid>

              {/* Event Date & Time */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Event Date & Time"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Location */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Location / Venue"
                  required
                  placeholder="e.g. Sunset Grand Ballroom, Seattle"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Grid>

              {/* Guest Count */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Expected Guest Count"
                  required
                  value={formData.expected_guest_count}
                  onChange={(e) =>
                    setFormData({ ...formData, expected_guest_count: parseInt(e.target.value) || 0 })
                  }
                  inputProps={{ min: 1 }}
                />
              </Grid>

              {/* Total Budget */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Budget (USD)"
                  required
                  value={formData.total_budget}
                  onChange={(e) =>
                    setFormData({ ...formData, total_budget: parseFloat(e.target.value) || 0 })
                  }
                  inputProps={{ min: 0, step: 100 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              {/* Theme & Style */}
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Theme or Styling (Optional)"
                  placeholder="e.g. Modern Rustic, Bohemian Chic, Cyberpunk Glow"
                  value={formData.theme}
                  onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                />
              </Grid>

              {/* Preferences */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Specific Preferences"
                  placeholder="e.g. Live jazz quartet, farm-to-table vegetarian options"
                  value={formData.preferences}
                  onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                />
              </Grid>

              {/* Special Requirements */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Special Requirements & Accessibility"
                  placeholder="e.g. Wheelchair ramp, nut allergy, outdoor rain contingency"
                  value={formData.special_requirements}
                  onChange={(e) => setFormData({ ...formData, special_requirements: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={submitting} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
                px: 3,
              }}
            >
              {submitting ? "Creating Event..." : "Create Event & Open Workspace"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EDIT EVENT MODAL */}
      <Dialog
        open={editOpen}
        onClose={() => !submitting && setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1e293b",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <form onSubmit={handleEditSubmit}>
          <DialogTitle component="div" sx={{ pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
              Edit Event Details
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2.5}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Event Name / Title"
                  required
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Event Type / Category"
                  required
                  placeholder="e.g. Wedding, Birthday, Corporate, Hackathon, Charity Gala..."
                  value={editFormData.event_type || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, event_type: e.target.value })}
                  helperText="Customize the category to whatever event type you are organizing"
                />
              </Grid>


              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Event Date & Time"
                  value={editFormData.event_date || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, event_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Location"
                  value={editFormData.location || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Expected Guest Count"
                  value={editFormData.expected_guest_count || 0}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, expected_guest_count: parseInt(e.target.value) || 0 })
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Budget (USD)"
                  value={editFormData.total_budget || 0}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, total_budget: parseFloat(e.target.value) || 0 })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Planning Status"
                  value={editFormData.status || "planning"}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value as EventStatus })
                  }
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="planning">In Planning</MenuItem>
                  <MenuItem value="ready">Ready</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Theme"
                  value={editFormData.theme || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, theme: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setEditOpen(false)} disabled={submitting} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
                px: 3,
              }}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: "#1e293b",
            borderRadius: 2,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "error.main" }}>
          Delete Event: {eventToDelete?.name}?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            This action is permanent and cannot be undone. All associated budget items, tasks, and vendor checklists will be deleted immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            sx={{ fontWeight: 700 }}
          >
            {deleting ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default DashboardPage;
