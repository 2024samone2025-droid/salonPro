import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import ServicesView from "./ServicesView";
import * as authCtx from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  useMoney: () => (n: number) => `RWF ${n}`,
}));

function okJson(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

const sampleService = {
  id: "s1",
  name: "Box Braids",
  price: 15000,
  duration: 120,
  active: true,
  category: "Hair",
  description: "",
  onlineBookable: true,
  createdAt: "2026-01-01",
};

function setupAuth(
  opts: { canManage?: boolean; authFetch?: ReturnType<typeof vi.fn> } = {},
) {
  const authFetch = opts.authFetch ?? vi.fn(async () => okJson([sampleService]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(authCtx.useAuth).mockReturnValue({
    permissions: { canManageServices: opts.canManage ?? true },
    authFetch,
  } as any);
  return authFetch;
}

function postCalls(authFetch: ReturnType<typeof vi.fn>) {
  return authFetch.mock.calls.filter(
    (c: unknown[]) => (c[1] as RequestInit | undefined)?.method === "POST",
  );
}

describe("ServicesView (owner/admin CRUD)", () => {
  it("loads services from the API on mount", async () => {
    const authFetch = setupAuth();
    render(<ServicesView />);
    expect(await screen.findByText("Box Braids")).toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledWith("/api/services");
  });

  it("creates a service via POST with the entered fields", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<ServicesView />);
    await screen.findByText("Box Braids");

    await user.click(screen.getByRole("button", { name: "Add Service" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Service Name *"), "Deluxe Wash");
    await user.type(within(dialog).getByLabelText("Price (RWF) *"), "5000");
    await user.type(within(dialog).getByLabelText("Duration (min) *"), "30");
    await user.click(within(dialog).getByRole("button", { name: "Add Service" }));

    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith(
        "/api/services",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Deluxe Wash"'),
        }),
      ),
    );
  });

  it("blocks a create with no name and warns instead of POSTing", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<ServicesView />);
    await screen.findByText("Box Braids");
    await user.click(screen.getByRole("button", { name: "Add Service" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add Service" }));
    expect(toast.error).toHaveBeenCalledWith("Service name is required");
    expect(postCalls(authFetch)).toHaveLength(0);
  });

  it("hides management controls without canManageServices", async () => {
    setupAuth({ canManage: false });
    render(<ServicesView />);
    await screen.findByText("Box Braids");
    expect(
      screen.queryByRole("button", { name: "Add Service" }),
    ).not.toBeInTheDocument();
  });
});
