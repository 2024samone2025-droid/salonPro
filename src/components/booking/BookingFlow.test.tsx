import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BookingFlow from "./BookingFlow";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

vi.mock("@/lib/fetch-timeout", () => ({
  fetchWithTimeout: vi.fn(),
  TimeoutError: class TimeoutError extends Error {},
}));
const mockedFetch = vi.mocked(fetchWithTimeout);

const bookingInfo = {
  salon: { name: "Glow Studio", logoUrl: null },
  currency: "RWF",
  services: [{ id: "sv1", name: "Manicure", price: 5000, duration: 30, description: "" }],
  staff: [{ id: "st1", name: "Aline" }],
};

describe("BookingFlow (public booking)", () => {
  it("loads the salon's public booking info and lists its services", async () => {
    mockedFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => bookingInfo,
    } as unknown as Response);

    render(<BookingFlow subdomain="glow" />);

    expect(await screen.findByText("Manicure")).toBeInTheDocument();
    expect(screen.getByText("Glow Studio")).toBeInTheDocument();
    expect(mockedFetch).toHaveBeenCalledWith("/api/public/booking/glow");
  });

  it("shows a not-found state for an unknown salon (404)", async () => {
    mockedFetch.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({}),
    } as unknown as Response);

    render(<BookingFlow subdomain="nope" />);

    expect(await screen.findByText("Salon not found")).toBeInTheDocument();
    expect(screen.queryByText("Manicure")).not.toBeInTheDocument();
  });
});
