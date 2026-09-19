import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../lib/auth";
import {
  getOrder,
  markManualRefundCompleted,
} from "../../../../../../lib/db";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  try {
    const c = await cookies();

    if (!(await validSession(c.get("avancy_admin")?.value))) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.paymentStatus === "PAID" || order.paymentId) {
      return NextResponse.json(
        {
          error:
            "This order has an online payment. Use the Razorpay refund workflow instead.",
        },
        { status: 400 }
      );
    }

    if (order.orderStatus !== "DELIVERED") {
      return NextResponse.json(
        {
          error:
            "The order must be delivered before a refund.",
        },
        { status: 400 }
      );
    }

    if (
      String(order.returnStatus || "").toUpperCase() !==
      "RECEIVED"
    ) {
      return NextResponse.json(
        {
          error:
            "The returned product must be received before the refund.",
        },
        { status: 400 }
      );
    }

    if (String(order.refundStatus || "").toUpperCase()) {
      return NextResponse.json(
        {
          error: "A refund already exists for this order.",
          refundStatus: order.refundStatus,
          refundReference: order.refundReference || "",
        },
        { status: 400 }
      );
    }

    let body = {};

    try {
      body = await req.json();
    } catch {}

    const reference = String(
      body.reference || ""
    ).trim();

    if (!reference) {
      return NextResponse.json(
        {
          error:
            "Enter the UPI/bank refund reference before marking the COD refund completed.",
        },
        { status: 400 }
      );
    }

    if (reference.length > 200) {
      return NextResponse.json(
        { error: "Refund reference is too long." },
        { status: 400 }
      );
    }

    const updated = await markManualRefundCompleted(
      order.id,
      Number(order.total),
      reference
    );

    if (!updated) {
      return NextResponse.json(
        {
          error:
            "COD refund could not be recorded. The order may already have a refund.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: updated.id,
      refundStatus: updated.refundStatus,
      refundMethod: updated.refundMethod,
      refundReference: updated.refundReference,
      amount: updated.refundAmount,
      message:
        "COD refund marked as completed. No Razorpay request was made.",
    });
  } catch (error) {
    console.error("COD_MANUAL_REFUND_ERROR", error);

    return NextResponse.json(
      { error: "Could not record COD refund." },
      { status: 500 }
    );
  }
}
