import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AuthProvider } from "../context/AuthContext";
import { Navbar } from "../components/Navbar";
import { HomePage } from "../pages/HomePage";
import { AIPlanModal } from "../components/AIPlanModal";
import { Event } from "../types";

describe("Accessibility & WCAG 2.1 AA Compliance", () => {
  const sampleEvent: Event = {
    id: "evt-acc-1",
    user_id: "user-1",
    name: "Accessibility Gala",
    event_type: "community",
    event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Civic Center Hall",
    expected_guest_count: 100,
    total_budget: 8000,
    currency: "USD",
    status: "planning",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("ensures Navbar has accessible header landmark and brand label", () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Header landmark check
    const header = screen.getByRole("banner");
    expect(header).toBeTruthy();

    // Brand link accessible name
    const brandLink = screen.getByLabelText("EventWise AI Home");
    expect(brandLink).toBeTruthy();
  });

  it("ensures HomePage hero call-to-actions and event cards have semantic headings and accessible buttons", () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <HomePage />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    // Main heading
    const mainHeading = screen.getByRole("heading", { level: 1 });
    expect(mainHeading).toBeTruthy();

    // Call to action button accessible name
    const startBtn = screen.getByRole("link", { name: /start planning events/i });
    expect(startBtn).toBeTruthy();

    const exploreBtn = screen.getByRole("link", { name: /explore event setup/i });
    expect(exploreBtn).toBeTruthy();
  });


  it("ensures AIPlanModal has dialog role and accessible close action", async () => {
    render(
      <ThemeProvider theme={theme}>
        <AIPlanModal
          open={true}
          onClose={vi.fn()}
          event={sampleEvent}
          onPlanApplied={vi.fn()}
        />
      </ThemeProvider>
    );

    // Modal role
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    // Accessible close button
    const closeBtn = screen.getByLabelText("Close dialog");
    expect(closeBtn).toBeTruthy();

    // Action button accessible name
    const generateBtn = screen.getByRole("button", { name: /generate ai blueprint/i });
    expect(generateBtn).toBeTruthy();
  });
});
