import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BillingActions from "./BillingActions";
import * as actions from "@/app/operator/[salonId]/actions";

// Mock the server actions: we're verifying the component *calls them correctly*,
// not the DB transaction (that's the deferred integration layer).
vi.mock("@/app/operator/[salonId]/actions", () => ({
  recordBillingPayment: vi.fn(),
  changeSalonPlan: vi.fn(),
  setSubscriptionStatus: vi.fn(),
}));

const mocked = vi.mocked(actions);

function renderPanel() {
  return render(
    <BillingActions
      salonId="s1"
      currentPlan="free"
      currentStatus="ACTIVE"
      expectedAmount={15000}
    />,
  );
}

describe("BillingActions (operator billing)", () => {
  beforeEach(() => {
    mocked.recordBillingPayment.mockResolvedValue({ ok: true });
    mocked.changeSalonPlan.mockResolvedValue({ ok: true });
    mocked.setSubscriptionStatus.mockResolvedValue({ ok: true });
  });

  it("renders the three billing actions", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Record payment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set status" })).toBeInTheDocument();
  });

  it("records a payment with the entered amount (real wiring, not decoration)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    const amount = within(dialog).getByLabelText("Amount (RWF)");
    await user.clear(amount); // field pre-fills with the Pro price
    await user.type(amount, "15000");
    await user.click(within(dialog).getByRole("button", { name: "Record payment" }));

    await waitFor(() =>
      expect(mocked.recordBillingPayment).toHaveBeenCalledWith("s1", {
        amount: 15000,
        method: "MTN MoMo",
        reference: "",
        paidAt: undefined,
      }),
    );
  });

  it("soft-warns and switches to 'Record anyway' when the amount isn't the Pro price", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    const amount = within(dialog).getByLabelText("Amount (RWF)");
    await user.clear(amount);
    await user.type(amount, "9000");

    expect(within(dialog).getByText(/Differs from the/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Record anyway" })).toBeInTheDocument();
  });

  it("surfaces the server error instead of failing silently", async () => {
    mocked.recordBillingPayment.mockResolvedValue({
      ok: false,
      error: "Amount must be positive",
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    const amount = within(dialog).getByLabelText("Amount (RWF)");
    await user.clear(amount);
    await user.type(amount, "0");
    // 0 ≠ the pre-filled Pro price, so the submit soft-warns ("Record anyway").
    await user.click(within(dialog).getByRole("button", { name: "Record anyway" }));

    expect(await screen.findByText("Amount must be positive")).toBeInTheDocument();
    // On error the dialog stays open so the operator can correct it.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("changes plan with a reason through the real server action", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Change plan" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Reason"), "comp to pro");
    await user.click(within(dialog).getByRole("button", { name: "Change plan" }));

    await waitFor(() =>
      // currentPlan="free" → the dialog defaults the target to "pro".
      expect(mocked.changeSalonPlan).toHaveBeenCalledWith("s1", "pro", "comp to pro"),
    );
  });
});
