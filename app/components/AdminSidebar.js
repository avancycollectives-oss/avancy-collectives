import Link from 'next/link';
import LogoutButton from './LogoutButton';
import AdminNavLinks from './AdminNavLinks';

export default function AdminSidebar(){
  return (
    <aside className="admin-side">
      <Link href="/" className="admin-logo">
        AVANCY<small>COLLECTIVES</small>
      </Link>

      <span>CONTROL ROOM</span>

      <AdminNavLinks />

      <form>
        <LogoutButton admin/>
      </form>
    </aside>
  );
}
