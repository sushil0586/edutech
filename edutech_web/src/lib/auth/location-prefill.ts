export type LocationPrefillResult = {
  available: boolean;
  configured: boolean;
  detected: {
    country: string;
    state: string;
    city: string;
    pincode: string;
    timezone: string;
    detectionSource: string;
  } | null;
};

export async function fetchLocationPrefill(): Promise<LocationPrefillResult> {
  const response = await fetch("/api/public/location-detect", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      available: false,
      configured: false,
      detected: null,
    };
  }

  return (await response.json()) as LocationPrefillResult;
}
