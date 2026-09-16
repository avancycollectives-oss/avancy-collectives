import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../lib/auth";
import {
  getOrder,
  markRefundRequested,
  updateRefundResult,
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

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      return NextResponse.json(
        { error: "Razorpay is not configured." },
        { status: 503 }
      );
    }

    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.paymentStatus !== "PAID") {
      return NextResponse.json(
        { error: "This order has not been paid online." },
        { status: 400 }
      );
    }

    if (!order.paymentId) {
      return NextResponse.json(
        { error: "Razorpay payment ID is missing for this order." },
        { status: 400 }
      );
    }

    if (order.orderStatus !== "DELIVERED") {
      return NextResponse.json(
        { error: "The order must be delivered before a refund can be initiated." },
        { status: 400 }
      );
    }

    if (String(order.returnStatus || "").toUpperCase() !== "RECEIVED") {
      return NextResponse.json(
        { error: "The returned product must be received before initiating the refund." },
        { status: 400 }
      );
    }

    const existingRefundStatus = String(
      order.refundStatus || ""
    ).toUpperCase();

    if (existingRefundStatus === "PROCESSED") {
      return NextResponse.json(
        {
          error: "This order has already been refunded.",
          refundStatus: existingRefundStatus,
          refundId: order.refundId || "",
        },
        { status: 400 }
      );
    }

    if (existingRefundStatus === "FAILED") {
      return NextResponse.json(
        {
          error:
            "The previous refund attempt failed. Please review the Razorpay error before retrying.",
          refundStatus: existingRefundStatus,
          refundId: order.refundId || "",
          refundError: order.refundError || "",
        },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(order.total) * 100);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid refund amount." },
        { status: 400 }
      );
    }

    if (existingRefundStatus !== "PENDING") {
      const pending = await markRefundRequested(
        order.id,
        Number(order.total)
      );

      if (!pending) {
        return NextResponse.json(
          {
            error:
              "Refund could not be started. The order may already have a refund in progress.",
          },
          { status: 409 }
        );
      }
    }

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const idempotencyKey = `avancy-refund-${order.id}`;

    const rr = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        order.paymentId
      )}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "X-Refund-Idempotency": idempotencyKey,
        },
        body: JSON.stringify({
          amount,
          notes: {
            avancy_order_id: order.id,
            reason: "Customer return",
          },
        }),
      }
    );

    const data = await rr.json();

    if (!rr.ok) {
      const message =
        data?.error?.description ||
        data?.error?.reason ||
        "Razorpay refund request failed.";

      await updateRefundResult(
        order.id,
        "FAILED",
        "",
        message
      );

      return NextResponse.json(
        { error: message },
        { status: 502 }
      );
    }

    const refundId = String(data.id || "");

    if (!refundId) {
      await updateRefundResult(
        order.id,
        "FAILED",
        "",
        "Razorpay did not return a refund ID."
      );

      return NextResponse.json(
        { error: "Razorpay did not return a refund ID." },
        { status: 502 }
      );
    }

    await updateRefundResult(
      order.id,
      "PENDING",
      refundId,
      ""
    );

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      refundId,
      refundStatus: "PENDING",
      amount: Number(order.total),
      message:
        "Refund initiated successfully. The refund is now pending with Razorpay.",
    });
  } catch (error) {
    console.error("RAZORPAY_REFUND_ERROR", error);

    return NextResponse.json(
      { error: "Could not initiate refund." },
      { status: 500 }
    );
  }
}