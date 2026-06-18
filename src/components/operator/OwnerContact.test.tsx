import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OwnerContact from "./OwnerContact";
import * as actions from "@/app/operator/[salonId]/actions";

vi.mock("@/app/operator/[salonId]/actions", () => ({
  revealOwnerContact: vi.fn(),
}));
const mocked = vi.mocked(actions);

const props = {
  salonId: "s1",
  hasOwner: true,
  nameMasked: "J*** D***",
  emailMasked: "j***@***.com",
};

describe("OwnerContact (operator PII reveal)", () => {
  beforeEach(() => {
    mocked.revealOwnerContact.mockResolvedValue({
      name: "Jane Doe",
      email: "jane@salon.com",
    });
  });

  it("tells the operator when no owner is linked", () => {
    render(<OwnerContact {...props} hasOwner={false} />);
    expect(screen.getByText("No owner linked to this salon.")).toBeInTheDocument();
  });

  it("starts masked with a Reveal control", () => {
    render(<OwnerContact {...props} />);
    expect(screen.getByText("J*** D***")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reveal" })).toBeInTheDocument();
  });

  it("reveals the real contact through the audited server action", async () => {
    const user = userEvent.setup();
    render(<OwnerContact {...props} />);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@salon.com")).toBeInTheDocument();
    expect(mocked.revealOwnerContact).toHaveBeenCalledWith("s1");
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
  });

  it("logs exactly one reveal: hide is client-only, re-reveal reuses the cached value", async () => {
    const user = userEvent.setup();
    render(<OwnerContact {...props} />);
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    await screen.findByText("Jane Doe");
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getByText("J*** D***")).toBeInTheDocument(); // masked again
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    await screen.findByText("Jane Doe");
    // The action (which writes the REVEAL_PII audit row) ran only once.
    expect(mocked.revealOwnerContact).toHaveBeenCalledTimes(1);
  });
});
