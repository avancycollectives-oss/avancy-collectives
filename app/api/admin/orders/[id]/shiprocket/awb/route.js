import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validSession } from "../../../../../../../lib/auth";
import {
  getOrder,
  updateShiprocketData,
} from "../../../../../../../lib/db";
import { assignShiprocketAwb } from "../../../../../../../lib/shiprocket";

export const dynamic = "force-dynamic";

function clean(value) {
  return String(value || "").trim();
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

    const testMode =
      String(process.env.SHIPROCKET_TEST_MODE || "").toLowerCase() === "true";

    if (!testMode && !order.shiprocketShipmentId) {
      return NextResponse.json(
        { error: "No Shiprocket shipment ID exists for this order." },
        { status: 400 }
      );
    }

    if (testMode) {
      const updatedOrder = await updateShiprocketData(order.id, {
        shiprocketOrderId: order.shiprocketOrderId || "",
        shiprocketShipmentId: order.shiprocketShipmentId || "",
        shiprocketAwbCode: "",
        shiprocketCourierName: "",
        shiprocketStatus: "TEST",
      });

      return NextResponse.json({
        ok: true,
        testMode: true,
        message: "Shiprocket TEST MODE: no real AWB was assigned.",
        order: updatedOrder,
      });
    }

    const body = await req.json().catch(() => ({}));

    const result = await assignShiprocketAwb({
      shipmentId: order.shiprocketShipmentId,
      courierId: clean(body.courierId),
      status: clean(body.status),
    });

    const awbCode = clean(
      result?.response?.data?.awb_code ||
      result?.awb_code ||
      result?.awbCode
    );

    const courierName = clean(
      result?.response?.data?.courier_name ||
      result?.courier_name ||
      result?.courierName
    );

    if (!awbCode) {
      return NextResponse.json(
        {
          error: "Shiprocket did not return an AWB code.",
          response: result,
        },
        { status: 502 }
      );
    }

    const updatedOrder = await updateShiprocketData(order.id, {
      shiprocketOrderId: order.shiprocketOrderId || "",
      shiprocketShipmentId: order.shiprocketShipmentId || "",
      shiprocketAwbCode: awbCode,
      shiprocketCourierName: courierName,
      shiprocketStatus: "AWB_ASSIGNED",
    });

    return NextResponse.json({
      ok: true,
      message: "Shiprocket AWB assigned successfully.",
      order: updatedOrder,
      shiprocket: result,
    });
  } catch (error) {
    console.error("Shiprocket AWB assignment error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to assign Shiprocket AWB.",
      },
      { status: 500 }
    );
  }
}
