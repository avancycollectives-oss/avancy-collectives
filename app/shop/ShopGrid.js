"use client";
import {useMemo,useState} from 'react';
import ProductCard from '../components/ProductCard';
export default function ShopGrid({products=[]}){const[q,setQ]=useState('');const shown=useMemo(()=>products.filter(p=>`${p.name} ${p.category} ${p.color} ${p.description||''}`.toLowerCase().includes(q.toLowerCase().trim())),[products,q]);return <><div className="shop-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, colours, graphics…"/><span>⌕</span></div>{shown.length?<div className="ac-product-grid">{shown.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="ac-empty">No matching products.</div>}</>}
