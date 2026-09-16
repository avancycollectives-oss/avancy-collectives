import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../lib/auth";
import {
  getOrder,
  getProduct,
  updateShiprocketData,
} from "../../../../../../lib/db";
import { createShiprocketOrder } from "../../../../../../lib/shiprocket";

export const dynamic = "force-dynamic";

function clean(value) {
  return String(value || "").trim();
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req, { params }) {
  const c = await cookies();

  if (!(await validSession(c.get("avancy_admin")?.value))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.shiprocketOrderId || order.shiprocketShipmentId) {
      return NextResponse.json(
        {
          error: "This order already has a Shiprocket shipment.",
          shiprocketOrderId: order.shiprocketOrderId,
          shiprocketShipmentId: order.shiprocketShipmentId,
        },
        { status: 409 }
      );
    }

    const items = Array.isArray(order.items) ? order.items : [];

    const testMode =
      String(process.env.SHIPROCKET_TEST_MODE || "").toLowerCase() === "true";

    if (testMode) {
      const updatedOrder = await updateShiprocketData(order.id, {
        shiprocketOrderId: "",
        shiprocketShipmentId: "",
        shiprocketAwbCode: "",
        shiprocketCourierName: "",
        shiprocketStatus: "TEST",
      });

      return NextResponse.json({
        ok: true,
        testMode: true,
        message: "Shiprocket TEST MODE: no real shipment was created.",
        order: updatedOrder,
      });
    }


    if (!items.length) {
      return NextResponse.json(
        { error: "Order has no items." },
        { status: 400 }
      );
    }

    const customer = order.customer || {};

    const requiredCustomerFields = [
      ["name", customer.name],
      ["address", customer.address],
      ["city", customer.city],
      ["state", customer.state],
      ["pincode", customer.pincode],
      ["phone", customer.phone],
    ];

    const missingCustomerField = requiredCustomerFields.find(
      ([, value]) => !clean(value)
    );

    if (missingCustomerField) {
      return NextResponse.json(
        {
          error: `Customer ${missingCustomerField[0]} is missing.`,
        },
        { status: 400 }
      );
    }

    const orderItems = [];
    let totalWeight = 0;
    let packageLength = 0;
    let packageBreadth = 0;
    let packageHeight = 0;

    for (const item of items) {
      if (item.custom) {
        return NextResponse.json(
          {
            error:
              "Custom orders cannot be sent to Shiprocket yet. Configure the actual custom-tee package measurements first.",
          },
          { status: 400 }
        );
      }

      const product = await getProduct(item.id);

      if (!product) {
        return NextResponse.json(
          {
            error: `Product ${item.id || item.name || ""} was not found.`,
          },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Number(item.qty || 1));

      const weight = number(product.shippingWeight);
      const length = number(product.shippingLength);
      const breadth = number(product.shippingBreadth);
      const height = number(product.shippingHeight);

      if (
        weight <= 0 ||
        length <= 0 ||
        breadth <= 0 ||
        height <= 0
      ) {
        return NextResponse.json(
          {
            error:
              `Shipping package measurements are missing for "${product.name}". ` +
              "Enter the actual packed weight and dimensions in Admin → Products before creating the Shiprocket shipment.",
          },
          { status: 400 }
        );
      }

      orderItems.push({
        name: product.name,
        sku: product.id,
        units: qty,
        selling_price: number(item.price || product.price),
        discount: 0,
        tax: 0,
        hsn: "",
      });

      totalWeight += weight * qty;

      /*
       * For the first supported shipping flow, this endpoint supports
       * one physical product per shipment. Multiple different products
       * need a final packed-package profile before dimensions can be
       * calculated safely.
       */
      if (items.length === 1) {
        packageLength = length;
        packageBreadth = breadth;
        packageHeight = height;
      }
    }

    if (items.length > 1) {
      return NextResponse.json(
        {
          error:
            "This order contains multiple items. Final packed-package dimensions must be configured before creating a Shiprocket shipment.",
        },
        { status: 400 }
      );
    }

    const paymentMethod =
      String(order.paymentStatus || "").toUpperCase() === "PAID"
        ? "Prepaid"
        : "COD";

    const payload = {
      order_id: order.id,
      order_date: new Date(order.createdAt).toISOString(),
      pickup_location: "Home",

      billing_customer_name: clean(customer.name),
      billing_last_name: "",
      billing_address: clean(customer.address),
      billing_address_2: "",
      billing_city: clean(customer.city),
      billing_pincode: clean(customer.pincode),
      billing_state: clean(customer.state),
      billing_country: clean(customer.country || "India"),
      billing_email: clean(customer.email),
      billing_phone: clean(customer.phone),

      shipping_is_billing: true,

      shipping_customer_name: clean(customer.name),
      shipping_last_name: "",
      shipping_address: clean(customer.address),
      shipping_address_2: "",
      shipping_city: clean(customer.city),
      shipping_pincode: clean(customer.pincode),
      shipping_state: clean(customer.state),
      shipping_country: clean(customer.country || "India"),
      shipping_email: clean(customer.email),
      shipping_phone: clean(customer.phone),

      order_items: orderItems,

      payment_method: paymentMethod,
      sub_total: number(order.total),

      length: packageLength,
      breadth: packageBreadth,
      height: packageHeight,
      weight: totalWeight,
    };

    const result = await createShiprocketOrder(payload);

    const shiprocketOrderId = clean(
      result?.order_id || result?.orderId
    );

    const shiprocketShipmentId = clean(
      result?.shipment_id || result?.shipmentId
    );

    if (!shiprocketOrderId || !shiprocketShipmentId) {
      return NextResponse.json(
        {
          error:
            "Shiprocket did not return the expected order/shipment IDs.",
        },
        { status: 502 }
      );
    }

    const updatedOrder = await updateShiprocketData(order.id, {
      shiprocketOrderId,
      shiprocketShipmentId,
      shiprocketAwbCode: "",
      shiprocketCourierName: "",
      shiprocketStatus: "CREATED",
    });

    return NextResponse.json({
      ok: true,
      message: "Shiprocket order created successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Shiprocket order creation error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create Shiprocket shipment.",
      },
      { status: 500 }
    );
  }
}
