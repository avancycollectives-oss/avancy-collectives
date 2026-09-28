"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";

export default function AdminLogin(){
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[error,setError]=useState("");
  const[busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(e){
    e.preventDefault();

    if(busy) return;

    setError("");
    setBusy(true);

    try{
      const r=await fetch("/api/auth/login",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password})
      });

      const d=await r.json();

      if(!r.ok){
        throw Error(d.error||"Login failed.");
      }

      router.push("/admin");
      router.refresh();
    }catch(e){
      setError(e.message);
      setBusy(false);
    }
  }

  return <main className="av-login-screen">
    <div className="av-login-card">
      <p className="av-label" style={{color:"#c9ff4a"}}>
        AVANCY COLLECTIVES / ADMIN
      </p>

      <h1>
        CONTROL<br/>
        <em style={{color:"#a78bfa",fontStyle:"normal"}}>ROOM.</em>
      </h1>

      <p className="av-muted">
        Manage the catalogue, images and orders from one place.
      </p>

      <form onSubmit={submit}>
        <label>
          EMAIL
          <input
            type="email"
            required
            value={email}
            disabled={busy}
            onChange={e=>setEmail(e.target.value)}
          />
        </label>

        <label>
          PASSWORD
          <input
            type="password"
            required
            value={password}
            disabled={busy}
            onChange={e=>setPassword(e.target.value)}
          />
        </label>

        {error&&
          <div className="av-admin-error">
            {error}
          </div>
        }

        <button
          type="submit"
          className="av-btn av-btn-accent full"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? "SIGNING IN..." : "SIGN IN ↗"}
        </button>
      </form>

      <a href="/">
        ← BACK TO STORE
      </a>
    </div>
  </main>;
}
