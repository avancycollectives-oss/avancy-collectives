export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getActiveProducts } from './products';
import ProductCard from './components/ProductCard';
import StoreHeader from './components/StoreHeader';
import SiteFooter from './components/SiteFooter';

export default async function Home() {
  let products = [];

  try {
    products = await getActiveProducts();
  } catch {}

  const featured = products.slice(0, 4);
  const gallery = products.slice(0, 3);

  return (
    <main className="v6-home">
      <StoreHeader products={products} />

      {/* HERO */}
      <section className="v6-hero">
        <div className="v6-hero-grid" />

        <div className="v6-hero-copy">
          <span className="v6-eyebrow">
            EST. 2026 / CHENNAI, INDIA
          </span>

          <h1>
            WEAR
            <br />
            YOUR
            <br />
            <em>IDEA.</em>
          </h1>

          <p>
            PREMIUM STREETWEAR
            <br />
            <span className="v6-hero-motion-text">PRINTED ON DEMAND.</span>
          </p>

          <div className="v6-hero-actions">
            <Link href="/shop" className="v6-btn v6-btn-yellow">
              SHOP THE DROP <span>→</span>
            </Link>

            <Link href="/create-yours" className="v6-btn v6-btn-outline">
              CREATE YOURS <span>→</span>
            </Link>
          </div>
        </div>

        <div className="v6-hero-product">
          <div className="v6-hero-glow" />

          <div className="v6-tee-placeholder">
            <div className="v6-tee-neck" />
            <div className="v6-tee-body">
              <span>AVNC</span>
              <strong>YOUR<br />IDEA.</strong>
              <small>AVANCY COLLECTIVES</small>
            </div>
            <div className="v6-tee-sleeve v6-tee-left" />
            <div className="v6-tee-sleeve v6-tee-right" />
          </div>

          <div className="v6-floating-tag v6-tag-one">
            PRINTED
            <br />
            ON DEMAND
          </div>

          <div className="v6-floating-tag v6-tag-two">
            NO
            <br />
            LIMITS
          </div>

          <div className="v6-floating-tag v6-tag-three">
            <span className="v6-hero-motion-text v6-motion-design">DESIGN IT.</span>
            <br />
            <span className="v6-hero-motion-text v6-motion-wear">WEAR IT.</span>
          </div>
        </div>

        <div className="v6-hero-side">
          <span>STREETWEAR</span>
          <span>GRAPHICS</span>
          <span>MINIMAL</span>
          <span>CUSTOM</span>
        </div>

        <div className="v6-scroll">
          <span>SCROLL</span>
          <i />
        </div>
      </section>

      {/* MARQUEE */}
      <div className="v6-marquee">
        <div>
          AVANCY COLLECTIVES
          <b>×</b>
          WEAR YOUR IDEA
          <b>×</b>
          AVANCY COLLECTIVES
          <b>×</b>
          WEAR YOUR IDEA
          <b>×</b>
          AVANCY COLLECTIVES
          <b>×</b>
          WEAR YOUR IDEA
          <b>×</b>
        </div>
      </div>

      {/* NEW DROP */}
      <section className="v6-drop">
        <div className="v6-section-intro">
          <span>01 / THE LATEST</span>

          <h2>
            THE
            <br />
            NEW
            <br />
            <em>DROP.</em>
          </h2>

          <p>
            Fresh graphics.
            <br />
            Bold essentials.
            <br />
            Made on demand.
          </p>

          <Link href="/shop" className="v6-text-link">
            VIEW ALL PRODUCTS →
          </Link>
        </div>

        <div className="v6-products">
          {featured.length ? (
            featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))
          ) : (
            <div className="v6-product-empty">
              New pieces are landing soon.
            </div>
          )}
        </div>
      </section>

      {/* CREATE YOURS */}
      <section className="v6-create">
        <div className="v6-create-art">
          <div className="v6-create-circle" />

          <div className="v6-tee-placeholder v6-tee-custom">
            <div className="v6-tee-neck" />
            <div className="v6-tee-body">
              <span>YOUR</span>
              <strong>DESIGN</strong>
              <small>AVANCY CUSTOM</small>
            </div>
            <div className="v6-tee-sleeve v6-tee-left" />
            <div className="v6-tee-sleeve v6-tee-right" />
          </div>
        </div>

        <div className="v6-create-copy">
          <span>02 / MAKE IT YOURS</span>

          <h2>
            YOUR
            <br />
            DESIGN.
            <br />
            <em>OUR TEE.</em>
          </h2>

          <p>
            Create a piece that starts with your idea.
            Upload your design, customise your tee and
            make it yours.
          </p>

          <div className="v6-price">
            <small>STARTING FROM</small>
            <strong>₹699</strong>
          </div>

          <Link href="/create-yours" className="v6-btn v6-btn-yellow">
            START CREATING →
          </Link>
        </div>
      </section>

      {/* PRODUCT LOOKBOOK */}
      <section className="v6-lookbook">
        <div className="v6-lookbook-head">
          <span>03 / AVANCY AFTER DARK</span>

          <h2>
            PRODUCT
            <br />
            <em>STORIES.</em>
          </h2>

          <p>
            No models. No distractions.
            <br />
            Just the pieces.
          </p>
        </div>

        <div className="v6-lookbook-grid">
          <div className="v6-look-image v6-look-large">
            <div className="v6-image-slot v6-image-ready">
              <span>PRODUCT IMAGE 01</span>
              <small>/ replace later</small>
            </div>
            <b>01 / GRAPHIC</b>
          </div>

          <div className="v6-look-image">
            <div className="v6-image-slot v6-image-light">
              <span>PRODUCT IMAGE 02</span>
              <small>/ replace later</small>
            </div>
            <b>02 / MINIMAL</b>
          </div>

          <div className="v6-look-image">
            <div className="v6-image-slot v6-image-dark">
              <span>PRODUCT IMAGE 03</span>
              <small>/ replace later</small>
            </div>
            <b>03 / CUSTOM</b>
          </div>

          <div className="v6-look-image v6-look-wide">
            <div className="v6-image-slot v6-image-yellow">
              <span>PRODUCT IMAGE 04</span>
              <small>/ replace later</small>
            </div>
            <b>04 / AVANCY</b>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="v6-categories">
        <div className="v6-category-head">
          <span>05 / EXPLORE</span>
          <h2>SHOP BY CATEGORY</h2>
        </div>

        <div className="v6-category-grid">
          <Link href="/shop?category=GRAPHIC" className="v6-category">
            <div className="v6-category-image">
              <span>GRAPHIC TEE</span>
            </div>

            <div>
              <small>01</small>
              <h3>GRAPHIC</h3>
              <p>BOLD EXPRESSIONS</p>
              <strong>EXPLORE →</strong>
            </div>
          </Link>

          <Link href="/shop?category=MINIMAL" className="v6-category">
            <div className="v6-category-image v6-category-white">
              <span>MINIMAL TEE</span>
            </div>

            <div>
              <small>02</small>
              <h3>MINIMAL</h3>
              <p>CLEAN ESSENTIALS</p>
              <strong>EXPLORE →</strong>
            </div>
          </Link>

          <Link href="/create-yours" className="v6-category">
            <div className="v6-category-image v6-category-yellow">
              <span>CUSTOM TEE</span>
            </div>

            <div>
              <small>03</small>
              <h3>CUSTOM</h3>
              <p>YOUR DESIGN. OUR TEE.</p>
              <strong>EXPLORE →</strong>
            </div>
          </Link>
        </div>
      </section>

      {/* SHIPPING & RETURNS */}
      <section id="shipping" className="v6-shipping">
        <div className="v6-shipping-head">
          <span>06 / DELIVERY & RETURNS</span>

          <h2>
            SHIPPING
            <br />
            <em>& RETURNS</em>
          </h2>
        </div>

        <div className="v6-shipping-grid">
          <article>
            <span>01</span>
            <h3>SHIPPING</h3>
            <p>
              Orders are prepared and dispatched after
              purchase. Processing time can vary because
              products are printed on demand.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>TRACKING</h3>
            <p>
              Once your order is handed to the courier,
              follow its progress through Track Order.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>RETURNS</h3>
            <p>
              Eligible delivered orders can be submitted
              for a return within 10 days of delivery.
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>SUPPORT</h3>
            <p>
              Damaged, incorrect or printing-related
              issues can be reported with supporting photos.
            </p>
          </article>
        </div>

        <div className="v6-shipping-important">
          <strong>IMPORTANT</strong>
          <p>
            Custom or printed-on-demand products may be subject to additional return
            conditions where applicable. If your order arrives damaged, incorrect or
            with a printing issue, contact Avancy Collectives as soon as possible
            with supporting photos.
          </p>
        </div>

        <Link href="/track-order" className="v6-track-link">
          TRACK YOUR ORDER →
        </Link>
      </section>

      {/* SOCIAL */}
      <section className="v6-social">
        <div className="v6-social-copy">
          <span>07 / THE COLLECTIVE</span>

          <h2>
            FOLLOW
            <br />
            <em>AVANCY.</em>
          </h2>

          <p>@AVANCYCOLLECTIVES</p>
        </div>

        <div className="v6-social-grid">
          {gallery.length ? (
            gallery.map((product, index) => (
              <Link
                href={`/product/${product.id}`}
                key={product.id}
                className="v6-social-card"
              >
                <div className="v6-social-product">
                  <span>AVANCY</span>
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                </div>

                <small>VIEW PRODUCT →</small>
              </Link>
            ))
          ) : (
            <>
              <div className="v6-social-card">
                <div className="v6-social-product">
                  <span>AVANCY</span>
                  <strong>01</strong>
                </div>
              </div>

              <div className="v6-social-card">
                <div className="v6-social-product">
                  <span>AVANCY</span>
                  <strong>02</strong>
                </div>
              </div>

              <div className="v6-social-card">
                <div className="v6-social-product">
                  <span>AVANCY</span>
                  <strong>03</strong>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="v6-final">
        <span>08 / YOUR NEXT MOVE</span>

        <h2>
          WHAT'S
          <br />
          YOUR
          <br />
          <em>IDEA?</em>
        </h2>

        <div className="v6-final-actions">
          <Link href="/shop" className="v6-btn v6-btn-yellow">
            SHOP AVANCY →
          </Link>

          <Link href="/create-yours" className="v6-btn v6-btn-outline">
            CREATE YOURS →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
