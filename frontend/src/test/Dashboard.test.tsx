import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AuthProvider } from "../context/AuthContext";
import { DashboardPage } from "../pages/DashboardPage";
import { eventService } from "../services/eventService";

// Mock eventService
vi.mock("../services/eventService", () => ({
  eventService: {
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
}));

describe("DashboardPage Component", () => {
  const mockEvents = [
    {
      id: "evt-1",
      user_id: "user-123",
      name: "Grand Gala Wedding",
      event_type: "wedding",
      event_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Sapphire Ballroom",
      expected_guest_count: 150,
      total_budget: 25000,
      currency: "USD",
      status: "planning",
      stats: {
        budget_allocated: 20000,
        budget_spent: 8500,
        budget_remaining: 16500,
        total_tasks: 12,
        completed_tasks: 4,
        overdue_tasks: 0,
        task_progress_percentage: 33.33,
        total_vendors: 6,
        booked_vendors: 2,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "evt-2",
      user_id: "user-123",
      name: "30th Birthday Bash",
      event_type: "birthday",
      event_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: "Skyline Rooftop Lounge",
      expected_guest_count: 50,
      total_budget: 4000,
      currency: "USD",
      status: "planning",
      stats: {
        budget_allocated: 3500,
        budget_spent: 1200,
        budget_remaining: 2800,
        total_tasks: 8,
        completed_tasks: 6,
        overdue_tasks: 0,
        task_progress_percentage: 75.0,
        total_vendors: 3,
        booked_vendors: 2,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dashboard header banner and aggregate metrics", async () => {
    vi.mocked(eventService.getEvents).mockResolvedValue(mockEvents as any);

    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    // Header banner
    expect(screen.getByText("Coordinate budgets, timelines, vendors, and AI-driven planning across your events.")).toBeTruthy();
    expect(screen.getByText("Create New Event")).toBeTruthy();

    // Aggregate cards
    await waitFor(() => {
      expect(screen.getByText("TOTAL EVENTS")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
      expect(screen.getByText("TOTAL BUDGET MANAGED")).toBeTruthy();
      expect(screen.getByText("$29,000")).toBeTruthy();
    });
  });

  it("renders filter tabs and event cards with metadata", async () => {
    vi.mocked(eventService.getEvents).mockResolvedValue(mockEvents as any);

    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      // Filter tabs
      expect(screen.getByText("All Events")).toBeTruthy();
      expect(screen.getByText("Weddings")).toBeTruthy();
      expect(screen.getByText("Birthdays")).toBeTruthy();
      expect(screen.getByText("Community")).toBeTruthy();

      // Event Cards
      expect(screen.getByText("Grand Gala Wedding")).toBeTruthy();
      expect(screen.getByText("Sapphire Ballroom")).toBeTruthy();
      expect(screen.getByText("150 Expected Guests")).toBeTruthy();
      expect(screen.getByText("30th Birthday Bash")).toBeTruthy();
      expect(screen.getByText("Skyline Rooftop Lounge")).toBeTruthy();
      expect(screen.getByText("50 Expected Guests")).toBeTruthy();
    });
  });

  it("renders empty state when user has no events", async () => {
    vi.mocked(eventService.getEvents).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No events created yet")).toBeTruthy();
      expect(screen.getByText(/Get started by planning your first Wedding/)).toBeTruthy();
    });
  });
});
