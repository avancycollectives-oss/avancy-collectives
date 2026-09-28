const SHIPROCKET_BASE =
  "https://apiv2.shiprocket.in/v1/external";

async function getShiprocketToken() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket credentials are missing");
  }

  const response = await fetch(
    `${SHIPROCKET_BASE}/auth/login`,
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

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(
      data.message ||
      data.error ||
      "Shiprocket authentication failed"
    );
  }

  return data.token;
}

export async function shiprocketRequest(path, options = {}) {
  const token = await getShiprocketToken();

  const response = await fetch(
    `${SHIPROCKET_BASE}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Shiprocket request failed with status ${response.status}`
    );
  }

  return data;
}

export async function getShiprocketPickupLocations() {
  return shiprocketRequest(
    "/settings/company/pickup",
    {
      method: "GET",
    }
  );
}

export async function getShiprocketShippingRates({
  pickupPostcode,
  deliveryPostcode,
  weight,
  cod = 0,
  declaredValue = 0,
  length = 0,
  breadth = 0,
  height = 0,
}) {
  const params = new URLSearchParams({
    pickup_postcode: String(pickupPostcode || "").trim(),
    delivery_postcode: String(deliveryPostcode || "").trim(),
    weight: String(Number(weight) || 0),
    cod: String(Number(cod) ? 1 : 0),
  });

  if (Number(declaredValue) > 0) {
    params.set("declared_value", String(Number(declaredValue)));
  }

  if (Number(length) > 0) {
    params.set("length", String(Number(length)));
  }

  if (Number(breadth) > 0) {
    params.set("breadth", String(Number(breadth)));
  }

  if (Number(height) > 0) {
    params.set("height", String(Number(height)));
  }

  return shiprocketRequest(
    `/courier/serviceability/?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function createShiprocketOrder(payload) {
  return shiprocketRequest("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function assignShiprocketAwb({
  shipmentId,
  courierId = "",
  status = "",
}) {
  return shiprocketRequest("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: shipmentId,
      ...(courierId ? { courier_id: courierId } : {}),
      ...(status ? { status } : {}),
    }),
  });
}

export async function generateShiprocketPickup(payload) {
  return shiprocketRequest("/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
