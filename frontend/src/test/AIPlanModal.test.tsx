import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AIPlanModal } from "../components/AIPlanModal";
import { eventService } from "../services/eventService";
import { AIPlanProposal, Event } from "../types";

// Mock eventService
vi.mock("../services/eventService", () => ({
  eventService: {
    generatePlan: vi.fn(),
    applyPlan: vi.fn(),
  },
}));

describe("AIPlanModal Component", () => {
  const mockEvent: Event = {
    id: "evt-ai-test",
    user_id: "user-1",
    name: "Summer Solstice Garden Gala",
    event_type: "community",
    event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Meadow Park Pavilion",
    expected_guest_count: 200,
    total_budget: 12000,
    currency: "USD",
    theme: "Botanical Midsummer",
    status: "planning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockProposal: AIPlanProposal = {
    event_id: "evt-ai-test",
    summary: "A vibrant botanical summer celebration featuring live acoustic music and farm-to-table dining.",
    theme_and_decor: ["Fairy lights and solar lanterns", "Recycled wood centerpieces"],
    food_recommendations: ["Artisan flatbreads and local ciders", "Seasonal fruit tartlet station"],
    entertainment_suggestions: ["Community lawn games", "Local indie folk quartet"],
    budget_allocations: [
      {
        category: "venue",
        item_name: "Pavilion Permit & Electricity",
        estimated_amount: 3000,
        notes: "Full park reservation",
      },
      {
        category: "catering",
        item_name: "Farm-to-Table Food Trucks",
        estimated_amount: 5000,
        notes: "Pre-negotiated buffet meal vouchers",
      },
    ],
    planning_tasks: [
      {
        title: "Submit Municipal Park Permit",
        category: "Logistics",
        days_before_event: 45,
        priority: "urgent",
        description: "File sound ordinance permit with city office",
      },
    ],
    vendor_categories: [
      {
        category: "catering",
        item_name: "Farm-to-Table Catering Partner",
        suggested_scope: "Buffet service for 200 guests with vegetarian options",
        estimated_budget: 5000,
      },
    ],
    personalized_recommendations: [
      "Ensure covered pavilions have misting fans for summer comfort",
    ],
    provider_used: "sample",
    is_fallback: true,
    total_proposed_budget: 8000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal header, focus chips, and generate button", () => {
    render(
      <ThemeProvider theme={theme}>
        <AIPlanModal
          open={true}
          onClose={vi.fn()}
          event={mockEvent}
          onPlanApplied={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByText("AI Event Blueprint Generator")).toBeTruthy();
    expect(screen.getByText("SELECT FOCUS AREAS FOR THIS EVENT")).toBeTruthy();
    expect(screen.getByText("Catering & Culinary Menu")).toBeTruthy();
    expect(screen.getByText("Offline Deterministic Engine Mode (No API call)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /generate ai blueprint/i })).toBeTruthy();
  });

  it("generates and displays blueprint proposal preview on button click", async () => {
    vi.mocked(eventService.generatePlan).mockResolvedValue(mockProposal);

    render(
      <ThemeProvider theme={theme}>
        <AIPlanModal
          open={true}
          onClose={vi.fn()}
          event={mockEvent}
          onPlanApplied={vi.fn()}
        />
      </ThemeProvider>
    );

    const generateBtn = screen.getByRole("button", { name: /generate ai blueprint/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(eventService.generatePlan).toHaveBeenCalledWith("evt-ai-test", {
        focus_areas: ["Catering & Culinary Menu", "Visual Decor & Atmosphere"],
        force_fallback: false,
      });
    });

    // Verify generated content appears
    await waitFor(() => {
      expect(screen.getByText("Offline Deterministic Fallback Active")).toBeTruthy();
      expect(screen.getByText("EVENT CONCEPT & VISION")).toBeTruthy();
      expect(
        screen.getByText(
          "A vibrant botanical summer celebration featuring live acoustic music and farm-to-table dining."
        )
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: /apply this blueprint/i })).toBeTruthy();
    });
  });

  it("commits and applies proposal to event when 'Apply This Blueprint' is clicked", async () => {
    vi.mocked(eventService.generatePlan).mockResolvedValue(mockProposal);
    vi.mocked(eventService.applyPlan).mockResolvedValue({
      event_id: "evt-ai-test",
      budget_items_created: 2,
      tasks_created: 1,
      vendors_created: 1,
      message: "Plan successfully applied to event.",
    });

    const mockOnPlanApplied = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <ThemeProvider theme={theme}>
        <AIPlanModal
          open={true}
          onClose={mockOnClose}
          event={mockEvent}
          onPlanApplied={mockOnPlanApplied}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /generate ai blueprint/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /apply this blueprint/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /apply this blueprint/i }));

    await waitFor(() => {
      expect(eventService.applyPlan).toHaveBeenCalledWith(
        "evt-ai-test",
        mockProposal,
        false
      );
      expect(
        screen.getByText(
          "Plan successfully applied to event. (2 budget items, 1 tasks, 1 vendors added)"
        )
      ).toBeTruthy();
    });
  });
});
