import { getProduct } from "./db.js";
import {
  getShiprocketPickupLocations,
  getShiprocketShippingRates,
} from "./shiprocket.js";

const CUSTOM_PRICE = 799;
const FREE_SHIPPING_THRESHOLD = 999;

function clean(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function decimal(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function validPincode(value) {
  return /^\d{6}$/.test(clean(value));
}

function extractPickupLocation(data) {
  const locations =
    data?.data?.shipping_address ||
    data?.shipping_address ||
    data?.data ||
    [];

  if (!Array.isArray(locations) || !locations.length) {
    throw new Error("No Shiprocket pickup location is configured.");
  }

  const location =
    locations.find(
      item =>
        clean(item?.pickup_location).toLowerCase() === "home"
    ) || locations[0];

  const pincode = clean(
    location?.pin_code ||
    location?.pincode ||
    location?.postcode
  );

  if (!validPincode(pincode)) {
    throw new Error(
      "Shiprocket pickup location does not have a valid 6-digit pincode."
    );
  }

  return {
    id: location?.id || "",
    name: clean(location?.pickup_location || location?.name),
    pincode,
  };
}

function extractCourierRates(data) {
  const couriers =
    data?.data?.available_courier_companies ||
    data?.available_courier_companies ||
    [];

  if (!Array.isArray(couriers)) {
    return [];
  }

  return couriers
    .map(courier => {
      const rate =
        decimal(courier?.rate) ||
        decimal(courier?.freight_charge) ||
        decimal(courier?.total_shipping_charge);

      return {
        id: courier?.courier_company_id || courier?.courier_id || "",
        name: clean(
          courier?.courier_name ||
          courier?.courier_company_name ||
          courier?.name
        ),
        rate: Math.ceil(rate),
        etd: clean(
          courier?.etd ||
          courier?.estimated_delivery_days ||
          courier?.estimated_delivery
        ),
      };
    })
    .filter(courier => courier.rate > 0);
}

function chooseShippingRate(data) {
  const rates = extractCourierRates(data);

  if (!rates.length) {
    throw new Error(
      "Shiprocket returned no available courier rates for this delivery."
    );
  }

  rates.sort((a, b) => a.rate - b.rate);

  return rates[0];
}

export async function calculateOrderPricing({
  items,
  customer,
  paymentMethod = "COD",
}) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Your cart is empty.");
  }

  const deliveryPincode = clean(customer?.pincode);

  if (!validPincode(deliveryPincode)) {
    throw new Error("Please enter a valid 6-digit delivery pincode.");
  }

  const normalizedItems = [];

  let subtotal = 0;
  let gstAmount = 0;
  let totalWeight = 0;

  let packageLength = 0;
  let packageBreadth = 0;
  let packageHeight = 0;

  for (const item of items) {
    if (item?.custom) {
      const qty = Math.max(
        1,
        Math.min(5, Number(item.qty) || 1)
      );

      const price = CUSTOM_PRICE;

      normalizedItems.push({
        custom: true,
        id: clean(item.id) || `custom-${Date.now()}`,
        name: clean(item.name) || "CUSTOM PRINT",
        price,
        size: clean(item.size) || "M",
        qty,
        design: item.design || {},
        image: clean(item.image),
        art: "CUSTOM",
        gstRate: 0,
        hsnCode: "",
        priceIncludesGst: true,
      });

      subtotal += price * qty;

      /*
       * Custom orders currently have no Admin GST configuration.
       * Do not invent a tax rate here.
       */
      continue;
    }

    const product = await getProduct(clean(item?.id));

    if (!product || product.active === false) {
      throw new Error(
        `${item?.name || item?.id || "Product"} is no longer available.`
      );
    }

    const size = clean(item?.size);

    if (!product.sizes.includes(size)) {
      throw new Error(
        `Size ${size || "—"} is not available for ${product.name}.`
      );
    }

    const qty = Math.max(
      1,
      Math.min(20, Number(item.qty) || 1)
    );

    const availableStock = Number(
      product.stock?.[size] || 0
    );

    if (availableStock < qty) {
      throw new Error(
        `Not enough stock for ${product.name} / ${size}.`
      );
    }

    const linePrice = money(product.price) * qty;

    /*
     * Product GST is intentionally disabled at checkout for now.
     * Admin GST fields remain available for future configuration.
     */
    subtotal += linePrice;

    const shippingWeight = decimal(product.shippingWeight);
    const shippingLength = decimal(product.shippingLength);
    const shippingBreadth = decimal(product.shippingBreadth);
    const shippingHeight = decimal(product.shippingHeight);

    if (
      shippingWeight <= 0 ||
      shippingLength <= 0 ||
      shippingBreadth <= 0 ||
      shippingHeight <= 0
    ) {
      throw new Error(
        `Shipping package measurements are missing for "${product.name}". ` +
        "Enter the packed weight and dimensions in Admin → Products."
      );
    }

    totalWeight += shippingWeight * qty;

    packageLength = Math.max(packageLength, shippingLength);
    packageBreadth = Math.max(packageBreadth, shippingBreadth);
    packageHeight = Math.max(packageHeight, shippingHeight);

    normalizedItems.push({
      id: product.id,
      name: product.name,
      price: money(product.price),
      size,
      qty,
      image: product.image || "",
      art: product.art || "",
      gstRate: decimal(product.gstRate),
      hsnCode: clean(product.hsnCode),
      priceIncludesGst: Boolean(product.priceIncludesGst),
    });
  }

  /*
   * Custom products do not yet have a configured physical package.
   * Therefore shipping cannot safely be calculated for a cart that
   * contains only custom items until their packed dimensions are defined.
   */
  const hasCustomItems = normalizedItems.some(item => item.custom);
  const hasRegularItems = normalizedItems.some(item => !item.custom);

  if (hasCustomItems && !hasRegularItems) {
    throw new Error(
      "Shipping package measurements for Custom orders must be configured before shipping can be calculated."
    );
  }

  if (hasCustomItems && hasRegularItems) {
    throw new Error(
      "Custom and regular products cannot currently be combined in one shipment."
    );
  }

  let shippingAmount = 0;
  let selectedCourier = null;
  let pickupPincode = "";

  if (subtotal < FREE_SHIPPING_THRESHOLD) {
    const pickupData = await getShiprocketPickupLocations();
    pickupPincode = extractPickupLocation(pickupData).pincode;
  }

  if (subtotal < FREE_SHIPPING_THRESHOLD) {
    const pickup = { pincode: pickupPincode };

    const rateData = await getShiprocketShippingRates({
      pickupPostcode: pickup.pincode,
      deliveryPostcode: deliveryPincode,
      weight: Math.max(0.001, Number(totalWeight.toFixed(3))),
      cod:
        String(paymentMethod).toUpperCase() === "COD"
          ? 1
          : 0,
      declaredValue: subtotal,
      length: Math.max(1, Math.ceil(packageLength)),
      breadth: Math.max(1, Math.ceil(packageBreadth)),
      height: Math.max(1, Math.ceil(packageHeight)),
    });

    selectedCourier = chooseShippingRate(rateData);
    shippingAmount = selectedCourier.rate;
  }

  /*
   * Product GST is intentionally disabled for checkout.
   * The customer total is product subtotal + delivery only.
   */
  const total = subtotal + shippingAmount;

  return {
    items: normalizedItems,
    subtotal,
    gstAmount: 0,
    shippingAmount,
    total,
    freeShipping:
      subtotal >= FREE_SHIPPING_THRESHOLD,
    package: {
      weight: Number(totalWeight.toFixed(3)),
      length: Math.ceil(packageLength),
      breadth: Math.ceil(packageBreadth),
      height: Math.ceil(packageHeight),
    },
    shippingCourier: selectedCourier?.name || "",
    shippingCourierId: selectedCourier?.id || "",
    shippingRate: selectedCourier?.rate || 0,
    shippingEtd: selectedCourier?.etd || "",
    pickupPincode,
  };
}
