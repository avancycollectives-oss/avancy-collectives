import { NextResponse } from "next/server";
import { getOrder } from "../../../../lib/db";

export async function GET() {
  try {
    const order = await getOrder("AVN-2026-D6B8A3F0");

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const customer = order.customer || {};
    const items = Array.isArray(order.items) ? order.items : [];

    const firstName =
      String(customer.name || "Avinash")
        .trim()
        .split(/\s+/)[0] || "Avinash";

    const lastName =
      String(customer.name || "")
        .trim()
        .split(/\s+/)
        .slice(1)
        .join(" ") || "Customer";

    const payload = {
      order_id: order.id,
      order_date: new Date(order.createdAt || Date.now())
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),

      pickup_location: "Home",

      billing_customer_name: firstName,
      billing_last_name: lastName,
      billing_address: customer.address || "",
      billing_address_2: "",
      billing_city: customer.city || "",
      billing_pincode: customer.pincode || "",
      billing_state: customer.state || "",
      billing_country: "India",
      billing_email: customer.email || "",
      billing_phone: customer.phone || "",

      shipping_is_billing: true,

      order_items: items.map((item) => ({
        name: item.name || "Avancy Product",
        sku: item.id || order.id,
        units: Number(item.qty || 1),
        selling_price: Number(item.price || 0),
        discount: 0,
        tax: 0,
        hsn: "",
      })),

      payment_method:
        String(order.paymentStatus || "").toUpperCase() === "PAID"
          ? "Prepaid"
          : "COD",

      sub_total: Number(order.total || 0),

      length: 30,
      breadth: 25,
      height: 5,
      weight: 0.5,
    };

    return NextResponse.json({
      ok: true,
      preview: {
        order_id: payload.order_id,
        pickup_location: payload.pickup_location,
        payment_method: payload.payment_method,
        sub_total: payload.sub_total,
        item_count: payload.order_items.length,
        order_items: payload.order_items,
        package: {
          length: payload.length,
          breadth: payload.breadth,
          height: payload.height,
          weight: payload.weight,
        },
        customer_fields_present: {
          name: Boolean(customer.name),
          address: Boolean(customer.address),
          city: Boolean(customer.city),
          pincode: Boolean(customer.pincode),
          state: Boolean(customer.state),
          email: Boolean(customer.email),
          phone: Boolean(customer.phone),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
