import { NextResponse } from "next/server";

export async function GET() {
  try {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Shiprocket credentials are missing" },
        { status: 500 }
      );
    }

    const authResponse = await fetch(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
      }
    );

    const authData = await authResponse.json();

    if (!authResponse.ok || !authData.token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Shiprocket authentication failed",
          status: authResponse.status,
        },
        { status: 502 }
      );
    }

    const response = await fetch(
      "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not retrieve Shiprocket pickup locations",
          status: response.status,
          message: data.message || data.error || "Unknown Shiprocket error",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      pickupLocations: data.data || data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not connect to Shiprocket",
        message: error.message,
      },
      { status: 502 }
    );
  }
}
