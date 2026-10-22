import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AssistantDrawer } from "../components/AssistantDrawer";
import { eventService } from "../services/eventService";
import { Event, AssistantResponse } from "../types";

// Mock eventService
vi.mock("../services/eventService", () => ({
  eventService: {
    getAssistantHistory: vi.fn(),
    sendAssistantMessage: vi.fn(),
    confirmAssistantProposal: vi.fn(),
  },
}));

describe("AssistantDrawer Component", () => {
  const mockEvent: Event = {
    id: "evt-assistant-test",
    user_id: "user-1",
    name: "Golden Jubilee Gala",
    event_type: "community",
    event_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    location: "City Banquet Hall",
    expected_guest_count: 100,
    total_budget: 10000,
    currency: "USD",
    status: "planning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockProposalResponse: AssistantResponse = {
    proposal_id: "prop-12345",
    reply: "I have staged a proposal to decrease catering by $500 and reallocate to photography.",
    requires_confirmation: true,
    provider_used: "sample",
    is_fallback: true,
    proposed_changes: {
      budget_adjustments: [
        {
          category: "catering",
          action: "decrease",
          amount: 500,
          delta: -500,
          reason: "Reduce catering expense",
        },
        {
          category: "photography",
          action: "increase",
          amount: 500,
          delta: 500,
          reason: "Reallocate to photography",
        },
      ],
      task_additions: [],
      vendor_additions: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(eventService.getAssistantHistory).mockResolvedValue([]);
  });

  it("renders drawer header, suggestions, and input bar when open", async () => {
    render(
      <ThemeProvider theme={theme}>
        <AssistantDrawer
          open={true}
          onClose={vi.fn()}
          event={mockEvent}
          onDataUpdated={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("AI Planning Copilot")).toBeTruthy();
    expect(screen.getByText("Golden Jubilee Gala")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ask a question or request a modification...")).toBeTruthy();
    expect(
      screen.getByText("Reduce catering budget by 10% and allocate to photography")
    ).toBeTruthy();
  });

  it("submits message and renders assistant reply with proposal card", async () => {
    vi.mocked(eventService.sendAssistantMessage).mockResolvedValue(mockProposalResponse);

    render(
      <ThemeProvider theme={theme}>
        <AssistantDrawer
          open={true}
          onClose={vi.fn()}
          event={mockEvent}
          onDataUpdated={vi.fn()}
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText("Ask a question or request a modification...");
    fireEvent.change(input, {
      target: { value: "Reduce catering by 500 and allocate to photography" },
    });

    const sendBtn = screen.getByLabelText("Send message");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(eventService.sendAssistantMessage).toHaveBeenCalledWith(
        "evt-assistant-test",
        "Reduce catering by 500 and allocate to photography",
        false
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "I have staged a proposal to decrease catering by $500 and reallocate to photography."
        )
      ).toBeTruthy();
      expect(screen.getByText("⚠️ Action Required: Staged Proposal")).toBeTruthy();
      expect(screen.getByText("Confirm & Apply")).toBeTruthy();
      expect(screen.getByText("Dismiss")).toBeTruthy();
    });
  });

  it("confirms and applies proposal diff when 'Confirm & Apply' is clicked", async () => {
    vi.mocked(eventService.sendAssistantMessage).mockResolvedValue(mockProposalResponse);
    vi.mocked(eventService.confirmAssistantProposal).mockResolvedValue({
      proposal_id: "prop-12345",
      applied: true,
      message: "Proposed changes successfully applied to event.",
      budget_items_affected: 2,
      tasks_created: 0,
      vendors_created: 0,
      event_updated: false,
    });

    const mockOnDataUpdated = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <AssistantDrawer
          open={true}
          onClose={vi.fn()}
          event={mockEvent}
          onDataUpdated={mockOnDataUpdated}
        />
      </ThemeProvider>
    );

    // Send message to trigger proposal
    const input = screen.getByPlaceholderText("Ask a question or request a modification...");
    fireEvent.change(input, {
      target: { value: "Reduce catering by 500 and allocate to photography" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));

    await waitFor(() => {
      expect(screen.getByText("Confirm & Apply")).toBeTruthy();
    });

    // Click confirm
    fireEvent.click(screen.getByText("Confirm & Apply"));

    await waitFor(() => {
      expect(eventService.confirmAssistantProposal).toHaveBeenCalledWith(
        "evt-assistant-test",
        "prop-12345",
        true
      );
      expect(mockOnDataUpdated).toHaveBeenCalled();
      expect(screen.getByText("✅ Changes Applied")).toBeTruthy();
    });
  });
});
