import { NextResponse } from "next/server";
import { getOrders } from "../../../../lib/db";

export async function GET() {
  try {
    const orders = await getOrders();

    const latest = orders[0];

    if (!latest) {
      return NextResponse.json({
        ok: false,
        message: "No Avancy orders found",
      });
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: latest.id,
        orderStatus: latest.orderStatus,
        paymentStatus: latest.paymentStatus,
        total: latest.total,
        itemCount: Array.isArray(latest.items)
          ? latest.items.length
          : 0,
        items: latest.items,
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
