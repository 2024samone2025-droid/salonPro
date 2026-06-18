import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import BusinessHoursEditor from "./BusinessHoursEditor"
import type { BusinessHours } from "@/lib/salon-settings"

const defaultHours: BusinessHours = {
  "0": { open: "09:00", close: "17:00", closed: true }, // Sunday: closed
  "1": { open: "08:00", close: "18:00", closed: false }, // Monday
  "2": { open: "08:00", close: "18:00", closed: false },
  "3": { open: "08:00", close: "18:00", closed: false },
  "4": { open: "08:00", close: "18:00", closed: false },
  "5": { open: "08:00", close: "20:00", closed: false }, // Friday
  "6": { open: "10:00", close: "16:00", closed: false }, // Saturday
}

describe("BusinessHoursEditor", () => {
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    onChange = vi.fn()
  })

  it("renders all 7 day labels", () => {
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    expect(screen.getByText("Sunday")).toBeInTheDocument()
    expect(screen.getByText("Monday")).toBeInTheDocument()
    expect(screen.getByText("Tuesday")).toBeInTheDocument()
    expect(screen.getByText("Wednesday")).toBeInTheDocument()
    expect(screen.getByText("Thursday")).toBeInTheDocument()
    expect(screen.getByText("Friday")).toBeInTheDocument()
    expect(screen.getByText("Saturday")).toBeInTheDocument()
  })

  it("shows 'Closed' for a closed day", () => {
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Sunday (index 0) is closed in test data
    expect(screen.getByText("Closed")).toBeInTheDocument()
  })

  it("shows formatted time range for each open day", () => {
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Multiple rows (Mon–Fri) show "8:00 AM" — expect at least 3 matches
    expect(screen.getAllByText(/8:00 AM/).length).toBeGreaterThanOrEqual(3)
    // Saturday shows "10:00 AM"
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument()
  })

  it("opens the dialog when a day is clicked", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByText("Monday"))
    // After clicking Monday, the dialog should appear with "Monday" as the title
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("shows the toggle switch and time inputs in the dialog", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByText("Monday"))
    const dialog = screen.getByRole("dialog")

    // Toggle for open/closed
    expect(
      within(dialog).getByLabelText("Open this day"),
    ).toBeInTheDocument()

    // Time inputs (shown because Monday is open)
    expect(within(dialog).getByLabelText("Opens")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Closes")).toBeInTheDocument()
  })

  it("toggling an open day closed calls onChange with closed: true", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Monday (key "1") is open — toggle it closed
    await user.click(screen.getByText("Monday"))
    await user.click(screen.getByLabelText("Open this day"))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        "1": expect.objectContaining({ closed: true }),
      }),
    )
  })

  it("toggling a closed day open calls onChange with closed: false", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Sunday (key "0") is closed — toggle it open
    await user.click(screen.getByText("Sunday"))
    await user.click(screen.getByLabelText("Open this day"))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        "0": expect.objectContaining({ closed: false }),
      }),
    )
  })

  it("changing the opens time calls onChange with the new open value", async () => {
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Click Monday to open dialog
    await userEvent.setup().click(screen.getByText("Monday"))
    const opensInput = screen.getByLabelText("Opens")

    // Use fireEvent.change for reliable value setting on time inputs
    fireEvent.change(opensInput, { target: { value: "09:00" } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        "1": expect.objectContaining({ open: "09:00" }),
      }),
    )
  })

  it("clicking 'Apply to all' copies the edited day's hours to every day", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Edit Friday (key "5": 08:00-20:00)
    await user.click(screen.getByText("Friday"))
    await user.click(screen.getByText("Apply these hours to every day"))

    // applyToAll copies open/close only — it preserves each day's existing closed flag.
    // Sunday ("0") was closed: true and stays closed.
    expect(onChange).toHaveBeenCalledWith({
      "0": { open: "08:00", close: "20:00", closed: true },
      "1": { open: "08:00", close: "20:00", closed: false },
      "2": { open: "08:00", close: "20:00", closed: false },
      "3": { open: "08:00", close: "20:00", closed: false },
      "4": { open: "08:00", close: "20:00", closed: false },
      "5": { open: "08:00", close: "20:00", closed: false },
      "6": { open: "08:00", close: "20:00", closed: false },
    })
    expect(toast.success).toHaveBeenCalledWith(
      "Hours applied to every day",
    )
  })

  it("calls 'Done' closes the dialog", async () => {
    const user = userEvent.setup()
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByText("Monday"))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByText("Done"))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("uses the slotIntervalMinutes for the time input step attribute", async () => {
    const user = userEvent.setup()
    // 60 min interval → step = 3600 seconds
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={60}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByText("Monday"))
    const opensInput = screen.getByLabelText("Opens") as HTMLInputElement
    expect(opensInput.step).toBe("3600")
  })

  it("shows Friday's time range with 12h format (8:00 AM – 8:00 PM)", () => {
    render(
      <BusinessHoursEditor
        value={defaultHours}
        slotIntervalMinutes={30}
        onChange={onChange}
      />,
    )

    // Friday: 08:00 - 20:00 → "8:00 AM – 8:00 PM"
    expect(screen.getByText(/8:00 PM/)).toBeInTheDocument()
  })
})
