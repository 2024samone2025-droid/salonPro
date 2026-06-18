import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import CustomersView from "./CustomersView";
import * as authCtx from "@/lib/auth-context";

// Owner/admin screens read data through useAuth().authFetch. Mock the context
// so we can hand the component a controllable fetch and assert what it calls.
vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
  useMoney: () => (n: number) => `RWF ${n}`,
}));

function okJson(data: unknown) {
  return { ok: true, json: async () => data } as unknown as Response;
}

const sampleCustomer = {
  id: "c1",
  name: "Aline K.",
  phone: "0788000000",
  notes: "",
  appointments: [],
};

function setupAuth(
  opts: { customers?: "full" | "view"; authFetch?: ReturnType<typeof vi.fn> } = {},
) {
  const authFetch =
    opts.authFetch ?? vi.fn(async () => okJson([sampleCustomer]));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(authCtx.useAuth).mockReturnValue({
    permissions: { customers: opts.customers ?? "full" },
    authFetch,
  } as any);
  return authFetch;
}

describe("CustomersView (owner/admin CRUD)", () => {
  it("loads customers from the API on mount (real data, not decoration)", async () => {
    const authFetch = setupAuth();
    render(<CustomersView />);
    expect(await screen.findByText("Aline K.")).toBeInTheDocument();
    expect(authFetch).toHaveBeenCalledWith("/api/customers");
  });

  it("scopes the fetch to the search query", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<CustomersView />);
    await screen.findByText("Aline K.");
    await user.type(screen.getByPlaceholderText("Search by name or phone..."), "ann");
    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith("/api/customers?q=ann"),
    );
  });

  it("creates a customer with the entered name + phone via POST", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<CustomersView />);
    await screen.findByText("Aline K.");

    await user.click(screen.getByRole("button", { name: /Add customer/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name *"), "Bea M.");
    await user.type(within(dialog).getByLabelText("Phone *"), "0722111222");
    await user.click(within(dialog).getByRole("button", { name: /Add customer/ }));

    await waitFor(() =>
      expect(authFetch).toHaveBeenCalledWith(
        "/api/customers",
        expect.objectContaining({
          method: "POST",
          // Phone is normalized to Rwanda E.164 (07… → +2507…) before saving.
          body: JSON.stringify({ name: "Bea M.", phone: "+250722111222", notes: "" }),
        }),
      ),
    );
  });

  it("blocks an empty create and warns instead of POSTing", async () => {
    const authFetch = setupAuth();
    const user = userEvent.setup();
    render(<CustomersView />);
    await screen.findByText("Aline K.");

    await user.click(screen.getByRole("button", { name: /Add customer/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Add customer/ }));

    expect(toast.error).toHaveBeenCalledWith("Customer name is required");
    const posts = authFetch.mock.calls.filter(
      (c: unknown[]) => (c[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(posts).toHaveLength(0);
  });

  it("hides the Add control for view-only permission", async () => {
    setupAuth({ customers: "view" });
    render(<CustomersView />);
    await screen.findByText("Aline K.");
    expect(
      screen.queryByRole("button", { name: /Add customer/ }),
    ).not.toBeInTheDocument();
  });
});
