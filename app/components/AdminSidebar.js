import Link from 'next/link';
import LogoutButton from './LogoutButton';
export default function AdminSidebar(){return <aside className="admin-side"><Link href="/" className="admin-logo">AVANCY<small>COLLECTIVES</small></Link><span>CONTROL ROOM</span><Link href="/admin">DASHBOARD</Link><Link href="/admin/products">PRODUCTS</Link><Link href="/admin/products/new">+ NEW PRODUCT</Link><Link href="/admin/orders">ORDERS</Link><form><LogoutButton admin/></form></aside>}
