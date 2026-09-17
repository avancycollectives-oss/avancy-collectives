import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../../lib/auth";
import {
  getOrder,
  updateShiprocketData,
} from "../../../../../../../lib/db";
import { generateShiprocketPickup } from "../../../../../../../lib/shiprocket";

export const dynamic = "force-dynamic";

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

    if (testMode) {
      const updatedOrder = await updateShiprocketData(order.id, {
        shiprocketOrderId: order.shiprocketOrderId || "",
        shiprocketShipmentId: order.shiprocketShipmentId || "",
        shiprocketAwbCode: order.shiprocketAwbCode || "",
        shiprocketCourierName: order.shiprocketCourierName || "",
        shiprocketStatus: order.shiprocketStatus || "TEST",
        shiprocketPickupStatus: "TEST",
      });

      return NextResponse.json({
        ok: true,
        testMode: true,
        message: "Shiprocket TEST MODE: no real pickup was requested.",
        order: updatedOrder,
      });
    }

    if (!order.shiprocketShipmentId) {
      return NextResponse.json(
        { error: "No Shiprocket shipment ID exists for this order." },
        { status: 400 }
      );
    }

    if (!order.shiprocketAwbCode) {
      return NextResponse.json(
        { error: "No Shiprocket AWB exists for this order." },
        { status: 400 }
      );
    }

    const result = await generateShiprocketPickup({
      shipment_id: order.shiprocketShipmentId,
    });

    const updatedOrder = await updateShiprocketData(order.id, {
      shiprocketOrderId: order.shiprocketOrderId || "",
      shiprocketShipmentId: order.shiprocketShipmentId || "",
      shiprocketAwbCode: order.shiprocketAwbCode || "",
      shiprocketCourierName: order.shiprocketCourierName || "",
      shiprocketStatus: order.shiprocketStatus || "AWB_ASSIGNED",
      shiprocketPickupStatus: "REQUESTED",
    });

    return NextResponse.json({
      ok: true,
      message: "Shiprocket pickup requested successfully.",
      order: updatedOrder,
      shiprocket: result,
    });
  } catch (error) {
    console.error("Shiprocket pickup request error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to request Shiprocket pickup.",
      },
      { status: 500 }
    );
  }
}
