import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../lib/auth";
import {
  getOrder,
  updateOrderStatus,
  updateOrderReturnStatus,
} from "../../../../../lib/db";

const allowed = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
  "refunded",
  "new",
];

const returnAllowed = [
  "requested",
  "approved",
  "pickup",
  "received",
  "refunded",
  "rejected",
];

export async function PATCH(req, { params }) {
  const c = await cookies();

  if (!(await validSession(c.get("avancy_admin")?.value))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  // Separate return-status update
  if (body.returnStatus !== undefined) {
    const returnStatus = String(body.returnStatus || "").toLowerCase();

    if (!returnAllowed.includes(returnStatus)) {
      return NextResponse.json(
        { error: "Invalid return status." },
        { status: 400 }
      );
    }

    const order = await updateOrderReturnStatus(
      id,
      returnStatus.toUpperCase()
    );

    return order
      ? NextResponse.json({ order })
      : NextResponse.json(
          { error: "Order or return request not found." },
          { status: 404 }
        );
  }

  // Normal order-status update
  const status = String(body.orderStatus || "").toLowerCase();

  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 }
    );
  }

  const order = await updateOrderStatus(
    id,
    status.toUpperCase()
  );

  return order
    ? NextResponse.json({ order })
    : NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
}

export async function GET(req, { params }) {
  const c = await cookies();

  if (!(await validSession(c.get("avancy_admin")?.value))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const order = await getOrder((await params).id);

  return order
    ? NextResponse.json({ order })
    : NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
}