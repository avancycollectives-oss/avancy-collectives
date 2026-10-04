"use client";

import { avancyConfirm } from "../../../components/AvancyNotice";

import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../../components/AdminSidebar";
import AdminImageUpload from "../../../components/AdminImageUpload";
import AdminProductImages from "../../../components/AdminProductImages";
import AdminFooter from "../../../components/AdminFooter";

function parseSizes(value){
  return String(value||"")
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean)
    .filter((x,i,a)=>a.indexOf(x)===i);
}

function buildMeasurements(sizes,current){
  const next={};

  for(const size of sizes){
    next[size]={
      chest:current?.[size]?.chest??"",
      length:current?.[size]?.length??"",
      shoulder:current?.[size]?.shoulder??"",
      sleeve:current?.[size]?.sleeve??""
    };
  }

  return next;
}

export default function EditProduct(){
  const{id}=useParams();
  const router=useRouter();

  const[p,setP]=useState(null);
  const[error,setError]=useState("");
  const[errors,setErrors]=useState({});
  const[saving,setSaving]=useState(false);
  const[deleting,setDeleting]=useState(false);

  useEffect(()=>{
    fetch(`/api/admin/products/${encodeURIComponent(id)}`,{cache:"no-store"})
      .then(async r=>{
        const d=await r.json();
        if(!r.ok)throw Error(d.error||"Could not load product");
        setP({
          ...d.product,
          images:Array.isArray(d.product.images)
            ? d.product.images
            : (d.product.image ? [{
                url:d.product.image,
                publicId:d.product.imagePublicId||""
              }] : []),
          sizeMeasurements:d.product.sizeMeasurements||{},
          gstRate:d.product.gstRate??0,
          hsnCode:d.product.hsnCode||"",
          priceIncludesGst:d.product.priceIncludesGst===true,
          productWeight:d.product.productWeight??0
        });
      })
      .catch(e=>setError(e.message));
  },[id]);

  if(error&&!p){
    return (
      <main className="av-login-screen">
        <div className="av-login-card">
          <div className="av-admin-error">{error}</div>
          <Link href="/admin/products">← PRODUCTS</Link>
        </div>
      </main>
    );
  }

  if(!p){
    return (
      <main className="av-login-screen">
        <div className="av-login-card">Loading…</div>
      </main>
    );
  }

  const ch=(k,v)=>{
    setP(x=>({...x,[k]:v}));
    setErrors(x=>({...x,[k]:""}));
    setError("");
  };

  const sizes=parseSizes(p.sizesText??(p.sizes||[]).join(", "));

  function validate(){
    const e={};

    if(!p.name?.trim())e.name="Product name is required.";

    const price=Number(p.price);
    if(!Number.isFinite(price)||price<0)e.price="Enter a valid price.";

    if(!String(p.category||"").trim())e.category="Category is required.";
    if(!String(p.color||"").trim())e.color="Colour is required.";
    if(!String(p.fabric||"").trim())e.fabric="Fabric is required.";
    if(!String(p.fit||"").trim())e.fit="Fit is required.";

    if(!sizes.length)e.sizes="Add at least one size.";

    const gst=Number(p.gstRate);
    if(!Number.isFinite(gst)||gst<0||gst>100)e.gstRate="GST must be between 0 and 100.";

    const weight=Number(p.productWeight);
    if(!Number.isFinite(weight)||weight<0)e.productWeight="Product weight cannot be negative.";

    const stockValues=String(
      p.stockText??(p.sizes||[]).map(s=>p.stock?.[s]??0).join(", ")
    ).split(",").map(x=>x.trim()).filter((_,i)=>i<sizes.length);

    if(sizes.length && stockValues.length<sizes.length){
      e.stock="Enter one stock value for every size.";
    }

    for(const size of sizes){
      const m=p.sizeMeasurements?.[size]||{};

      for(const field of ["chest","length","shoulder","sleeve"]){
        if(m[field]!=="" && (Number(m[field])<0 || !Number.isFinite(Number(m[field])))){
          e[`measurement_${size}_${field}`]="Enter a valid measurement.";
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length===0;
  };

  async function save(e){
    e.preventDefault();
    setError("");

    if(!validate()){
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }

    setSaving(true);

    try{
      const nums=String(
        p.stockText??(p.sizes||[]).map(s=>p.stock?.[s]??0).join(", ")
      )
        .split(",")
        .map(x=>Math.max(0,Number(x.trim())||0));

      const body={
        ...p,
        price:Number(p.price),
        sizes,
        stock:Object.fromEntries(sizes.map((s,i)=>[s,nums[i]??0])),
        sizeMeasurements:buildMeasurements(sizes,p.sizeMeasurements),
        gstRate:Number(p.gstRate),
        productWeight:Number(p.productWeight),
        hsnCode:String(p.hsnCode||"").trim(),
        priceIncludesGst:p.priceIncludesGst===true,
        images:Array.isArray(p.images)?p.images.slice(0,5):[]
      };

      delete body.sizesText;
      delete body.stockText;

      const r=await fetch(`/api/admin/products/${encodeURIComponent(id)}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });

      const d=await r.json();

      if(!r.ok)throw Error(d.error||"Save failed");

      router.push("/admin/products");
      router.refresh();
    }catch(e){
      setError(e.message);
      window.scrollTo({top:0,behavior:"smooth"});
    }finally{
      setSaving(false);
    }
  }

  async function del(){
    const confirmed=await avancyConfirm(
      "This product will be permanently removed from the Avancy catalogue. This action cannot be undone.",
      {
        title:"DELETE PRODUCT?",
        danger:true
      }
    );

    if(!confirmed)return;

    setDeleting(true);

    const r=await fetch(
      `/api/admin/products/${encodeURIComponent(id)}`,
      {method:"DELETE"}
    );

    const d=await r.json();

    if(!r.ok){
      setError(d.error||"Delete failed");
      setDeleting(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  const fieldError=(key)=>errors[key]?(
    <small style={{display:"block",marginTop:6,fontSize:12,fontWeight:700,letterSpacing:".02em"}}>
      {errors[key]}
    </small>
  ):null;

  return (
    <main className="av-admin-shell">
      <AdminSidebar/>

      <section className="av-admin-content">
        <header className="av-admin-header">
          <div>
            <p className="av-admin-kicker">CATALOGUE / EDIT PIECE</p>
            <h1>EDIT.</h1>
          </div>

          <Link href="/admin/products" className="av-admin-link">
            ← PRODUCTS
          </Link>
        </header>

        <form className="av-admin-form" onSubmit={save} noValidate>

          <div className="av-two">
            <label>
              PRODUCT NAME
              <input
                required
                aria-invalid={!!errors.name}
                value={p.name||""}
                onChange={e=>ch("name",e.target.value)}
              />
              {fieldError("name")}
            </label>

            <label>
              PRICE (₹)
              <input
                type="number"
                min="0"
                step="1"
                required
                aria-invalid={!!errors.price}
                value={p.price||0}
                onChange={e=>ch("price",e.target.value)}
              />
              {fieldError("price")}
            </label>
          </div>

          <div className="av-two">
            <label>
              CATEGORY
              <input
                required
                aria-invalid={!!errors.category}
                value={p.category||""}
                onChange={e=>ch("category",e.target.value)}
              />
              {fieldError("category")}
            </label>

            <label>
              COLOUR
              <input
                required
                aria-invalid={!!errors.color}
                value={p.color||""}
                onChange={e=>ch("color",e.target.value)}
              />
              {fieldError("color")}
            </label>
          </div>

          <div className="av-two">
            <label>
              GSM
              <input
                value={p.gsm||""}
                onChange={e=>ch("gsm",e.target.value)}
              />
            </label>

            <label>
              FABRIC
              <input
                required
                aria-invalid={!!errors.fabric}
                value={p.fabric||""}
                onChange={e=>ch("fabric",e.target.value)}
              />
              {fieldError("fabric")}
            </label>
          </div>

          <label>
            FIT
            <input
              required
              aria-invalid={!!errors.fit}
              value={p.fit||""}
              onChange={e=>ch("fit",e.target.value)}
            />
            {fieldError("fit")}
          </label>

          <label>
            ART TEXT
            <input
              value={p.art||""}
              onChange={e=>ch("art",e.target.value)}
            />
          </label>

          <label>
            SIZES
            <input
              required
              aria-invalid={!!errors.sizes}
              value={p.sizesText??(p.sizes||[]).join(", ")}
              onChange={e=>{
                const value=e.target.value;
                const nextSizes=parseSizes(value);

                setP(x=>({
                  ...x,
                  sizesText:value,
                  sizeMeasurements:buildMeasurements(nextSizes,x.sizeMeasurements)
                }));

                setErrors(x=>({...x,sizes:""}));
              }}
            />
            {fieldError("sizes")}
          </label>

          <label>
            STOCK
            <input
              required
              aria-invalid={!!errors.stock}
              value={p.stockText??(p.sizes||[]).map(s=>p.stock?.[s]??0).join(", ")}
              onChange={e=>ch("stockText",e.target.value)}
            />
            {fieldError("stock")}
          </label>

          <section style={{marginTop:18}}>
            <p className="av-admin-kicker">SIZE GUIDE / MEASUREMENTS</p>

            <div style={{overflowX:"auto",marginTop:10}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:650}}>
                <thead>
                  <tr>
                    <th style={{textAlign:"left",padding:"10px 8px"}}>SIZE</th>
                    <th style={{padding:"10px 8px"}}>CHEST (cm)</th>
                    <th style={{padding:"10px 8px"}}>LENGTH (cm)</th>
                    <th style={{padding:"10px 8px"}}>SHOULDER (cm)</th>
                    <th style={{padding:"10px 8px"}}>SLEEVE (cm)</th>
                  </tr>
                </thead>

                <tbody>
                  {sizes.map(size=>{
                    const m=p.sizeMeasurements?.[size]||{};

                    return (
                      <tr key={size}>
                        <td style={{padding:"8px",fontWeight:800}}>
                          {size}
                        </td>

                        {["chest","length","shoulder","sleeve"].map(field=>(
                          <td key={field} style={{padding:"8px"}}>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={m[field]??""}
                              onChange={e=>{
                                const value=e.target.value;

                                setP(x=>({
                                  ...x,
                                  sizeMeasurements:{
                                    ...x.sizeMeasurements,
                                    [size]:{
                                      ...(x.sizeMeasurements?.[size]||{}),
                                      [field]:value
                                    }
                                  }
                                }));

                                setErrors(x=>({
                                  ...x,
                                  [`measurement_${size}_${field}`]:""
                                }));
                              }}
                              placeholder="—"
                            />

                            {fieldError(`measurement_${size}_${field}`)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="av-two">
            <label>
              GST RATE (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                aria-invalid={!!errors.gstRate}
                value={p.gstRate??0}
                onChange={e=>ch("gstRate",e.target.value)}
              />
              {fieldError("gstRate")}
            </label>

            <label>
              HSN CODE
              <input
                value={p.hsnCode||""}
                onChange={e=>ch("hsnCode",e.target.value)}
                placeholder="Enter HSN code"
              />
            </label>
          </div>

          <label style={{flexDirection:"row",alignItems:"center",gap:10}}>
            <input
              type="checkbox"
              checked={p.priceIncludesGst===true}
              onChange={e=>ch("priceIncludesGst",e.target.checked)}
            />
            PRICE INCLUDES GST
          </label>

          <div className="av-two">
            <label>
              PRODUCT WEIGHT (kg)
              <input
                type="number"
                min="0"
                step="0.001"
                required
                aria-invalid={!!errors.productWeight}
                value={p.productWeight??0}
                onChange={e=>ch("productWeight",e.target.value)}
              />
              {fieldError("productWeight")}
            </label>

            <div></div>
          </div>

          <section style={{marginTop:18}}>
            <p className="av-admin-kicker">SHIPROCKET / PACKAGE</p>

            <p className="av-muted" style={{marginTop:6}}>
              These values describe the shipping package and are separate from product measurements.
            </p>

            <div className="av-two" style={{marginTop:12}}>
              <label>
                PACKAGE WEIGHT (kg)
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={p.shippingWeight??0}
                  onChange={e=>ch("shippingWeight",e.target.value)}
                />
              </label>

              <label>
                PACKAGE LENGTH (cm)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.shippingLength??0}
                  onChange={e=>ch("shippingLength",e.target.value)}
                />
              </label>
            </div>

            <div className="av-two">
              <label>
                PACKAGE BREADTH (cm)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.shippingBreadth??0}
                  onChange={e=>ch("shippingBreadth",e.target.value)}
                />
              </label>

              <label>
                PACKAGE HEIGHT (cm)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={p.shippingHeight??0}
                  onChange={e=>ch("shippingHeight",e.target.value)}
                />
              </label>
            </div>
          </section>

          <section style={{marginTop:18}}>
            <p className="av-admin-kicker">PRODUCT IMAGES</p>

            <p className="av-muted" style={{marginTop:6}}>
              Upload up to 5 images. The first image is the primary product image.
            </p>

            <AdminProductImages
              images={p.images||[]}
              primaryImage={p.image||""}
              primaryPublicId={p.imagePublicId||""}
              onChange={v=>setP(x=>({...x,...v}))}
            />
          </section>

          <label>
            DESCRIPTION
            <textarea
              rows="6"
              value={p.description||""}
              onChange={e=>ch("description",e.target.value)}
            />
          </label>

          <label style={{flexDirection:"row",alignItems:"center",gap:10}}>
            <input
              type="checkbox"
              checked={p.active!==false}
              onChange={e=>ch("active",e.target.checked)}
            />
            VISIBLE IN SHOP
          </label>

          {error&&<div className="av-admin-error">{error}</div>}

          <div className="av-admin-actions">
            <button
              className="av-btn av-btn-primary"
              disabled={saving}
            >
              {saving?"SAVING…":"SAVE PRODUCT ↗"}
            </button>

            <button
              type="button"
              className="av-btn av-btn-danger"
              disabled={deleting}
              onClick={del}
            >
              {deleting?"DELETING…":"DELETE PRODUCT"}
            </button>
          </div>
        </form>

        <AdminFooter/>
      </section>
    </main>
  );
}
