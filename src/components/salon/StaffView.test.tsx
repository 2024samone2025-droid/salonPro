import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffView from "./StaffView";
import * as authCtx from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  useMoney: () => (n: number) => `RWF ${n}`,
}));

function okJson(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

const sampleStaff = {
  id: "st1",
  name: "Jane Stylist",
  phone: "+250788000000",
  role: "stylist",
  active: true,
  availability: null,
  createdAt: "2026-01-01",
};

function setupAuth(
  opts: { canManage?: boolean; authFetch?: ReturnType<typeof vi.fn> } = {},
) {
  const authFetch = opts.authFetch ?? vi.fn(async () => okJson([sampleStaff]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(authCtx.useAuth).mockReturnValue({
    permissions: { canManageStaff: opts.canManage ?? true, staff: "full" },
    authFetch,
    salon: { id: "salon1", name: "Demo Salon" },
  } as any);
  return authFetch;
}

describe("StaffView (owner/admin, edit-only)", () => {
  it("loads staff from the API on mount", async () => {
    const authFetch = setupAuth();
    render(<StaffView />);
    expect(await screen.findByText("Jane Stylist")).toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledWith("/api/staff");
  });

  it("directs owners to Settings → Users to add staff (none created here)", async () => {
    setupAuth();
    render(<StaffView />);
    await screen.findByText("Jane Stylist");
    expect(screen.getByText(/Add team members in Settings/i)).toBeInTheDocument();
  });

  it("edits a staff member via PUT", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<StaffView />);

    // The staff card itself is the edit trigger.
    await user.click(await screen.findByText("Jane Stylist"));
    const dialog = await screen.findByRole("dialog");
    const nameInput = within(dialog).getByLabelText("Name *");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Updated");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith(
        "/api/staff",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"id":"st1"'),
        }),
      ),
    );
  });
});
