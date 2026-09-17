import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../../lib/auth";
import {
  getOrder,
  updateShiprocketData,
} from "../../../../../../../lib/db";

export const dynamic = "force-dynamic";

const pickupStatuses = new Set([
  "TEST",
  "REQUESTED",
  "SCHEDULED",
  "OUT_FOR_PICKUP",
  "PICKED_UP",
  "CANCELLED",
  "EXCEPTION",
]);

const courierStatuses = new Set([
  "TEST",
  "AWB_ASSIGNED",
  "PICKUP_SCHEDULED",
  "OUT_FOR_PICKUP",
  "PICKED_UP",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELAYED",
  "CANCELLED",
]);

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

    const testMode =
      String(process.env.SHIPROCKET_TEST_MODE || "").toLowerCase() === "true";

    if (!testMode) {
      return NextResponse.json(
        {
          error:
            "TEST MODE is disabled. Test Shiprocket statuses cannot be changed.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const pickupStatus = String(body?.pickupStatus || "").toUpperCase();
    const courierStatus = String(body?.courierStatus || "").toUpperCase();

    if (pickupStatus && !pickupStatuses.has(pickupStatus)) {
      return NextResponse.json(
        { error: "Invalid test pickup status." },
        { status: 400 }
      );
    }

    if (courierStatus && !courierStatuses.has(courierStatus)) {
      return NextResponse.json(
        { error: "Invalid test courier status." },
        { status: 400 }
      );
    }

    if (!pickupStatus && !courierStatus) {
      return NextResponse.json(
        { error: "A pickup status or courier status is required." },
        { status: 400 }
      );
    }

    const updatedOrder = await updateShiprocketData(order.id, {
      shiprocketOrderId: order.shiprocketOrderId || "",
      shiprocketShipmentId: order.shiprocketShipmentId || "",
      shiprocketAwbCode: order.shiprocketAwbCode || "",
      shiprocketCourierName: order.shiprocketCourierName || "",
      shiprocketStatus: order.shiprocketStatus || "TEST",
      shiprocketPickupStatus:
        pickupStatus || order.shiprocketPickupStatus || "TEST",
      shiprocketCourierStatus:
        courierStatus || order.shiprocketCourierStatus || "TEST",
    });

    return NextResponse.json({
      ok: true,
      testMode: true,
      message: "Shiprocket TEST MODE status updated.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Shiprocket test status error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update Shiprocket test status.",
      },
      { status: 500 }
    );
  }
}
