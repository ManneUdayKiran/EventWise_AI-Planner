import React, { useState, useEffect, useRef } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Chip,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Card,
  Switch,
  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import CheckIcon from "@mui/icons-material/Check";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PeopleIcon from "@mui/icons-material/People";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";

import { eventService } from "../services/eventService";
import {
  Event,
  AssistantResponse,
  AssistantMessageLog,
  ProposedChanges,
} from "../types";

interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  event: Event;
  onDataUpdated: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal?: {
    id: string;
    changes: ProposedChanges;
    confirmed?: boolean;
    applied?: boolean;
  };
  created_at: string;
}

const QUICK_SUGGESTIONS = [
  "Reduce catering budget by 10% and allocate to photography",
  "Add a high priority task to book cake 3 weeks before event",
  "Update expected guest count to 150",
  "Add vendor for live music band with target quote $900",
  "What are some creative eco-friendly favors for guests?",
];

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  open,
  onClose,
  event,
  onDataUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [forceFallback, setForceFallback] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, event.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = async () => {
    try {
      const logs = await eventService.getAssistantHistory(event.id);
      if (logs.length > 0) {
        setMessages(
          logs.map((log) => ({
            id: log.id,
            role: log.role,
            content: log.content,
            created_at: log.created_at,
          }))
        );
      } else {
        // Initial welcome message
        setMessages([
          {
            id: "welcome-1",
            role: "assistant",
            content: `Hello! I am your AI Planning Copilot for **${event.name}**. You can ask for recommendations, or tell me to modify budgets, schedule tasks, adjust guest counts, or create vendor requirements!`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // If history load fails, show welcome
      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          content: `Hello! I am your AI Planning Copilot for **${event.name}**. How can I help you plan today?`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText("");
    setFeedback(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: AssistantResponse = await eventService.sendAssistantMessage(
        event.id,
        text,
        forceFallback
      );

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        proposal:
          res.requires_confirmation && res.proposal_id && res.proposed_changes
            ? {
                id: res.proposal_id,
                changes: res.proposed_changes,
                confirmed: false,
              }
            : undefined,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback({
        type: "error",
        text: e.response?.data?.detail || "Failed to communicate with assistant.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = async (proposalId: string, confirmed: boolean) => {
    setConfirmingId(proposalId);
    setFeedback(null);
    try {
      const res = await eventService.confirmAssistantProposal(event.id, proposalId, confirmed);
      setMessages((prev) =>
        prev.map((m) =>
          m.proposal?.id === proposalId
            ? {
                ...m,
                proposal: {
                  ...m.proposal,
                  confirmed: true,
                  applied: res.applied,
                },
              }
            : m
        )
      );

      if (res.applied) {
        setFeedback({
          type: "success",
          text: `${res.message} (Updated workspace tabs instantly)`,
        });
        onDataUpdated();
      } else {
        setFeedback({
          type: "success",
          text: "Proposal dismissed.",
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback({
        type: "error",
        text: e.response?.data?.detail || "Failed to execute proposal confirmation.",
      });
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 460 },
          bgcolor: "#0f172a",
          backgroundImage: "none",
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2.5,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
            }}
          >
            <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
              AI Planning Copilot
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {event.name}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "text.secondary" }} aria-label="Close Copilot">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Engine and Mode Switch */}
      <Box
        sx={{
          px: 2.5,
          py: 1.2,
          bgcolor: "rgba(30, 41, 59, 0.5)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Chip
          label={forceFallback ? "🛡️ Deterministic Mode" : "⚡ Live AI Engine"}
          size="small"
          sx={{
            fontWeight: 700,
            fontSize: "0.72rem",
            bgcolor: forceFallback ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.15)",
            color: forceFallback ? "#f59e0b" : "#818cf8",
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={forceFallback}
              onChange={(e) => setForceFallback(e.target.checked)}
              size="small"
              color="warning"
            />
          }
          label={
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Force Offline
            </Typography>
          }
          sx={{ m: 0 }}
        />
      </Box>

      {/* Feedback Alert */}
      {feedback && (
        <Box sx={{ p: 2 }}>
          <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        </Box>
      )}

      {/* Chat Messages Stream */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <Box
              key={msg.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexDirection: isUser ? "row-reverse" : "row",
                }}
              >
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    bgcolor: isUser ? "rgba(99, 102, 241, 0.2)" : "rgba(236, 72, 153, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isUser ? (
                    <PersonIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                  ) : (
                    <SmartToyIcon sx={{ fontSize: 16, color: "#ec4899" }} />
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                  {isUser ? "You" : "EventWise Copilot"}
                </Typography>
              </Box>

              {/* Message Bubble */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  maxWidth: "90%",
                  borderRadius: 1.5,
                  bgcolor: isUser
                    ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
                    : "rgba(30, 41, 59, 0.8)",
                  border: isUser
                    ? "none"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#f8fafc",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    "& strong": { color: isUser ? "#fff" : "#818cf8" },
                  }}
                >
                  {msg.content}
                </Typography>
              </Paper>

              {/* Staged Proposal Card */}
              {msg.proposal && (
                <Card
                  sx={{
                    mt: 1,
                    p: 2,
                    maxWidth: "92%",
                    borderRadius: 1.5,
                    bgcolor: "rgba(30, 41, 59, 0.95)",
                    border: msg.proposal.confirmed
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(245, 158, 11, 0.4)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <Chip
                      label={
                        msg.proposal.confirmed
                          ? msg.proposal.applied
                            ? "✅ Changes Applied"
                            : "❌ Dismissed"
                          : "⚠️ Action Required: Staged Proposal"
                      }
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        bgcolor: msg.proposal.confirmed
                          ? msg.proposal.applied
                            ? "rgba(16, 185, 129, 0.2)"
                            : "rgba(239, 68, 68, 0.2)"
                          : "rgba(245, 158, 11, 0.2)",
                        color: msg.proposal.confirmed
                          ? msg.proposal.applied
                            ? "#10b981"
                            : "#ef4444"
                          : "#f59e0b",
                      }}
                    />
                  </Box>

                  {/* Budget Diffs */}
                  {msg.proposal.changes.budget_adjustments.map((b, idx) => (
                    <Box
                      key={`b-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.5,
                        fontSize: "0.82rem",
                      }}
                    >
                      {b.delta < 0 ? (
                        <TrendingDownIcon sx={{ color: "#ef4444", fontSize: 18 }} />
                      ) : (
                        <TrendingUpIcon sx={{ color: "#10b981", fontSize: 18 }} />
                      )}
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {b.category.toUpperCase()}:
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: b.delta < 0 ? "#ef4444" : "#10b981",
                        }}
                      >
                        {b.delta < 0 ? `-$${Math.abs(b.delta)}` : `+$${b.delta}`}
                      </Typography>
                      {b.reason && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          ({b.reason})
                        </Typography>
                      )}
                    </Box>
                  ))}

                  {/* Task Diffs */}
                  {msg.proposal.changes.task_additions.map((t, idx) => (
                    <Box
                      key={`t-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.5,
                        fontSize: "0.82rem",
                      }}
                    >
                      <AssignmentIcon sx={{ color: "#60a5fa", fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        New Task:
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#f8fafc" }}>
                        {t.title}
                      </Typography>
                      <Chip
                        label={t.priority.toUpperCase()}
                        size="small"
                        sx={{ fontSize: "0.65rem", height: 18, fontWeight: 700 }}
                      />
                    </Box>
                  ))}

                  {/* Vendor Diffs */}
                  {msg.proposal.changes.vendor_additions.map((v, idx) => (
                    <Box
                      key={`v-${idx}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 0.5,
                        fontSize: "0.82rem",
                      }}
                    >
                      <StorefrontIcon sx={{ color: "#c084fc", fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Vendor:
                      </Typography>
                      <Typography variant="caption">{v.item_name}</Typography>
                      <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 700 }}>
                        ${v.target_quote}
                      </Typography>
                    </Box>
                  ))}

                  {/* Event Meta Diffs */}
                  {msg.proposal.changes.event_updates && (
                    <Box sx={{ py: 0.5 }}>
                      {msg.proposal.changes.event_updates.expected_guest_count && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PeopleIcon sx={{ color: "#818cf8", fontSize: 18 }} />
                          <Typography variant="caption">
                            Guest Count: {msg.proposal.changes.event_updates.expected_guest_count}
                          </Typography>
                        </Box>
                      )}
                      {msg.proposal.changes.event_updates.total_budget && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AttachMoneyIcon sx={{ color: "#10b981", fontSize: 18 }} />
                          <Typography variant="caption">
                            Total Budget: ${msg.proposal.changes.event_updates.total_budget}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Proposal Confirmation Actions */}
                  {!msg.proposal.confirmed && (
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={
                          confirmingId === msg.proposal.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <CheckIcon />
                          )
                        }
                        onClick={() => handleConfirmProposal(msg.proposal!.id, true)}
                        disabled={confirmingId === msg.proposal.id}
                        sx={{
                          bgcolor: "#10b981",
                          "&:hover": { bgcolor: "#059669" },
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          textTransform: "none",
                        }}
                      >
                        Confirm & Apply
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleConfirmProposal(msg.proposal!.id, false)}
                        disabled={confirmingId === msg.proposal.id}
                        sx={{
                          borderColor: "rgba(255, 255, 255, 0.2)",
                          color: "text.secondary",
                          fontSize: "0.75rem",
                          textTransform: "none",
                        }}
                      >
                        Dismiss
                      </Button>
                    </Box>
                  )}
                </Card>
              )}
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
            <CircularProgress size={18} sx={{ color: "#818cf8" }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Copilot is analyzing your event plan...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Quick Suggestion Pills */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          gap: 1,
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 4 },
        }}
      >
        {QUICK_SUGGESTIONS.map((sugg, i) => (
          <Chip
            key={i}
            label={sugg}
            size="small"
            clickable
            onClick={() => handleSendMessage(sugg)}
            sx={{
              fontSize: "0.72rem",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              color: "text.secondary",
              whiteSpace: "nowrap",
              "&:hover": {
                bgcolor: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
              },
            }}
          />
        ))}
      </Box>

      {/* Input Composer */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "rgba(15, 23, 42, 0.95)",
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask a question or request a modification..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
                bgcolor: "rgba(30, 41, 59, 0.5)",
              },
            }}
          />
          <IconButton
            onClick={() => handleSendMessage()}
            disabled={loading || !inputText.trim()}
            sx={{
              background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
              color: "#fff",
              borderRadius: 1.5,
              "&:hover": {
                background: "linear-gradient(135deg, #4f46e5 0%, #db2777 100%)",
              },
              "&.Mui-disabled": {
                opacity: 0.5,
                color: "rgba(255, 255, 255, 0.4)",
              },
            }}
            aria-label="Send message"
          >
            {loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};
