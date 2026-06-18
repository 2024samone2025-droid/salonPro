import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DirectoryList, { type DirectoryRow } from "./DirectoryList";

const rows: DirectoryRow[] = [
  {
    id: "a",
    name: "Apex Beauty",
    subdomain: "apex",
    plan: "pro",
    status: "ACTIVE",
    ownerEmailMasked: "a***@x.com",
  },
  {
    id: "b",
    name: "Bloom Salon",
    subdomain: "bloom",
    plan: "free",
    status: "SUSPENDED",
    ownerEmailMasked: "b***@x.com",
  },
];

describe("DirectoryList (operator tenant directory)", () => {
  it("lists every salon and links each row to its operator detail page", () => {
    render(<DirectoryList rows={rows} />);
    expect(screen.getByRole("link", { name: /Apex Beauty/ })).toHaveAttribute(
      "href",
      "/operator/a",
    );
    expect(screen.getByRole("link", { name: /Bloom Salon/ })).toHaveAttribute(
      "href",
      "/operator/b",
    );
  });

  it("filters by search query (name or subdomain)", async () => {
    const user = userEvent.setup();
    render(<DirectoryList rows={rows} />);
    await user.type(screen.getByPlaceholderText(/Search name or subdomain/), "bloom");
    expect(screen.queryByText("Apex Beauty")).not.toBeInTheDocument();
    expect(screen.getByText("Bloom Salon")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    render(<DirectoryList rows={rows} />);
    await user.click(screen.getByRole("button", { name: "Suspended" }));
    expect(screen.queryByText("Apex Beauty")).not.toBeInTheDocument();
    expect(screen.getByText("Bloom Salon")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<DirectoryList rows={rows} />);
    await user.type(screen.getByPlaceholderText(/Search name or subdomain/), "zzz");
    expect(screen.getByText("No salons match.")).toBeInTheDocument();
  });
});
