export function parseArgoCdErrorBody(bodyText: string): string | undefined {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Use a bounded raw body below.
  }

  return trimmed.slice(0, 300);
}

export function createArgoCdApiError(status: number, bodyText: string): Error {
  const fromBody = parseArgoCdErrorBody(bodyText);

  if (status === 401 || status === 403) {
    return new Error(fromBody ?? "Argo CD rejected the token. Check the token in Preferences.");
  }

  if (status === 404) {
    return new Error(fromBody ?? "Argo CD API path was not found.");
  }

  return new Error(fromBody ?? `Argo CD API request failed (${status}).`);
}
