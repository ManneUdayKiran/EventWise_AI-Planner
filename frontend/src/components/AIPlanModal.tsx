import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Switch,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaletteIcon from "@mui/icons-material/Palette";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import BoltIcon from "@mui/icons-material/Bolt";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { eventService } from "../services/eventService";
import { Event, AIPlanProposal } from "../types";

interface AIPlanModalProps {
  open: boolean;
  onClose: () => void;
  event: Event;
  onPlanApplied: () => void;
}

const FOCUS_OPTIONS = [
  "Catering & Culinary Menu",
  "Visual Decor & Atmosphere",
  "Music & Guest Entertainment",
  "Photography & Memory Keepsakes",
  "Budget Optimization & Savings",
  "Eco-Friendly Sustainability",
];

export const AIPlanModal: React.FC<AIPlanModalProps> = ({
  open,
  onClose,
  event,
  onPlanApplied,
}) => {
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([
    "Catering & Culinary Menu",
    "Visual Decor & Atmosphere",
  ]);
  const [forceFallback, setForceFallback] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AIPlanProposal | null>(null);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<number>(0);

  const handleFocusToggle = (area: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const plan = await eventService.generatePlan(event.id, {
        focus_areas: selectedFocusAreas,
        force_fallback: forceFallback,
      });
      setProposal(plan);
      setPreviewTab(0);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to generate AI plan. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!proposal) return;
    setApplying(true);
    setError(null);
    try {
      const result = await eventService.applyPlan(event.id, proposal, replaceExisting);
      setSuccessMessage(
        `${result.message} (${result.budget_items_created} budget items, ${result.tasks_created} tasks, ${result.vendors_created} vendors added)`
      );
      setTimeout(() => {
        onPlanApplied();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to commit plan items.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading || applying ? undefined : onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="ai-plan-modal-title"
      aria-describedby="ai-plan-modal-description"
      PaperProps={{
        sx: {
          bgcolor: "#0f172a",
          backgroundImage: "none",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
            }}
          >
            <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography
              id="ai-plan-modal-title"
              variant="h6"
              sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}
            >
              AI Event Blueprint Generator
            </Typography>
            <Typography
              id="ai-plan-modal-description"
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              Generates tailored themes, deterministic budget allocations, milestone tasks, and vendor checklists.
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading || applying}
          sx={{ color: "text.secondary" }}
          aria-label="Close dialog"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon fontSize="inherit" />}
            sx={{ mb: 3 }}
          >
            {successMessage}
          </Alert>
        )}

        {/* Step 1: Configuration bar */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 1.5,
            bgcolor: "rgba(30, 41, 59, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "#94a3b8" }}>
            SELECT FOCUS AREAS FOR THIS EVENT
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {FOCUS_OPTIONS.map((area) => {
              const selected = selectedFocusAreas.includes(area);
              return (
                <Chip
                  key={area}
                  label={area}
                  clickable
                  onClick={() => handleFocusToggle(area)}
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  sx={{
                    fontWeight: 600,
                    borderRadius: 1,
                    fontSize: "0.85rem",
                    transition: "all 0.2s ease",
                    bgcolor: selected ? "#6366f1" : "rgba(255, 255, 255, 0.05)",
                    "&:hover": {
                      bgcolor: selected ? "#4f46e5" : "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                />
              );
            })}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              pt: 1.5,
              borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={forceFallback}
                  onChange={(e) => setForceFallback(e.target.checked)}
                  color="warning"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Offline Deterministic Engine Mode (No API call)
                </Typography>
              }
            />

            <Button
              variant="contained"
              startIcon={
                loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              onClick={handleGenerate}
              disabled={loading || applying}
              sx={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                fontWeight: 700,
                px: 3,
                py: 1,
                borderRadius: 1.5,
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
              }}
            >
              {loading ? "Generating Blueprint..." : proposal ? "Regenerate Blueprint" : "Generate AI Blueprint"}
            </Button>
          </Box>
        </Paper>

        {/* Step 2: Generated Proposal Display */}
        {proposal && (
          <Box>
            {/* Provider and Mode Status Banner */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
                p: 2,
                mb: 3,
                borderRadius: 1.5,
                bgcolor: proposal.is_fallback
                  ? "rgba(245, 158, 11, 0.1)"
                  : "rgba(99, 102, 241, 0.1)",
                border: proposal.is_fallback
                  ? "1px solid rgba(245, 158, 11, 0.3)"
                  : "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {proposal.is_fallback ? (
                  <CloudOffIcon sx={{ color: "#f59e0b" }} />
                ) : (
                  <BoltIcon sx={{ color: "#818cf8" }} />
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {proposal.is_fallback
                      ? "Offline Deterministic Fallback Active"
                      : `Live AI Engine Active (${proposal.provider_used})`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {proposal.is_fallback
                      ? "Generated through resilient zero-trust heuristics with exact budget mathematics."
                      : "Generated through Gemini GenAI with structured schema validation and deterministic financial rounding."}
                  </Typography>
                </Box>
              </Box>

              <Chip
                label={`Budget Sum: $${proposal.total_proposed_budget.toLocaleString()} / $${event.total_budget.toLocaleString()}`}
                sx={{
                  bgcolor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  fontWeight: 700,
                }}
              />
            </Box>

            {/* Proposal Navigation Tabs */}
            <Paper
              elevation={0}
              sx={{
                mb: 2.5,
                borderRadius: 1.5,
                bgcolor: "rgba(30, 41, 59, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <Tabs
                value={previewTab}
                onChange={(_, val) => setPreviewTab(val)}
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    textTransform: "none",
                    minHeight: 44,
                  },
                }}
              >
                <Tab label="Concept & Highlights" />
                <Tab label={`Budget Blueprint (${proposal.budget_allocations.length} Items)`} />
                <Tab label={`Timeline Tasks (${proposal.planning_tasks.length} Milestones)`} />
                <Tab label={`Vendor Checklist (${proposal.vendor_categories.length} Categories)`} />
              </Tabs>
            </Paper>

            {/* PREVIEW TAB 0: Concept & Ideas */}
            {previewTab === 0 && (
              <Box>
                {/* Executive Summary Card */}
                <Card
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 1.5,
                    bgcolor: "rgba(30, 41, 59, 0.7)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#818cf8" }}>
                    EVENT CONCEPT & VISION
                  </Typography>
                  <Typography variant="body1" sx={{ lineHeight: 1.7, color: "#e2e8f0" }}>
                    {proposal.summary}
                  </Typography>
                </Card>

                <Grid container spacing={2.5}>
                  {/* Theme & Decor */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 1.5,
                        bgcolor: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <PaletteIcon sx={{ color: "#ec4899", fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Theme & Aesthetic Styling
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary" }}>
                        {proposal.theme_and_decor.map((item, idx) => (
                          <Typography
                            component="li"
                            key={idx}
                            variant="body2"
                            sx={{ mb: 1, lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    </Card>
                  </Grid>

                  {/* Culinary & Food */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 1.5,
                        bgcolor: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <RestaurantIcon sx={{ color: "#f97316", fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Curated Culinary & Drinks
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary" }}>
                        {proposal.food_recommendations.map((item, idx) => (
                          <Typography
                            component="li"
                            key={idx}
                            variant="body2"
                            sx={{ mb: 1, lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    </Card>
                  </Grid>

                  {/* Entertainment */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 1.5,
                        bgcolor: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <MusicNoteIcon sx={{ color: "#06b6d4", fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Guest Entertainment & Activities
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary" }}>
                        {proposal.entertainment_suggestions.map((item, idx) => (
                          <Typography
                            component="li"
                            key={idx}
                            variant="body2"
                            sx={{ mb: 1, lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    </Card>
                  </Grid>

                  {/* Personalized Recommendations */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        p: 2.5,
                        height: "100%",
                        borderRadius: 1.5,
                        bgcolor: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <TipsAndUpdatesIcon sx={{ color: "#eab308", fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Personalized Execution Tips
                        </Typography>
                      </Box>
                      <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary" }}>
                        {proposal.personalized_recommendations.map((item, idx) => (
                          <Typography
                            component="li"
                            key={idx}
                            variant="body2"
                            sx={{ mb: 1, lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* PREVIEW TAB 1: Budget Proposals */}
            {previewTab === 1 && (
              <Box>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Expense Item</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Allocation Notes</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#94a3b8" }}>
                          Estimated Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {proposal.budget_allocations.map((item, idx) => (
                        <TableRow key={idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell>
                            <Chip
                              label={item.category.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                bgcolor: "rgba(99, 102, 241, 0.15)",
                                color: "#818cf8",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{item.item_name}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                            {item.notes || "Standard allocation"}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#10b981" }}>
                            ${item.estimated_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* PREVIEW TAB 2: Planning Tasks */}
            {previewTab === 2 && (
              <Box>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Schedule</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Priority</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Milestone Task</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Category & Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {proposal.planning_tasks.map((task, idx) => (
                        <TableRow key={idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 700, color: "#818cf8", whiteSpace: "nowrap" }}>
                            {task.days_before_event === 0
                              ? "Event Day"
                              : `${task.days_before_event} days prior`}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={task.priority.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.68rem",
                                bgcolor:
                                  task.priority === "urgent"
                                    ? "rgba(239, 68, 68, 0.15)"
                                    : task.priority === "high"
                                    ? "rgba(249, 115, 22, 0.15)"
                                    : "rgba(59, 130, 246, 0.15)",
                                color:
                                  task.priority === "urgent"
                                    ? "#ef4444"
                                    : task.priority === "high"
                                    ? "#f97316"
                                    : "#60a5fa",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{task.title}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: "#94a3b8", display: "block" }}>
                              {task.category}
                            </Typography>
                            {task.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* PREVIEW TAB 3: Vendors Checklist */}
            {previewTab === 3 && (
              <Box>
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: "rgba(30, 41, 59, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Requirement</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#94a3b8" }}>Scope of Services</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#94a3b8" }}>
                          Target Quote
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {proposal.vendor_categories.map((vendor, idx) => (
                        <TableRow key={idx} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                          <TableCell>
                            <Chip
                              label={vendor.category.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.7rem",
                                bgcolor: "rgba(168, 85, 247, 0.15)",
                                color: "#c084fc",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{vendor.item_name}</TableCell>
                          <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                            {vendor.suggested_scope}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#10b981" }}>
                            ${(vendor.estimated_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {proposal && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  size="small"
                  sx={{ color: "rgba(255, 255, 255, 0.4)" }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Replace existing uncommitted items (clean slate)
                </Typography>
              }
            />
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button onClick={onClose} disabled={loading || applying} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          {proposal && (
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={applying || loading}
              startIcon={
                applying ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />
              }
              sx={{
                bgcolor: "#10b981",
                "&:hover": { bgcolor: "#059669" },
                fontWeight: 700,
                px: 3,
              }}
            >
              {applying ? "Applying..." : "Apply This Blueprint"}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
