import { describe, expect, it } from "vitest";
import { formatDuration } from "../audio/tts";
import { errorMessage } from "../services/api";

describe("formatDuration", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(600)).toBe("10:00");
  });
});

describe("errorMessage", () => {
  it("extracts backend detail", () => {
    const err = { response: { data: { detail: "Invalid discussion ID" } } };
    expect(errorMessage(err)).toBe("Invalid discussion ID");
  });

  it("falls back to message", () => {
    expect(errorMessage({ message: "Network Error" })).toBe("Network Error");
  });

  it("uses fallback for unknown errors", () => {
    expect(errorMessage(null)).toBe("Something went wrong");
    expect(errorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });
});