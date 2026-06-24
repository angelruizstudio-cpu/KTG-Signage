export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    return ["message", "details", "hint"]
      .map((key) => record[key])
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ") || fallback;
  }

  return fallback;
}
