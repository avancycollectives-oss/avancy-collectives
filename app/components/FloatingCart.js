"use client";
import CartLink from "./CartLink";
export default function FloatingCart(){return <div style={{position:"fixed",right:16,bottom:16,zIndex:50}}><CartLink/></div>}
