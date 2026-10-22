import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AuthProvider } from "../context/AuthContext";
import { EventWorkspacePage } from "../pages/EventWorkspacePage";
import { eventService } from "../services/eventService";

// Mock eventService
vi.mock("../services/eventService", () => ({
  eventService: {
    getEvent: vi.fn(),
    getBudgetSummary: vi.fn(),
    getTasks: vi.fn(),
    getVendors: vi.fn(),
    addBudgetItem: vi.fn(),
    deleteBudgetItem: vi.fn(),
    updateBudgetItem: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    rescheduleTimeline: vi.fn(),
    addVendor: vi.fn(),
    updateVendor: vi.fn(),
    deleteVendor: vi.fn(),
  },
}));

describe("EventWorkspacePage Component", () => {
  const mockEvent = {
    id: "evt-123",
    user_id: "user-1",
    name: "Emma & Liam's Garden Wedding",
    event_type: "wedding",
    event_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Botanical Glasshouse, Austin",
    expected_guest_count: 120,
    total_budget: 18000,
    currency: "USD",
    theme: "Botanical Elegance",
    preferences: "Classical string trio, vegan and gluten-free dessert bar",
    special_requirements: "Wheelchair ramp access, outdoor heating lamps",
    status: "planning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockBudgetSummary = {
    total_budget: 18000,
    currency: "USD",
    total_estimated: 16500,
    total_actual: 7200,
    remaining_budget: 10800,
    cost_per_guest: 60.0,
    utilization_percentage: 40.0,
    is_overspent: false,
    overspent_amount: 0,
    items_by_category: {
      venue: { estimated: 6000, actual: 4000, count: 1 },
      catering: { estimated: 5000, actual: 3200, count: 1 },
    },
    items: [
      {
        id: "b-1",
        event_id: "evt-123",
        user_id: "user-1",
        category: "venue",
        item_name: "Glasshouse Conservatory Deposit",
        estimated_amount: 6000,
        actual_amount: 4000,
        status: "paid",
        notes: "Full day rental",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };

  const mockTasks = {
    tasks: [
      {
        id: "t-1",
        event_id: "evt-123",
        user_id: "user-1",
        title: "Send Save the Date Cards",
        description: "Mailing physical and digital cards",
        category: "Stationery",
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        status: "pending",
        dependencies: [],
        is_overdue: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    total: 1,
    completed: 0,
    overdue: 0,
    completion_percentage: 0.0,
  };

  const mockVendors = {
    items: [
      {
        id: "v-1",
        event_id: "evt-123",
        user_id: "user-1",
        category: "venue",
        item_name: "Botanical Glasshouse Estate",
        quotation_amount: 6000,
        booking_status: "booked",
        payment_status: "partially_paid",
        contact_info: "events@glasshouse.com",
        notes: "Deposit paid",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    total_count: 1,
    booked_count: 1,
    total_quotations: 6000,
    categories: { venue: 1 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders event header, tabs, and overview metrics", async () => {
    vi.mocked(eventService.getEvent).mockResolvedValue(mockEvent as any);
    vi.mocked(eventService.getBudgetSummary).mockResolvedValue(mockBudgetSummary as any);
    vi.mocked(eventService.getTasks).mockResolvedValue(mockTasks as any);
    vi.mocked(eventService.getVendors).mockResolvedValue(mockVendors as any);

    render(
      <MemoryRouter initialEntries={["/events/evt-123"]}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <Routes>
              <Route path="/events/:eventId" element={<EventWorkspacePage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Verify Title & Meta
    await waitFor(() => {
      expect(screen.getAllByText("Emma & Liam's Garden Wedding").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Botanical Glasshouse, Austin")).toBeTruthy();
      expect(screen.getByText("120 Guests")).toBeTruthy();
      expect(screen.getByText("Botanical Elegance")).toBeTruthy();
      expect(screen.getByText("REMAINING BUDGET")).toBeTruthy();
      expect(screen.getByText("$10,800")).toBeTruthy();
      expect(screen.getByText("TASK PROGRESS")).toBeTruthy();
    });
  });
});
