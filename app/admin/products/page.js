import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {validSession} from "../../../lib/auth";
import {getProducts} from "../../../lib/db";
import AdminSidebar from "../../components/AdminSidebar";
import AdminFooter from "../../components/AdminFooter";

export const dynamic="force-dynamic";

export default async function Products(){
  const c=await cookies();
  if(!(await validSession(c.get("avancy_admin")?.value))) redirect("/admin/login");

  const ps=await getProducts();

  return (
    <main className="av-admin-shell">
      <AdminSidebar/>

      <section className="av-admin-content">

        <header className="av-admin-header">
          <div>
            <p className="av-admin-kicker">CATALOGUE / CLOUDINARY</p>
            <h1>PRODUCTS.</h1>
          </div>

          <Link
            href="/admin/products/new"
            className="av-btn av-btn-primary"
          >
            + ADD PRODUCT
          </Link>
        </header>

        <div className="av-admin-products-list">

          {ps.map(p => (
            <article className="av-product-admin-card" key={p.id}>

              <div className="av-product-admin-image">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name || "Product"}
                  />
                ) : (
                  <div className="av-product-admin-image-empty">
                    NO IMAGE
                  </div>
                )}
              </div>

              <div className="av-product-admin-info">

                <div className="av-product-admin-topline">

                  <div>
                    <span className="av-product-admin-label">
                      PRODUCT
                    </span>

                    <h2>{p.name}</h2>
                  </div>

                  <span
                    className={`av-product-admin-status ${
                      p.active === false ? "draft" : "live"
                    }`}
                  >
                    ● {p.active === false ? "DRAFT" : "LIVE"}
                  </span>

                </div>

                <div className="av-product-admin-price">
                  ₹{Number(p.price || 0).toLocaleString("en-IN")}
                </div>

                <div className="av-product-admin-meta">

                  <div>
                    <small>ID</small>
                    <strong>{p.id}</strong>
                  </div>

                  <div>
                    <small>CATEGORY</small>
                    <strong>{p.category || "—"}</strong>
                  </div>

                  <div>
                    <small>COLOR</small>
                    <strong>{p.color || "—"}</strong>
                  </div>

                </div>

                <div className="av-product-admin-actions">

                  <span>AVANCY CATALOGUE</span>

                  <Link
                    href={`/admin/products/${p.id}`}
                    className="av-product-admin-edit"
                  >
                    EDIT PRODUCT <b>→</b>
                  </Link>

                </div>

              </div>

            </article>
          ))}

          {!ps.length && (
            <p className="av-muted">No products yet.</p>
          )}

        </div>

        <AdminFooter/>

      </section>
    </main>
  );
}
