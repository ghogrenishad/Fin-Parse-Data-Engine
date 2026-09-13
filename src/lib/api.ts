/**
 * Safe API client utilities to prevent "Unexpected token '<'" or "Unexpected token 'A'"
 * JSON parsing errors when running behind Vercel or cloud proxies.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL | Response,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  if (input instanceof Response) {
    response = input;
  } else {
    try {
      response = await fetch(input, init);
    } catch (networkErr: any) {
      throw new Error(
        `Network connection error: ${networkErr.message || "Failed to reach server"}. Please check your internet connection.`
      );
    }
  }

  const rawText = await response.text();
  let parsed: any = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    // Response was NOT valid JSON (e.g. Vercel 500 HTML/text "A server error has occurred")
    const snippet = rawText.slice(0, 200).trim();
    if (snippet.startsWith("A server error") || snippet.includes("FUNCTION_INVOCATION_FAILED")) {
      throw new Error(
        `Vercel Serverless Function Error (${response.status}): The server function failed to execute. Ensure SUPABASE_URL, SUPABASE_ANON_KEY, and GEMINI_API_KEY are configured in your Vercel Project Settings → Environment Variables.`
      );
    }
    if (response.status === 404) {
      throw new Error(`API endpoint not found (404). Please verify your Vercel deployment routes.`);
    }
    if (response.status >= 500) {
      throw new Error(
        `Server Error (${response.status}): ${snippet || "Internal server error occurred."}`
      );
    }
    throw new Error(`Invalid response format from server (${response.status}): ${snippet}`);
  }

  if (!response.ok && parsed && parsed.error) {
    throw new Error(parsed.error);
  }

  return parsed as T;
}
