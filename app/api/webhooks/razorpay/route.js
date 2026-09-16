import crypto from "crypto";
import { NextResponse } from "next/server";
import { getOrder, getOrderByPaymentId, updateRefundResult, updateOrderReturnStatus } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { error: "Webhook is not configured." },
        { status: 503 }
      );
    }

    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing webhook signature." },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const received = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    let event;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook payload." },
        { status: 400 }
      );
    }

    const eventName = String(event.event || "");

    if (
      eventName !== "refund.processed" &&
      eventName !== "refund.failed"
    ) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        event: eventName,
      });
    }

    const refundEntity =
      event?.payload?.refund?.entity || null;

    const refundId = String(refundEntity?.id || "");
    const paymentId = String(refundEntity?.payment_id || "");

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID missing from webhook." },
        { status: 400 }
      );
    }

    let order = null;

    if (paymentId) {
      order = await getOrderByPaymentId(paymentId);
    }

    if (!order) {
      const notesOrderId = String(
        refundEntity?.notes?.avancy_order_id || ""
      );

      if (notesOrderId) {
        order = await getOrder(notesOrderId);
      }
    }

    if (!order) {
      console.error(
        "Razorpay refund webhook order not found:",
        refundId,
        paymentId
      );

      return NextResponse.json(
        { error: "Order for refund could not be found." },
        { status: 404 }
      );
    }

    if (
      order.refundId &&
      String(order.refundId) !== refundId
    ) {
      return NextResponse.json(
        { error: "Refund ID does not match this order." },
        { status: 400 }
      );
    }

    const currentRefundStatus =
      String(order.refundStatus || "").toUpperCase();

    if (eventName === "refund.processed") {
      if (currentRefundStatus !== "PROCESSED") {
        await updateRefundResult(
          order.id,
          "PROCESSED",
          refundId,
          ""
        );
      }

      if (
        String(order.returnStatus || "").toUpperCase() ===
        "RECEIVED"
      ) {
        await updateOrderReturnStatus(
          order.id,
          "REFUNDED"
        );
      }
    } else {
      const reason =
        String(
          refundEntity?.error_description ||
          refundEntity?.error_reason ||
          refundEntity?.error_source ||
          "Razorpay refund failed."
        );

      if (currentRefundStatus !== "PROCESSED") {
        await updateRefundResult(
          order.id,
          "FAILED",
          refundId,
          reason
        );
      }
    }

    return NextResponse.json({
      ok: true,
      event: eventName,
      orderId: order.id,
      refundId,
    });
  } catch (error) {
    console.error(
      "RAZORPAY_REFUND_WEBHOOK_ERROR",
      error
    );

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}

