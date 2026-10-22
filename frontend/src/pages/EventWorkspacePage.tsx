import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Link,
  Select,
  FormControl,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PlaceIcon from "@mui/icons-material/Place";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import UpdateIcon from "@mui/icons-material/Update";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SmartToyIcon from "@mui/icons-material/SmartToy";

import { AIPlanModal } from "../components/AIPlanModal";
import { AssistantDrawer } from "../components/AssistantDrawer";

import {
  eventService,
  CreateBudgetItemPayload,
  CreateTaskPayload,
  CreateVendorPayload,
  TaskListResponse,
  VendorListResponse,
} from "../services/eventService";
import {
  Event,
  BudgetSummary,
  Task,
  BudgetCategory,
  TaskPriority,
  TaskStatus,
  VendorCategory,
  BookingStatus,
} from "../types";

const BUDGET_CATEGORIES: { value: BudgetCategory; label: string }[] = [
  { value: "venue", label: "Venue & Location" },
  { value: "catering", label: "Catering & Bar" },
  { value: "photography", label: "Photography & Video" },
  { value: "decoration", label: "Decor & Flowers" },
  { value: "entertainment", label: "Music & Entertainment" },
  { value: "invitations", label: "Invitations & Stationery" },
  { value: "transportation", label: "Transportation" },
  { value: "equipment_rental", label: "Equipment Rental" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "photography", label: "Photography" },
  { value: "decoration", label: "Decoration" },
  { value: "entertainment", label: "Entertainment" },
  { value: "invitations", label: "Invitations" },
  { value: "transportation", label: "Transportation" },
  { value: "equipment_rental", label: "Equipment Rental" },
];

export const EventWorkspacePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<number>(0);

  // Core Data States
  const [event, setEvent] = useState<Event | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [taskData, setTaskData] = useState<TaskListResponse | null>(null);
  const [vendorData, setVendorData] = useState<VendorListResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [addBudgetOpen, setAddBudgetOpen] = useState<boolean>(false);
  const [budgetFormData, setBudgetFormData] = useState<CreateBudgetItemPayload>({
    category: "venue",
    item_name: "",
    estimated_amount: 0,
    actual_amount: 0,
    status: "planned",
    notes: "",
  });

  const [addTaskOpen, setAddTaskOpen] = useState<boolean>(false);
  const [taskFormData, setTaskFormData] = useState<CreateTaskPayload>({
    title: "",
    description: "",
    category: "General",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    priority: "medium",
    dependencies: [],
  });

  const [addVendorOpen, setAddVendorOpen] = useState<boolean>(false);
  const [vendorFormData, setVendorFormData] = useState<CreateVendorPayload>({
    category: "venue",
    item_name: "",
    quotation_amount: 0,
    booking_status: "not_started",
    payment_status: "unpaid",
    contact_info: "",
    notes: "",
  });

  const [rescheduleOpen, setRescheduleOpen] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>("");
  const [preserveCompleted, setPreserveCompleted] = useState<boolean>(true);
  const [aiPlanOpen, setAiPlanOpen] = useState<boolean>(false);
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);

  // Load all event data
  const loadEventData = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setPageError(null);
      const [ev, budget, tasks, vendors] = await Promise.all([
        eventService.getEvent(eventId),
        eventService.getBudgetSummary(eventId),
        eventService.getTasks(eventId),
        eventService.getVendors(eventId),
      ]);
      setEvent(ev);
      setBudgetSummary(budget);
      setTaskData(tasks);
      setVendorData(vendors);
      setRescheduleDate(new Date(ev.event_date).toISOString().slice(0, 16));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to load event workspace.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Handle Budget Item Submit
  const handleAddBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !budgetFormData.item_name.trim()) return;
    try {
      await eventService.addBudgetItem(eventId, budgetFormData);
      const updatedBudget = await eventService.getBudgetSummary(eventId);
      setBudgetSummary(updatedBudget);
      setAddBudgetOpen(false);
      setBudgetFormData({
        category: "venue",
        item_name: "",
        estimated_amount: 0,
        actual_amount: 0,
        status: "planned",
        notes: "",
      });
      setActionSuccess("Budget item added successfully.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to add budget item.");
    }
  };

  // Handle Budget Item Delete
  const handleDeleteBudgetItem = async (itemId: string) => {
    if (!eventId) return;
    try {
      await eventService.deleteBudgetItem(eventId, itemId);
      const updatedBudget = await eventService.getBudgetSummary(eventId);
      setBudgetSummary(updatedBudget);
      setActionSuccess("Budget item removed.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to delete budget item.");
    }
  };

  // Handle Quick Actual Expense Update
  const handleUpdateActualAmount = async (itemId: string, newAmount: number) => {
    if (!eventId) return;
    try {
      await eventService.updateBudgetItem(eventId, itemId, { actual_amount: newAmount });
      const updatedBudget = await eventService.getBudgetSummary(eventId);
      setBudgetSummary(updatedBudget);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to update actual expense.");
    }
  };

  // Handle Task Submit
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !taskFormData.title.trim()) return;
    try {
      const formattedDate = new Date(taskFormData.due_date).toISOString();
      await eventService.createTask(eventId, {
        ...taskFormData,
        due_date: formattedDate,
      });
      const updatedTasks = await eventService.getTasks(eventId);
      setTaskData(updatedTasks);
      setAddTaskOpen(false);
      setTaskFormData({
        title: "",
        description: "",
        category: "General",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        priority: "medium",
        dependencies: [],
      });
      setActionSuccess("Task created successfully.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to create task.");
    }
  };

  // Handle Task Toggle Status
  const handleToggleTaskStatus = async (task: Task) => {
    if (!eventId) return;
    const nextStatus: TaskStatus = task.status === "completed" ? "pending" : "completed";
    try {
      await eventService.updateTask(eventId, task.id, { status: nextStatus });
      const updatedTasks = await eventService.getTasks(eventId);
      setTaskData(updatedTasks);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to update task status.");
    }
  };

  // Handle Task Delete
  const handleDeleteTask = async (taskId: string) => {
    if (!eventId) return;
    try {
      await eventService.deleteTask(eventId, taskId);
      const updatedTasks = await eventService.getTasks(eventId);
      setTaskData(updatedTasks);
      setActionSuccess("Task deleted.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to delete task.");
    }
  };

  // Handle Timeline Reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !rescheduleDate) return;
    try {
      const updated = await eventService.rescheduleTimeline(
        eventId,
        new Date(rescheduleDate).toISOString(),
        preserveCompleted
      );
      setTaskData(updated);
      setRescheduleOpen(false);
      setActionSuccess("Timeline rescheduled successfully, completed tasks preserved!");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to reschedule timeline.");
    }
  };

  // Handle Vendor Submit
  const handleAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !vendorFormData.item_name.trim()) return;
    try {
      await eventService.addVendor(eventId, vendorFormData);
      const updatedVendors = await eventService.getVendors(eventId);
      setVendorData(updatedVendors);
      setAddVendorOpen(false);
      setVendorFormData({
        category: "venue",
        item_name: "",
        quotation_amount: 0,
        booking_status: "not_started",
        payment_status: "unpaid",
        contact_info: "",
        notes: "",
      });
      setActionSuccess("Vendor requirement added.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to add vendor.");
    }
  };

  // Handle Vendor Status Updates
  const handleUpdateVendorStatus = async (
    vendorId: string,
    field: "booking_status" | "payment_status",
    value: string
  ) => {
    if (!eventId) return;
    try {
      await eventService.updateVendor(eventId, vendorId, { [field]: value });
      const updatedVendors = await eventService.getVendors(eventId);
      setVendorData(updatedVendors);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to update vendor status.");
    }
  };

  // Handle Vendor Delete
  const handleDeleteVendor = async (vendorId: string) => {
    if (!eventId) return;
    try {
      await eventService.deleteVendor(eventId, vendorId);
      const updatedVendors = await eventService.getVendors(eventId);
      setVendorData(updatedVendors);
      setActionSuccess("Vendor item deleted.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPageError(e.response?.data?.detail || "Failed to delete vendor.");
    }
  };

  // Calculations & Helpers
  const countdown = useMemo(() => {
    if (!event) return { days: 0, hours: 0, text: "" };
    const target = new Date(event.event_date).getTime();
    const diff = target - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (diff < 0) return { days: Math.abs(days), hours: Math.abs(hours), text: "Event Completed" };
    return { days, hours, text: `${days}d ${hours}h until event` };
  }, [event]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (pageError && !event) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {pageError}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate("/events")}>
          Back to Events Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 3, minHeight: "90vh", bgcolor: "background.default" }}>
      <Container maxWidth="xl">
        {/* Navigation Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2, color: "text.secondary", fontSize: "0.85rem" }}>
          <Link component={RouterLink} to="/events" underline="hover" color="inherit">
            Dashboard
          </Link>
          <Typography color="text.primary" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {event?.name}
          </Typography>
        </Breadcrumbs>

        {/* Global Notifications */}
        {actionSuccess && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            {actionSuccess}
          </Alert>
        )}
        {pageError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }} onClose={() => setPageError(null)}>
            {pageError}
          </Alert>
        )}

        {/* Top Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            mb: 3,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2.5,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                {event?.name}
              </Typography>
              <Chip
                label={event?.event_type ? event.event_type.replace(/_/g, " ").toUpperCase() : "EVENT"}
                size="small"
                sx={{
                  bgcolor: "rgba(99, 102, 241, 0.15)",
                  color: "#818cf8",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              />
              <Chip
                label={countdown.text}
                size="small"
                sx={{
                  bgcolor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 3, color: "text.secondary", flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <CalendarMonthIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">
                  {new Date(event?.event_date || "").toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <PlaceIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">{event?.location}</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <PeopleIcon sx={{ fontSize: 18 }} />
                <Typography variant="body2">{event?.expected_guest_count} Guests</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<SmartToyIcon />}
              onClick={() => setAssistantOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(236, 72, 153, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #db2777 0%, #7c3aed 100%)",
                },
              }}
            >
              AI Copilot
            </Button>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => setAiPlanOpen(true)}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
                },
              }}
            >
              Generate AI Plan
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/events")}
              sx={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "text.primary" }}
            >
              All Events
            </Button>
          </Box>
        </Paper>

        {/* Tab Navigation */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 1.5,
            bgcolor: "background.paper",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              "& .MuiTab-root": {
                minHeight: 48,
                fontWeight: 600,
                fontSize: "0.95rem",
                textTransform: "none",
                px: 3,
              },
            }}
          >
            <Tab label="Event Overview" />
            <Tab
              label={`Budget Manager ($${budgetSummary?.total_actual?.toLocaleString() || 0} / $${event?.total_budget?.toLocaleString() || 0})`}
            />
            <Tab
              label={`Timeline & Tasks (${taskData?.completed || 0}/${taskData?.total || 0})`}
            />
            <Tab
              label={`Vendor Checklist (${vendorData?.booked_count || 0}/${vendorData?.total_count || 0} Booked)`}
            />
          </Tabs>
        </Paper>

        {/* ======================================================== */}
        {/* TAB 0: EVENT OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={3}>
              {/* Quick Glance Metrics */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 2.5, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    COUNTDOWN
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#818cf8" }}>
                    {countdown.days} Days
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {countdown.hours} hours remaining
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 2.5, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    REMAINING BUDGET
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 800,
                      mt: 0.5,
                      color: (budgetSummary?.remaining_budget || 0) < 0 ? "error.main" : "#10b981",
                    }}
                  >
                    ${budgetSummary?.remaining_budget?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Utilization: {budgetSummary?.utilization_percentage || 0}%
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 2.5, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    TASK PROGRESS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#ec4899" }}>
                    {taskData?.completion_percentage || 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {taskData?.completed || 0} of {taskData?.total || 0} completed
                  </Typography>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 2.5, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    VENDORS BOOKED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: "#f59e0b" }}>
                    {vendorData?.booked_count || 0} / {vendorData?.total_count || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    ${vendorData?.total_quotations?.toLocaleString() || 0} in quotes
                  </Typography>
                </Card>
              </Grid>

              {/* Event Concept & Preferences Card */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontFamily: "'Outfit', sans-serif" }}>
                    Event Concept & Styling
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      THEME / STYLE
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {event?.theme || "No theme specified yet."}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      PREFERENCES (MUSIC, CATERING, ETC.)
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {event?.preferences || "None recorded."}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      SPECIAL REQUIREMENTS & ACCESSIBILITY
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {event?.special_requirements || "None recorded."}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Quick Actions Shortcuts */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontFamily: "'Outfit', sans-serif" }}>
                    Quick Shortcuts
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesomeIcon />}
                      onClick={() => setAiPlanOpen(true)}
                      sx={{
                        background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                        justifyContent: "flex-start",
                        py: 1.2,
                        fontWeight: 700,
                      }}
                    >
                      Generate AI Blueprint & Ideas
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AttachMoneyIcon />}
                      onClick={() => setActiveTab(1)}
                      sx={{ justifyContent: "flex-start", py: 1.2, fontWeight: 600 }}
                    >
                      Manage Expenses (${budgetSummary?.total_actual?.toLocaleString()} spent)
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CheckCircleOutlineIcon />}
                      onClick={() => setActiveTab(2)}
                      sx={{ justifyContent: "flex-start", py: 1.2, fontWeight: 600 }}
                    >
                      View Timeline ({taskData?.overdue || 0} overdue tasks)
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<StorefrontIcon />}
                      onClick={() => setActiveTab(3)}
                      sx={{ justifyContent: "flex-start", py: 1.2, fontWeight: 600 }}
                    >
                      Vendor Checklist ({vendorData?.total_count || 0} requirements)
                    </Button>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 1: BUDGET MANAGER */}
        {/* ======================================================== */}
        {activeTab === 1 && (
          <Box>
            {/* Overspending Banner Alert */}
            {budgetSummary?.is_overspent && (
              <Alert
                severity="error"
                icon={<WarningAmberIcon fontSize="inherit" />}
                sx={{ mb: 3, borderRadius: 1.5 }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Budget Overrun Warning
                </Typography>
                Actual expenditures have exceeded your planned total budget by $
                {budgetSummary.overspent_amount.toLocaleString()}. Consider reallocating or negotiating vendor quotes.
              </Alert>
            )}

            {/* Financial Metrics Cards */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    TOTAL BUDGET
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                    ${budgetSummary?.total_budget?.toLocaleString() || 0}
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    TOTAL ESTIMATED
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: "#818cf8" }}>
                    ${budgetSummary?.total_estimated?.toLocaleString() || 0}
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    ACTUAL SPENT
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      mt: 0.5,
                      color: budgetSummary?.is_overspent ? "error.main" : "#f59e0b",
                    }}
                  >
                    ${budgetSummary?.total_actual?.toLocaleString() || 0}
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    REMAINING BALANCE
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      mt: 0.5,
                      color: (budgetSummary?.remaining_budget || 0) < 0 ? "error.main" : "#10b981",
                    }}
                  >
                    ${budgetSummary?.remaining_budget?.toLocaleString() || 0}
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.paper" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    COST PER GUEST
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: "#ec4899" }}>
                    ${budgetSummary?.cost_per_guest?.toFixed(2) || "0.00"}
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Expenses List & Add Item Header */}
            <Card sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Itemized Expenses
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Record estimated costs, actual spends, and track variances deterministically.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddBudgetOpen(true)}
                  sx={{
                    background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                    fontWeight: 700,
                  }}
                >
                  Add Expense Item
                </Button>
              </Box>

              {/* Items Table */}
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary" } }}>
                      <TableCell>Category</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell align="right">Estimated</TableCell>
                      <TableCell align="right">Actual Spent</TableCell>
                      <TableCell align="right">Variance</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!budgetSummary?.items || budgetSummary.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No expense items added yet. Click &quot;Add Expense Item&quot; to begin.
                        </TableCell>
                      </TableRow>
                    ) : (
                      budgetSummary.items.map((item) => {
                        const variance = item.actual_amount - item.estimated_amount;
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Chip
                                label={item.category.replace("_", " ").toUpperCase()}
                                size="small"
                                sx={{
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  bgcolor: "rgba(99, 102, 241, 0.12)",
                                  color: "#818cf8",
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{item.item_name}</TableCell>
                            <TableCell align="right">${item.estimated_amount.toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                size="small"
                                defaultValue={item.actual_amount}
                                onBlur={(e) =>
                                  handleUpdateActualAmount(item.id, parseFloat(e.target.value) || 0)
                                }
                                sx={{
                                  width: 110,
                                  "& .MuiOutlinedInput-input": { textAlign: "right", py: 0.5 },
                                }}
                                InputProps={{
                                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                              />
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: 700,
                                color: variance > 0 ? "error.main" : variance < 0 ? "success.main" : "text.secondary",
                              }}
                            >
                              {variance > 0 ? `+$${variance.toLocaleString()}` : `$${variance.toLocaleString()}`}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={item.status.toUpperCase()}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  bgcolor:
                                    item.status === "paid"
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : item.status === "committed"
                                      ? "rgba(245, 158, 11, 0.15)"
                                      : "rgba(148, 163, 184, 0.15)",
                                  color:
                                    item.status === "paid"
                                      ? "#10b981"
                                      : item.status === "committed"
                                      ? "#f59e0b"
                                      : "text.secondary",
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Delete budget item ${item.item_name}`}
                                onClick={() => handleDeleteBudgetItem(item.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TIMELINE & TASKS */}
        {/* ======================================================== */}
        {activeTab === 2 && (
          <Box>
            {/* Overdue alert */}
            {(taskData?.overdue || 0) > 0 && (
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {taskData?.overdue} Overdue Task(s)
                </Typography>
                You have planning tasks whose due dates have passed. Reschedule or mark them completed.
              </Alert>
            )}

            {/* Task Controls Header */}
            <Card sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Event Timeline & Checklist
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Track milestones, deadlines, and dependencies to stay on schedule.
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    startIcon={<UpdateIcon />}
                    onClick={() => setRescheduleOpen(true)}
                    sx={{ borderColor: "rgba(255, 255, 255, 0.15)", color: "text.primary" }}
                  >
                    Reschedule Timeline
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setAddTaskOpen(true)}
                    sx={{
                      background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                      fontWeight: 700,
                    }}
                  >
                    Add Task
                  </Button>
                </Box>
              </Box>

              {/* Task Items List */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {!taskData?.tasks || taskData.tasks.length === 0 ? (
                  <Typography variant="body2" sx={{ color: "text.secondary", py: 4, textAlign: "center" }}>
                    No planning tasks added yet. Click &quot;Add Task&quot; to begin building your timeline.
                  </Typography>
                ) : (
                  taskData.tasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    const isOverdue = task.is_overdue && !isCompleted;

                    return (
                      <Paper
                        key={task.id}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: isCompleted ? "rgba(15, 23, 42, 0.6)" : "background.default",
                          border: `1px solid ${
                            isOverdue
                              ? "rgba(239, 68, 68, 0.4)"
                              : isCompleted
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(255, 255, 255, 0.08)"
                          }`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.2s",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1 }}>
                          <Checkbox
                            checked={isCompleted}
                            onChange={() => handleToggleTaskStatus(task)}
                            color="success"
                          />
                          <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 600,
                                  textDecoration: isCompleted ? "line-through" : "none",
                                  color: isCompleted ? "text.secondary" : "text.primary",
                                }}
                              >
                                {task.title}
                              </Typography>
                              {isOverdue && (
                                <Chip
                                  label="OVERDUE"
                                  size="small"
                                  color="error"
                                  sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                />
                              )}
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5 }}>
                              <Chip
                                label={task.category}
                                size="small"
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                                <AccessTimeIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Chip
                            label={task.priority.toUpperCase()}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              bgcolor:
                                task.priority === "urgent"
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : task.priority === "high"
                                  ? "rgba(245, 158, 11, 0.2)"
                                  : task.priority === "medium"
                                  ? "rgba(99, 102, 241, 0.2)"
                                  : "rgba(148, 163, 184, 0.2)",
                              color:
                                task.priority === "urgent"
                                  ? "#ef4444"
                                  : task.priority === "high"
                                  ? "#f59e0b"
                                  : task.priority === "medium"
                                  ? "#818cf8"
                                  : "text.secondary",
                            }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete task ${task.title}`}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </Box>
            </Card>
          </Box>
        )}

        {/* ======================================================== */}
        {/* TAB 3: VENDOR CHECKLIST */}
        {/* ======================================================== */}
        {activeTab === 3 && (
          <Box>
            {/* Vendor Header */}
            <Card sx={{ p: 3, borderRadius: 2, bgcolor: "background.paper", mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Vendor Sourcing & Quotations
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Manage vendors across 8 key event categories, record quote proposals, and finalize bookings.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddVendorOpen(true)}
                  sx={{
                    background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                    fontWeight: 700,
                  }}
                >
                  Add Vendor Requirement
                </Button>
              </Box>
            </Card>

            {/* Categorized Vendor Accordions */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {VENDOR_CATEGORIES.map((cat) => {
                const categoryItems =
                  vendorData?.items?.filter((item) => item.category === cat.value) || [];

                return (
                  <Accordion
                    key={cat.value}
                    defaultExpanded={categoryItems.length > 0}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: "8px !important",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      "&:before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%", pr: 2 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {cat.label}
                        </Typography>
                        <Chip
                          label={`${categoryItems.length} items`}
                          size="small"
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {categoryItems.length === 0 ? (
                        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
                          No vendors recorded for {cat.label} yet.
                        </Typography>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Vendor / Requirement</TableCell>
                                <TableCell align="right">Quoted Amount</TableCell>
                                <TableCell>Booking Status</TableCell>
                                <TableCell>Payment Status</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell align="center">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {categoryItems.map((vendor) => (
                                <TableRow key={vendor.id} hover>
                                  <TableCell sx={{ fontWeight: 600 }}>{vendor.item_name}</TableCell>
                                  <TableCell align="right">
                                    ${vendor.quotation_amount.toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <FormControl size="small">
                                      <Select
                                        value={vendor.booking_status}
                                        onChange={(e) =>
                                          handleUpdateVendorStatus(
                                            vendor.id,
                                            "booking_status",
                                            e.target.value
                                          )
                                        }
                                        sx={{ height: 32, fontSize: "0.8rem" }}
                                      >
                                        <MenuItem value="not_started">Not Started</MenuItem>
                                        <MenuItem value="contacted">Contacted</MenuItem>
                                        <MenuItem value="quoted">Quoted</MenuItem>
                                        <MenuItem value="booked">Booked</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell>
                                    <FormControl size="small">
                                      <Select
                                        value={vendor.payment_status}
                                        onChange={(e) =>
                                          handleUpdateVendorStatus(
                                            vendor.id,
                                            "payment_status",
                                            e.target.value
                                          )
                                        }
                                        sx={{ height: 32, fontSize: "0.8rem" }}
                                      >
                                        <MenuItem value="unpaid">Unpaid</MenuItem>
                                        <MenuItem value="partially_paid">Partially Paid</MenuItem>
                                        <MenuItem value="paid">Paid</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </TableCell>
                                  <TableCell sx={{ color: "text.secondary" }}>
                                    {vendor.contact_info || "—"}
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      aria-label={`Delete vendor ${vendor.item_name}`}
                                      onClick={() => handleDeleteVendor(vendor.id)}
                                    >
                                      <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          </Box>
        )}
      </Container>

      {/* ======================================================== */}
      {/* DIALOG: ADD BUDGET ITEM */}
      {/* ======================================================== */}
      <Dialog
        open={addBudgetOpen}
        onClose={() => setAddBudgetOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1e293b", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.1)" },
        }}
      >
        <form onSubmit={handleAddBudgetSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Add Expense Item
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={budgetFormData.category}
                  onChange={(e) =>
                    setBudgetFormData({ ...budgetFormData, category: e.target.value as BudgetCategory })
                  }
                >
                  {BUDGET_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Item Name"
                  required
                  placeholder="e.g. Grand Ballroom Rental"
                  value={budgetFormData.item_name}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, item_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Cost (USD)"
                  value={budgetFormData.estimated_amount}
                  onChange={(e) =>
                    setBudgetFormData({
                      ...budgetFormData,
                      estimated_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Actual Cost (USD)"
                  value={budgetFormData.actual_amount}
                  onChange={(e) =>
                    setBudgetFormData({
                      ...budgetFormData,
                      actual_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Notes (Optional)"
                  value={budgetFormData.notes}
                  onChange={(e) => setBudgetFormData({ ...budgetFormData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setAddBudgetOpen(false)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
              }}
            >
              Add Item
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG: ADD TASK */}
      {/* ======================================================== */}
      <Dialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1e293b", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.1)" },
        }}
      >
        <form onSubmit={handleAddTaskSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Add Planning Task
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Task Title"
                  required
                  placeholder="e.g. Finalize Catering Tasting Menu"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Due Date & Time"
                  required
                  value={taskFormData.due_date}
                  onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Priority"
                  value={taskFormData.priority}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, priority: e.target.value as TaskPriority })
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Category / Milestone"
                  value={taskFormData.category}
                  onChange={(e) => setTaskFormData({ ...taskFormData, category: e.target.value })}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description (Optional)"
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setAddTaskOpen(false)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
              }}
            >
              Add Task
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG: RESCHEDULE TIMELINE */}
      {/* ======================================================== */}
      <Dialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1e293b", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.1)" },
        }}
      >
        <form onSubmit={handleRescheduleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Reschedule Event Timeline
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
              Updating your target date will automatically shift task deadlines proportionally.
            </Typography>
            <TextField
              fullWidth
              type="datetime-local"
              label="New Event Date & Time"
              required
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={preserveCompleted}
                  onChange={(e) => setPreserveCompleted(e.target.checked)}
                  color="primary"
                />
              }
              label="Preserve deadlines on completed tasks"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setRescheduleOpen(false)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
              }}
            >
              Apply Reschedule
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG: ADD VENDOR */}
      {/* ======================================================== */}
      <Dialog
        open={addVendorOpen}
        onClose={() => setAddVendorOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: "#1e293b", borderRadius: 2, border: "1px solid rgba(255, 255, 255, 0.1)" },
        }}
      >
        <form onSubmit={handleAddVendorSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
            Add Vendor Requirement
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  value={vendorFormData.category}
                  onChange={(e) =>
                    setVendorFormData({ ...vendorFormData, category: e.target.value as VendorCategory })
                  }
                >
                  {VENDOR_CATEGORIES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Vendor / Business Name"
                  required
                  placeholder="e.g. Apex Sound & Light Systems"
                  value={vendorFormData.item_name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, item_name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quotation Amount (USD)"
                  value={vendorFormData.quotation_amount}
                  onChange={(e) =>
                    setVendorFormData({
                      ...vendorFormData,
                      quotation_amount: parseFloat(e.target.value) || 0,
                    })
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
                  label="Booking Status"
                  value={vendorFormData.booking_status}
                  onChange={(e) =>
                    setVendorFormData({
                      ...vendorFormData,
                      booking_status: e.target.value as BookingStatus,
                    })
                  }
                >
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="contacted">Contacted</MenuItem>
                  <MenuItem value="quoted">Quoted</MenuItem>
                  <MenuItem value="booked">Booked</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Contact Information"
                  placeholder="Phone, email, or website link"
                  value={vendorFormData.contact_info}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contact_info: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setAddVendorOpen(false)} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                fontWeight: 700,
              }}
            >
              Add Vendor
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {event && (
        <AIPlanModal
          open={aiPlanOpen}
          onClose={() => setAiPlanOpen(false)}
          event={event}
          onPlanApplied={loadEventData}
        />
      )}

      {/* Floating Copilot Button */}
      <Box
        sx={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 999,
        }}
      >
        <Button
          variant="contained"
          startIcon={<SmartToyIcon />}
          onClick={() => setAssistantOpen(true)}
          sx={{
            background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
            borderRadius: 2,
            px: 2.5,
            py: 1.2,
            fontWeight: 800,
            fontSize: "0.92rem",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            textTransform: "none",
            "&:hover": {
              background: "linear-gradient(135deg, #4f46e5 0%, #db2777 100%)",
              transform: "translateY(-2px)",
              boxShadow: "0 12px 30px rgba(99, 102, 241, 0.65)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          AI Copilot
        </Button>
      </Box>

      {event && (
        <AssistantDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          event={event}
          onDataUpdated={loadEventData}
        />
      )}
    </Box>
  );
};
export default EventWorkspacePage;
