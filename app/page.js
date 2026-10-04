export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getActiveProducts } from './products';
import ProductCard from './components/ProductCard';
import StoreHeader from './components/StoreHeader';
import SiteFooter from './components/SiteFooter';
import HomeCollectiveQR from './components/HomeCollectiveQR';

export default async function Home() {
  let products = [];

  try {
    products = await getActiveProducts();
  } catch {}

  const featured = products.slice(0, 4);

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

        <div className="v6-products-explore">
          <Link href="/shop" className="v6-text-link">
            EXPLORE ALL PRODUCTS <span>→</span>
          </Link>
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
            <strong>₹799</strong>
          </div>

          <Link href="/create-yours" className="v6-btn v6-btn-yellow">
            START CREATING →
          </Link>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="v6-categories">
        <div className="v6-category-head">
          <span>03 / EXPLORE</span>
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

      {/* ABOUT */}
      <section id="about" className="v6-about">
        <div className="v6-section-intro">
          <span>04 / ABOUT AVANCY</span>

          <h2>
            YOUR KIND
            <br />
            OF <em>STYLE.</em>
          </h2>

          <p>
            Avancy Collectives is a streetwear collective built around
            individuality, original ideas and everyday expression.
          </p>

          <p>
            We create premium pieces for people who want to wear their
            identity their own way.
          </p>
        </div>

        <div className="v6-about-mark" aria-hidden="true">
          <div className="v6-an-mark">
            <strong className="v6-an-letter v6-an-a">A</strong>
            <span className="v6-an-divider"></span>
            <strong className="v6-an-letter v6-an-n">N</strong>
          </div>

          <small>AVANCY COLLECTIVES™</small>
        </div>
      </section>

      {/* SHIPPING & RETURNS */}
      <section id="shipping-returns" className="v6-shipping">
        <div className="v6-section-intro">
          <span>05 / SHIPPING & RETURNS</span>

          <h2>
            MADE TO
            <br />
            <em>ARRIVE.</em>
          </h2>

          <p>
            Every Avancy order is packed with care and shipped with
            tracking, so you know where your piece is from dispatch
            to doorstep.
          </p>
        </div>

        <div className="v6-shipping-grid">
          <article className="v6-shipping-card">
            <span>01</span>
            <h3>SHIPPING</h3>
            <p>
              Orders below ₹999 are charged the applicable delivery
              rate calculated at checkout.
            </p>
            <strong>FREE ABOVE ₹999</strong>
          </article>

          <article className="v6-shipping-card">
            <span>02</span>
            <h3>TRACKING</h3>
            <p>
              Once your order is shipped, tracking details are provided
              so you can follow its journey.
            </p>
            <strong>TRACK EVERY STEP</strong>
          </article>

          <article className="v6-shipping-card">
            <span>03</span>
            <h3>RETURNS</h3>
            <p>
              Eligible products can be requested for return within
              10 days of delivery, subject to our return conditions.
            </p>
            <strong>10-DAY RETURN WINDOW</strong>
          </article>

          <article className="v6-shipping-card v6-shipping-card-dark">
            <span>04</span>
            <h3>ORDER CARE</h3>
            <p>
              We pack every piece carefully before it leaves us.
              Keep your order and packaging details available if
              you need support.
            </p>
            <Link href="/track-order">TRACK YOUR ORDER →</Link>
          </article>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="v6-final">
        <span>06 / YOUR NEXT MOVE</span>

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

      <HomeCollectiveQR />
      <SiteFooter />
    </main>
  );
}
