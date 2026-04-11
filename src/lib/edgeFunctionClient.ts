import { supabase } from '@/integrations/supabase/client';

export async function callEdgeFunction(functionName: string, payload: any) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  let response: Response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(payload),
      }
    );
  } catch (networkErr) {
    throw new Error("Network error. Please check your connection and try again.");
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned an unexpected response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }

  return data;
}
