import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { validSession } from '../../../../lib/auth';
import { getOrder } from '../../../../lib/db';
import AdminSidebar from '../../../components/AdminSidebar';import AdminFooter from '../../../components/AdminFooter';
import AdminOrderDetailClient from '../../../components/AdminOrderDetailClient';
export const dynamic='force-dynamic';
export default async function AdminOrderDetail({params}){const c=await cookies();if(!(await validSession(c.get('avancy_admin')?.value)))redirect('/admin/login');const {id}=await params;const order=await getOrder(id);if(!order)notFound();return <main className="admin-shell"><AdminSidebar/><section className="admin-main"><div className="admin-head"><div><span>SALES / ORDER DETAIL</span><h1>ORDER.</h1></div><span className="admin-live">LIVE CONTROL</span></div><AdminOrderDetailClient order={order}/><AdminFooter/></section></main>}
