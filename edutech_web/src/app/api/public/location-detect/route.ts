import { NextRequest, NextResponse } from "next/server";

const PROVIDER_ENDPOINT = (process.env.PUBLIC_IP_GEO_ENDPOINT ?? "").trim();
const PROVIDER_AUTH_HEADER = (process.env.PUBLIC_IP_GEO_AUTH_HEADER ?? "").trim();
const PROVIDER_AUTH_VALUE = (process.env.PUBLIC_IP_GEO_AUTH_VALUE ?? "").trim();
const PROVIDER_FIELD_MAP_JSON = (process.env.PUBLIC_IP_GEO_FIELD_MAP_JSON ?? "").trim();

type FieldMap = {
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  timezone?: string;
};

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "";
  }

  return request.headers.get("x-real-ip")?.trim() ?? "";
}

function getNestedValue(source: unknown, path: string) {
  if (!path) {
    return "";
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return "";
    }

    return (current as Record<string, unknown>)[segment];
  }, source);
}

function toText(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function getFieldMap(): FieldMap {
  if (!PROVIDER_FIELD_MAP_JSON) {
    return {};
  }

  try {
    const parsed = JSON.parse(PROVIDER_FIELD_MAP_JSON) as FieldMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const fieldMap = getFieldMap();

  if (!PROVIDER_ENDPOINT) {
    return NextResponse.json({
      available: false,
      configured: false,
      detected: null,
    });
  }

  const clientIp = getClientIp(request);
  const endpoint = PROVIDER_ENDPOINT.includes("{ip}")
    ? PROVIDER_ENDPOINT.replace("{ip}", encodeURIComponent(clientIp))
    : PROVIDER_ENDPOINT;

  const headers: HeadersInit = {};
  if (PROVIDER_AUTH_HEADER && PROVIDER_AUTH_VALUE) {
    headers[PROVIDER_AUTH_HEADER] = PROVIDER_AUTH_VALUE;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        available: false,
        configured: true,
        detected: null,
      });
    }

    const payload = (await response.json()) as unknown;
    const detected = {
      country: toText(getNestedValue(payload, fieldMap.country ?? "")),
      state: toText(getNestedValue(payload, fieldMap.state ?? "")),
      city: toText(getNestedValue(payload, fieldMap.city ?? "")),
      pincode: toText(getNestedValue(payload, fieldMap.pincode ?? "")),
      timezone: toText(getNestedValue(payload, fieldMap.timezone ?? "")),
      detectionSource: "ip_provider",
    };

    const available = Boolean(
      detected.country || detected.state || detected.city || detected.pincode || detected.timezone,
    );

    return NextResponse.json({
      available,
      configured: true,
      detected: available ? detected : null,
    });
  } catch {
    return NextResponse.json({
      available: false,
      configured: true,
      detected: null,
    });
  }
}
