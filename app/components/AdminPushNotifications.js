"use client";

import {useEffect,useState} from "react";

function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-(base64String.length%4))%4);
  const base64=(base64String+padding)
    .replace(/-/g,"+")
    .replace(/_/g,"/");

  const rawData=window.atob(base64);
  return Uint8Array.from(
    [...rawData].map(char=>char.charCodeAt(0))
  );
}

export default function AdminPushNotifications(){
  const [supported,setSupported]=useState(null);
  const [enabled,setEnabled]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;

    async function checkPush(){
      try{
        const ok=
          "serviceWorker" in navigator &&
          "PushManager" in window &&
          "Notification" in window;

        if(!active)return;

        setSupported(ok);

        if(!ok)return;

        const registration=await navigator.serviceWorker.register(
          "/sw.js",
          {scope:"/"}
        );

        const subscription=
          await registration.pushManager.getSubscription();

        if(active){
          setEnabled(Boolean(subscription));
        }
      }catch(e){
        console.error("Push setup check failed:",e);

        if(active){
          setSupported(false);
          setError("Push notifications could not be initialized.");
        }
      }
    }

    checkPush();

    return()=>{
      active=false;
    };
  },[]);

  async function enableNotifications(){
    setBusy(true);
    setMessage("");
    setError("");

    try{
      if(
        !("serviceWorker" in navigator)||
        !("PushManager" in window)||
        !("Notification" in window)
      ){
        throw new Error(
          "This browser does not support web push notifications."
        );
      }

      const permission=await Notification.requestPermission();

      if(permission!=="granted"){
        if(permission==="denied"){
          throw new Error(
            "Notifications are blocked. Allow notifications for this site in Chrome site settings, then try again."
          );
        }

        throw new Error(
          "Notification permission was not granted."
        );
      }

      const configResponse=await fetch(
        "/api/admin/push/config",
        {
          cache:"no-store"
        }
      );

      const config=await configResponse.json();

      if(!configResponse.ok||!config.publicKey){
        throw new Error(
          config.error||"Push notifications are not configured."
        );
      }

      const registration=
        await navigator.serviceWorker.register(
          "/sw.js",
          {scope:"/"}
        );

      await navigator.serviceWorker.ready;

      let subscription=
        await registration.pushManager.getSubscription();

      if(!subscription){
        subscription=
          await registration.pushManager.subscribe({
            userVisibleOnly:true,
            applicationServerKey:
              urlBase64ToUint8Array(config.publicKey)
          });
      }

      const response=await fetch(
        "/api/admin/push/subscribe",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            subscription:subscription.toJSON()
          })
        }
      );

      const result=await response.json();

      if(!response.ok){
        throw new Error(
          result.error||"Could not save this device."
        );
      }

      setEnabled(true);
      setMessage(
        "Order notifications are enabled on this device."
      );
    }catch(e){
      console.error("Enable push error:",e);
      setError(
        e?.message||
        "Could not enable order notifications."
      );
    }finally{
      setBusy(false);
    }
  }

  async function disableNotifications(){
    setBusy(true);
    setMessage("");
    setError("");

    try{
      const registration=
        await navigator.serviceWorker.getRegistration("/sw.js");

      if(!registration){
        setEnabled(false);
        return;
      }

      const subscription=
        await registration.pushManager.getSubscription();

      if(subscription){
        const endpoint=subscription.endpoint;

        const response=await fetch(
          "/api/admin/push/subscribe",
          {
            method:"DELETE",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify({endpoint})
          }
        );

        if(!response.ok){
          const result=await response.json().catch(()=>({}));

          throw new Error(
            result.error||
            "Could not remove this device."
          );
        }

        await subscription.unsubscribe();
      }

      setEnabled(false);
      setMessage(
        "Order notifications are disabled on this device."
      );
    }catch(e){
      console.error("Disable push error:",e);
      setError(
        e?.message||
        "Could not disable order notifications."
      );
    }finally{
      setBusy(false);
    }
  }

  return(
    <div
      className="admin-panel"
      style={{
        marginBottom:"24px",
        border:"1px solid rgba(226,249,82,.22)"
      }}
    >
      <div
        className="panel-head"
        style={{
          alignItems:"center"
        }}
      >
        <div>
          <h2>ORDER NOTIFICATIONS</h2>
          <p
            style={{
              margin:"6px 0 0",
              opacity:.65,
              fontSize:"12px"
            }}
          >
            Get an alert when a new Avancy order is successfully created or paid.
          </p>
        </div>

        {supported!==false&&(
          <span
            style={{
              fontSize:"11px",
              fontWeight:800,
              letterSpacing:".08em",
              color:enabled?"#E2F952":"rgba(255,255,255,.55)"
            }}
          >
            {enabled?"ENABLED":"NOT ENABLED"}
          </span>
        )}
      </div>

      {supported===false?(
        <div style={{padding:"14px 0"}}>
          <p
            style={{
              margin:0,
              color:"rgba(255,255,255,.7)",
              fontSize:"13px"
            }}
          >
            Web push notifications are not available in this browser.
            Use Chrome on Android or a supported desktop browser over HTTPS.
          </p>
        </div>
      ):(
        <div
          style={{
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between",
            gap:"14px",
            flexWrap:"wrap",
            paddingTop:"14px"
          }}
        >
          <div>
            <strong style={{fontSize:"13px"}}>
              {enabled
                ?"This device is subscribed."
                :"This device is not subscribed."}
            </strong>

            <p
              style={{
                margin:"5px 0 0",
                opacity:.6,
                fontSize:"12px"
              }}
            >
              Each phone, tablet, or browser can be enabled separately.
            </p>
          </div>

          {!enabled?(
            <button
              type="button"
              onClick={enableNotifications}
              disabled={busy}
              style={{
                border:0,
                background:"#E2F952",
                color:"#0a0a0a",
                padding:"11px 16px",
                fontWeight:900,
                fontSize:"12px",
                letterSpacing:".05em",
                cursor:busy?"wait":"pointer",
                opacity:busy?.65:1
              }}
            >
              {busy
                ?"ENABLING..."
                :"ENABLE ORDER NOTIFICATIONS"}
            </button>
          ):(
            <button
              type="button"
              onClick={disableNotifications}
              disabled={busy}
              style={{
                border:"1px solid rgba(255,255,255,.25)",
                background:"transparent",
                color:"#fff",
                padding:"11px 16px",
                fontWeight:900,
                fontSize:"12px",
                letterSpacing:".05em",
                cursor:busy?"wait":"pointer",
                opacity:busy?.65:1
              }}
            >
              {busy
                ?"DISABLING..."
                :"DISABLE ON THIS DEVICE"}
            </button>
          )}
        </div>
      )}

      {message&&(
        <p
          style={{
            margin:"14px 0 0",
            color:"#E2F952",
            fontSize:"12px",
            fontWeight:700
          }}
        >
          {message}
        </p>
      )}

      {error&&(
        <p
          style={{
            margin:"14px 0 0",
            color:"#ffb4b4",
            fontSize:"12px",
            lineHeight:1.5
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
