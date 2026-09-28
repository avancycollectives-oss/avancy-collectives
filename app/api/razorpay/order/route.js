import crypto from 'crypto';
import {NextResponse} from 'next/server';
import {
  createOrder,
  claimFreeShippingSlot,
  applyFreeShippingToOrder,
  releaseFreeShippingSlot,
  updateOrderStatus
} from '../../../../lib/db.js';
import {calculateOrderPricing} from '../../../../lib/order-pricing.js';

export const runtime='nodejs';

export async function POST(req){
  let createdOrderId='';

  try{
    if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET){
      return NextResponse.json(
        {
          error:
            'Online payment is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local.'
        },
        {status:503}
      );
    }

    const body=await req.json();

    if(
      !body.name||
      !body.email||
      !body.phone||
      !body.address||
      !body.city||
      !body.pincode||
      !Array.isArray(body.items)||
      !body.items.length
    ){
      return NextResponse.json(
        {error:'Please complete all checkout details.'},
        {status:400}
      );
    }

    const pricing=await calculateOrderPricing({
      items:body.items,
      customer:body,
      paymentMethod:'RAZORPAY'
    });

    const id=`AVN-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    createdOrderId=id;

    const normalShippingAmount=pricing.shippingAmount;
    const normalTotal=pricing.subtotal+normalShippingAmount;

    /*
     * Create the Avancy order first.
     * This gives the first-five promotion a real order ID to attach to.
     */
    await createOrder({
      id,
      customer:{
        name:body.name,
        email:body.email.toLowerCase(),
        phone:body.phone,
        address:body.address,
        city:body.city,
        state:body.state||'',
        pincode:body.pincode
      },
      items:pricing.items,
      subtotal:pricing.subtotal,
      gstAmount:0,
      shippingAmount:normalShippingAmount,
      total:normalTotal,
      freeShippingOffer:false,
      freeShippingSlot:null,
      shippingCourierName:pricing.shippingCourier,
      shippingRate:pricing.shippingRate,
      shippingEtd:pricing.shippingEtd,
      paymentStatus:'PENDING',
      orderStatus:'NEW',
      paymentOrderId:''
    });

    /*
     * Claim one of the five free-delivery slots atomically.
     */
    const freeShippingSlot=await claimFreeShippingSlot(id);

    let shippingAmount=normalShippingAmount;
    let total=normalTotal;
    let freeShippingOffer=false;

    if(freeShippingSlot!==null){
      const updated=await applyFreeShippingToOrder(
        id,
        freeShippingSlot
      );

      if(updated){
        shippingAmount=updated.shippingAmount;
        total=updated.total;
        freeShippingOffer=true;
      }
    }

    /*
     * Razorpay receives the FINAL server-controlled amount.
     * Therefore a first-five customer gets a Razorpay amount
     * containing product subtotal only.
     */
    const auth=Buffer
      .from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      )
      .toString('base64');

    const rr=await fetch(
      'https://api.razorpay.com/v1/orders',
      {
        method:'POST',
        headers:{
          Authorization:`Basic ${auth}`,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          amount:total*100,
          currency:'INR',
          receipt:id,
          notes:{
            email:body.email,
            avancy_order_id:id
          }
        })
      }
    );

    const ro=await rr.json();

    if(!rr.ok){
      await releaseFreeShippingSlot(id);
      await updateOrderStatus(id,'FAILED');

      return NextResponse.json(
        {
          error:
            ro?.error?.description||
            'Unable to create payment order.'
        },
        {status:502}
      );
    }

    /*
     * Attach the Razorpay order ID to the already-created
     * Avancy order.
     */
    const {updatePaymentOrderId}=await import('../../../../lib/db.js');

    const linked=await updatePaymentOrderId(id,ro.id);

    if(!linked){
      await releaseFreeShippingSlot(id);
      await updateOrderStatus(id,'FAILED');

      return NextResponse.json(
        {error:'Could not link the secure payment order.'},
        {status:500}
      );
    }

    return NextResponse.json({
      keyId:process.env.RAZORPAY_KEY_ID,
      razorpayOrderId:ro.id,
      amount:ro.amount,
      currency:ro.currency,
      orderId:id,
      subtotal:pricing.subtotal,
      gstAmount:0,
      shippingAmount,
      total,
      freeShipping:freeShippingOffer||pricing.freeShipping,
      firstFiveFree:freeShippingOffer
    });

  }catch(e){
    console.error(e);

    /*
     * If the Avancy order was created but Razorpay setup failed,
     * return its first-five slot so a failed payment initialization
     * does not consume a promotion slot.
     */
    if(createdOrderId){
      try{
        await releaseFreeShippingSlot(createdOrderId);
        await updateOrderStatus(createdOrderId,'FAILED');
      }catch(cleanupError){
        console.error(
          'Razorpay order cleanup error:',
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {error:e?.message||'Could not start online payment.'},
      {status:500}
    );
  }
}
