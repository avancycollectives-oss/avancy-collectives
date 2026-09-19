"use client";
import {useMemo,useState} from 'react';
import ProductCard from '../components/ProductCard';
export default function ShopGrid({products=[]}){const[q,setQ]=useState('');const shown=useMemo(()=>products.filter(p=>`${p.name} ${p.category} ${p.color} ${p.description||''}`.toLowerCase().includes(q.toLowerCase().trim())),[products,q]);return <><div className="shop-search">
  <svg
    className="shop-search-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{
      position: "absolute",
      left: "18px",
      top: "50%",
      width: "21px",
      height: "21px",
      transform: "translateY(-50%)",
      display: "block",
      zIndex: 10,
      pointerEvents: "none",
      fill: "none",
      stroke: "#777777",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }}
  >
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m16 16 5 5" />
  </svg>
  <input
    value={q}
    onChange={e => setQ(e.target.value)}
    placeholder="Search products, colours, graphics…"
    aria-label="Search products"
    style={{
      width: "100%",
      boxSizing: "border-box",
      paddingLeft: "54px",
      paddingRight: "18px",
      color: "#ffffff",
      background: "#161616",
      caretColor: "#E2F952",
      WebkitTextFillColor: "#ffffff"
    }}
  />
</div>{shown.length?<div className="ac-product-grid">{shown.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="ac-empty">No matching products.</div>}</>}
