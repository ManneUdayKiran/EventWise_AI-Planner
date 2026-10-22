import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../theme";
import { AuthProvider } from "../context/AuthContext";
import { App } from "../App";

describe("Frontend Foundation & Navigation", () => {
  it("renders navbar with brand title", () => {
    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("EventWise AI")).toBeTruthy();
    expect(screen.getByText("GenAI Planning Platform")).toBeTruthy();
  });

  it("renders call to action buttons on landing page", () => {
    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Start Planning Events")).toBeTruthy();
    expect(screen.getByText("Explore Event Setup")).toBeTruthy();
  });

  it("renders supported event types", () => {
    render(
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Dream Weddings")).toBeTruthy();
    expect(screen.getByText("Memorable Birthdays")).toBeTruthy();
    expect(screen.getByText("Community Gatherings")).toBeTruthy();
  });
});
