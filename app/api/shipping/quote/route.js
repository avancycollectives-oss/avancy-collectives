import { NextResponse } from "next/server";
import { calculateOrderPricing } from "../../../../lib/order-pricing.js";
import { getFreeShippingSlotsRemaining } from "../../../../lib/db.js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();

    if (
      !Array.isArray(body?.items) ||
      !body.items.length ||
      !body?.customer?.pincode
    ) {
      return NextResponse.json(
        { error: "Items and a valid delivery pincode are required." },
        { status: 400 }
      );
    }

    const pricing = await calculateOrderPricing({
      items: body.items,
      customer: body.customer,
      paymentMethod: body.paymentMethod || "COD",
    });

    const firstFiveRemaining = await getFreeShippingSlotsRemaining();
    const firstFiveFree = firstFiveRemaining > 0;

    return NextResponse.json({
      ok: true,
      subtotal: pricing.subtotal,
      gstAmount: 0,
      shippingAmount: firstFiveFree ? 0 : pricing.shippingAmount,
      total: firstFiveFree ? pricing.subtotal : pricing.total,
      freeShipping: firstFiveFree || pricing.freeShipping,
      firstFiveFree,
      firstFiveRemaining,
      shippingCourier: pricing.shippingCourier,
      shippingCourierId: pricing.shippingCourierId,
      shippingRate: pricing.shippingRate,
      shippingEtd: pricing.shippingEtd,
    });
  } catch (error) {
    console.error("Shipping quote error:", error);

    return NextResponse.json(
      { error: error?.message || "Unable to calculate shipping." },
      { status: 400 }
    );
  }
}
