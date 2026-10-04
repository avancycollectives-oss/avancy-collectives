import crypto from 'crypto';
import {NextResponse} from 'next/server';
import {createOrder,getOrder,decrementStock,claimFreeShippingSlot,applyFreeShippingToOrder} from '../../../lib/db.js';
import {calculateOrderPricing} from '../../../lib/order-pricing.js';
import {notifyNewOrder} from '../../../lib/push.js';
import {sendOrderConfirmationEmail} from '../../../lib/email.js';

function orderId(){
  return `AVN-${new Date().getFullYear()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
}

export const runtime='nodejs';

export async function POST(req){
  try{
    const body=await req.json();

    if(
      !body.name?.trim()||
      !body.email?.trim()||
      !body.phone?.trim()||
      !body.address?.trim()||
      !body.city?.trim()||
      !body.pincode?.trim()||
      !Array.isArray(body.items)||
      !body.items.length
    ){
      return NextResponse.json(
        {error:'Please complete all checkout details.'},
        {status:400}
      );
    }

    const id=orderId();

    const pricing=await calculateOrderPricing({
      items:body.items,
      customer:body,
      paymentMethod:'COD'
    });

    /*
     * Create the order first so the free-shipping slot can safely
     * reference the order. The slot claim itself is atomic.
     */
    const normalShippingAmount=pricing.shippingAmount;
    const normalTotal=pricing.subtotal+normalShippingAmount;

    await createOrder({
      id,
      customer:{
        name:body.name.trim(),
        email:body.email.trim().toLowerCase(),
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
      orderStatus:'NEW'
    });

    const freeShippingSlot =
      pricing.subtotal < 999 && !pricing.freeShipping
        ? await claimFreeShippingSlot(id,body.email)
        : null;

    let shippingAmount=normalShippingAmount;
    let total=normalTotal;
    let freeShippingOffer=false;

    if(freeShippingSlot!==null){
      const updated=await applyFreeShippingToOrder(id,freeShippingSlot);
      if(updated){
        shippingAmount=updated.shippingAmount;
        total=updated.total;
        freeShippingOffer=true;
      }
    }

    await decrementStock(pricing.items);

    const finalOrder=await getOrder(id);

    if(finalOrder){
      await notifyNewOrder(
        finalOrder,
        'COD'
      );

      /*
       * Email failure must never undo a successfully created COD order.
       */
      try{
        await sendOrderConfirmationEmail(
          finalOrder,
          'COD'
        );
      }catch(emailError){
        console.error(
          'COD order confirmation email error:',
          emailError
        );
      }
    }

    return NextResponse.json({
      orderId:id,
      subtotal:pricing.subtotal,
      gstAmount:0,
      shippingAmount,
      total,
      freeShipping:freeShippingOffer||pricing.freeShipping,
      firstFiveFree:freeShippingOffer,
      paymentStatus:'PENDING'
    });
  }catch(e){
    console.error(e);
    return NextResponse.json(
      {error:e?.message||'Could not create order.'},
      {status:500}
    );
  }
}
