import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusActions from "./StatusActions";
import * as actions from "@/app/operator/[salonId]/actions";

vi.mock("@/app/operator/[salonId]/actions", () => ({
  setSalonStatus: vi.fn(),
}));
const mocked = vi.mocked(actions);

describe("StatusActions (operator suspend/reactivate)", () => {
  beforeEach(() => {
    mocked.setSalonStatus.mockResolvedValue({ ok: true });
  });

  it("offers Suspend for an active salon and Reactivate for a suspended one", () => {
    const { unmount } = render(<StatusActions salonId="s1" status="ACTIVE" />);
    expect(screen.getByRole("button", { name: "Suspend salon" })).toBeInTheDocument();
    unmount();
    render(<StatusActions salonId="s1" status="SUSPENDED" />);
    expect(screen.getByRole("button", { name: "Reactivate salon" })).toBeInTheDocument();
  });

  it("refuses to call the action without a reason (guards the audit log)", async () => {
    const user = userEvent.setup();
    render(<StatusActions salonId="s1" status="ACTIVE" />);
    await user.click(screen.getByRole("button", { name: "Suspend salon" }));
    await user.click(screen.getByRole("button", { name: "Confirm suspend" }));
    expect(await screen.findByText("A reason is required.")).toBeInTheDocument();
    expect(mocked.setSalonStatus).not.toHaveBeenCalled();
  });

  it("suspends with the typed reason through the server action", async () => {
    const user = userEvent.setup();
    render(<StatusActions salonId="s1" status="ACTIVE" />);
    await user.click(screen.getByRole("button", { name: "Suspend salon" }));
    await user.type(screen.getByRole("textbox"), "non-payment");
    await user.click(screen.getByRole("button", { name: "Confirm suspend" }));
    await waitFor(() =>
      expect(mocked.setSalonStatus).toHaveBeenCalledWith("s1", "SUSPENDED", "non-payment"),
    );
  });

  it("surfaces a server error instead of failing silently", async () => {
    mocked.setSalonStatus.mockResolvedValue({ ok: false, error: "Could not suspend" });
    const user = userEvent.setup();
    render(<StatusActions salonId="s1" status="ACTIVE" />);
    await user.click(screen.getByRole("button", { name: "Suspend salon" }));
    await user.type(screen.getByRole("textbox"), "non-payment");
    await user.click(screen.getByRole("button", { name: "Confirm suspend" }));
    expect(await screen.findByText("Could not suspend")).toBeInTheDocument();
  });
});
