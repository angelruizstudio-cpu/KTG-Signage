export function getErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? error.message : null;
    const maybeDetails = "details" in error ? error.details : null;
    const maybeHint = "hint" in error ? error.hint : null;

    return [maybeMessage, maybeDetails, maybeHint]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");
  }

  return fallback;
}
