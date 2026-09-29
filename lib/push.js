import webpush from 'web-push';
import {
  getPushSubscriptions,
  deletePushSubscriptionById
} from './db.js';

let vapidConfigured=false;

function configureVapid(){
  if(vapidConfigured)return true;

  const subject=process.env.WEB_PUSH_SUBJECT||'';
  const publicKey=process.env.WEB_PUSH_VAPID_PUBLIC_KEY||'';
  const privateKey=process.env.WEB_PUSH_VAPID_PRIVATE_KEY||'';

  if(!subject||!publicKey||!privateKey){
    return false;
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );

  vapidConfigured=true;
  return true;
}

function notificationPayload(order,paymentMethod){
  const amount=Number(order?.total||0);

  return {
    title:'NEW AVANCY ORDER',
    body:
      `Order ${order.id} • ₹${amount.toLocaleString('en-IN')} • ${paymentMethod}`,
    url:`/admin/orders/${encodeURIComponent(order.id)}`,
    tag:`avancy-order-${order.id}`,
    orderId:order.id,
    amount,
    paymentMethod
  };
}

export async function notifyNewOrder(order,paymentMethod){
  try{
    if(!order?.id){
      return {
        ok:false,
        sent:0,
        reason:'Missing order.'
      };
    }

    if(!configureVapid()){
      console.warn(
        'Push notification skipped: VAPID configuration is missing.'
      );

      return {
        ok:false,
        sent:0,
        reason:'Push notifications are not configured.'
      };
    }

    const subscriptions=await getPushSubscriptions();

    if(!subscriptions.length){
      return {
        ok:true,
        sent:0,
        reason:'No subscribed devices.'
      };
    }

    const payload=JSON.stringify(
      notificationPayload(order,paymentMethod)
    );

    let sent=0;
    let removed=0;

    const results=await Promise.allSettled(
      subscriptions.map(async subscription=>{
        const target={
          endpoint:subscription.endpoint,
          keys:{
            p256dh:subscription.p256dh,
            auth:subscription.auth
          }
        };

        try{
          await webpush.sendNotification(
            target,
            payload
          );

          sent++;

          return {
            ok:true
          };
        }catch(error){
          const statusCode=Number(
            error?.statusCode||0
          );

          if(statusCode===404||statusCode===410){
            await deletePushSubscriptionById(
              subscription.id
            );

            removed++;

            return {
              ok:false,
              removed:true
            };
          }

          console.error(
            'Push delivery failed:',
            {
              statusCode,
              message:error?.message||'Unknown push error'
            }
          );

          return {
            ok:false,
            removed:false
          };
        }
      })
    );

    return {
      ok:true,
      sent,
      removed,
      attempted:results.length
    };
  }catch(error){
    console.error(
      'Push notification helper failed:',
      error?.message||error
    );

    return {
      ok:false,
      sent:0,
      reason:'Push delivery failed.'
    };
  }
}
