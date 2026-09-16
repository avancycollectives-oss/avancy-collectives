"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function SearchBox({ products = [] }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState(''), [remote, setRemote] = useState(products);
  useEffect(() => { if (open && !remote.length) fetch('/api/products',{cache:'no-store'}).then(r=>r.json()).then(d=>setRemote(d.products||[])).catch(()=>{}); }, [open, remote.length]);
  const source = remote.length ? remote : products;
  const hits = useMemo(() => source.filter(p => `${p.name} ${p.category} ${p.color} ${p.description}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0,8), [source,q]);
  return <><button className="ac-icon" aria-label="Search" onClick={()=>setOpen(true)}><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button>{open&&<div className="search-overlay" role="dialog" aria-modal="true"><div className="search-panel"><div className="search-head"><b>SEARCH AVANCY</b><button onClick={()=>{setOpen(false);setQ('')}} aria-label="Close search">×</button></div><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tees, hoodies, graphics…"/>{q&&<div className="search-results">{hits.length?hits.map(p=><Link key={p.id} href={`/product/${p.id}`} onClick={()=>setOpen(false)}><span>{p.image?<img src={p.image} alt=""/>:<i>{p.art}</i>}</span><div><b>{p.name}</b><small>{p.category} / {p.color}</small></div><strong>₹{Number(p.price||0).toLocaleString('en-IN')}</strong></Link>):<p>No products found.</p>}</div>}<div className="search-shortcuts"><Link href="/shop" onClick={()=>setOpen(false)}>SHOP ALL →</Link><Link href="/create-yours" onClick={()=>setOpen(false)}>CREATE YOURS →</Link></div></div></div>}</>;
}
