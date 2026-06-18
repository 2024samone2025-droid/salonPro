import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UnifiedLogin from "./UnifiedLogin";
import * as authCtx from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({ useAuth: vi.fn() }));

function mockAuth(login = vi.fn(async () => ({ success: true }))) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(authCtx.useAuth).mockReturnValue({ user: null, loading: false, login } as any);
  return login;
}

describe("UnifiedLogin (auth gate)", () => {
  it("on a tenant host, signs staff in through the auth-context login()", async () => {
    const login = mockAuth();
    const user = userEvent.setup();
    render(<UnifiedLogin subdomain="apex" />); // subdomain present = staff/tenant host
    await user.type(screen.getByLabelText("Email"), "stylist@salon.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(login).toHaveBeenCalledWith("stylist@salon.com", "secret123");
  });

  it("on apex, owners authenticate via POST /api/owner/login", async () => {
    mockAuth();
    const fetchMock = vi.fn(async (url: unknown) => {
      if (typeof url === "string" && url.includes("/api/owner/login")) {
        return { ok: true, json: async () => ({ salons: [] }) } as unknown as Response;
      }
      // /api/owner/me + /api/staff/me on mount fall through to the form.
      return { ok: false, json: async () => ({}) } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<UnifiedLogin subdomain={null} />); // apex = owner login
    await user.type(screen.getByLabelText("Email"), "owner@apex.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/owner/login",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("owner@apex.com"),
        }),
      ),
    );
  });
});
