const SHIPROCKET_BASE =
  "https://apiv2.shiprocket.in/v1/external";

const TOKEN_CACHE_MS = 8 * 60 * 60 * 1000;
const AUTH_FAILURE_COOLDOWN_MS = 60 * 1000;

const shiprocketState = globalThis.__avancyShiprocketState || {
  token: null,
  tokenExpiresAt: 0,
  loginPromise: null,
  authFailureUntil: 0,
};

globalThis.__avancyShiprocketState = shiprocketState;

function clearShiprocketToken() {
  shiprocketState.token = null;
  shiprocketState.tokenExpiresAt = 0;
}

async function getShiprocketToken({ forceRefresh = false } = {}) {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket credentials are missing");
  }

  const now = Date.now();

  if (
    !forceRefresh &&
    shiprocketState.token &&
    now < shiprocketState.tokenExpiresAt
  ) {
    return shiprocketState.token;
  }

  if (shiprocketState.loginPromise) {
    return shiprocketState.loginPromise;
  }

  if (
    !forceRefresh &&
    now < shiprocketState.authFailureUntil
  ) {
    throw new Error(
      "Shiprocket authentication is temporarily unavailable. Please try again shortly."
    );
  }

  shiprocketState.loginPromise = (async () => {
    try {
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

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || !data.token) {
        shiprocketState.authFailureUntil =
          Date.now() + AUTH_FAILURE_COOLDOWN_MS;

        clearShiprocketToken();

        throw new Error(
          data.message ||
          data.error ||
          `Shiprocket authentication failed with status ${response.status}`
        );
      }

      shiprocketState.token = data.token;
      shiprocketState.tokenExpiresAt =
        Date.now() + TOKEN_CACHE_MS;

      shiprocketState.authFailureUntil = 0;

      return data.token;
    } finally {
      shiprocketState.loginPromise = null;
    }
  })();

  return shiprocketState.loginPromise;
}

async function performShiprocketRequest(path, options, token) {
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

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  return {
    response,
    data,
  };
}

export async function shiprocketRequest(path, options = {}) {
  let token = await getShiprocketToken();

  let result = await performShiprocketRequest(
    path,
    options,
    token
  );

  /*
   * If Shiprocket says the token is unauthorized, invalidate
   * the cached token and perform exactly one controlled refresh.
   */
  if (result.response.status === 401) {
    clearShiprocketToken();

    token = await getShiprocketToken({
      forceRefresh: true,
    });

    result = await performShiprocketRequest(
      path,
      options,
      token
    );
  }

  const { response, data } = result;

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
