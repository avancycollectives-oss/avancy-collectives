export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "../../products";
import { getApprovedCollectiveSubmissions } from "../../../lib/db";
import ProductArt from "../../components/ProductArt";
import AddToCart from "../../components/AddToCart";
import StoreHeader from "../../components/StoreHeader";
import ProductCollective from "./ProductCollective";

const BASE_URL = "https://avancy-collectives.vercel.app";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await getProduct(id);
  const collectivePhotos = p
    ? await getApprovedCollectiveSubmissions(p.id)
    : [];

  if (!p || p.active === false) {
    return {
      title: "Product Not Found",
      description: "This Avancy Collectives product could not be found.",
    };
  }

  const title = `${p.name} | Avancy Collectives`;
  const description =
    p.description ||
    `Shop ${p.name} from Avancy Collectives. Premium streetwear and original graphic design.`;

  const image = p.image || undefined;
  const canonicalUrl = `${BASE_URL}/product/${p.id}`;

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "Avancy Collectives",
      title,
      description,
      images: image
        ? [
            {
              url: image,
              alt: p.name,
            },
          ]
        : [],
    },

    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

export default async function ProductPage({ params }) {
  const p = await getProduct((await params).id);

  if (!p || p.active === false) return notFound();

  const collectivePhotos = await getApprovedCollectiveSubmissions(p.id);

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  description: p.description || "",
  image: p.image ? [p.image] : [],
  sku: String(p.id),
  brand: {
    "@type": "Brand",
    name: "Avancy Collectives",
  },
  offers: {
    "@type": "Offer",
    url: `${BASE_URL}/product/${p.id}`,
    priceCurrency: "INR",
    price: Number(p.price || 0).toFixed(2),
    availability:
      p.active && Object.values(p.stock || {}).some((qty) => Number(qty) > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  },
};
  return (
    <main className="ac-site">
      <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(productSchema),
  }}
/>
      <StoreHeader products={[p]} />

      <section className="product-detail">
        <div className="product-art-column">
          <ProductArt product={p} large />

          <ProductCollective
            initialPhotos={collectivePhotos}
            productId={p.id}
            productName={p.name}
          />
        </div>

        <div className="product-copy">
          <span>{p.category} / AVNC</span>

          <h1>{p.name}</h1>

          <strong className="product-price">
            ₹{Number(p.price || 0).toLocaleString("en-IN")}
          </strong>

          <p>{p.description}</p>

          <div className="specs">
            <div>
              <small>FABRIC</small>
              <b>{p.fabric || "Cotton"}</b>
            </div>

            <div>
              <small>WEIGHT</small>
              <b>{p.gsm || "—"}</b>
            </div>

            <div>
              <small>FIT</small>
              <b>{p.fit || "Relaxed"}</b>
            </div>

            <div>
              <small>COLOUR</small>
              <b>{p.color}</b>
            </div>
          </div>

          {p.sizeMeasurements &&
            Object.keys(p.sizeMeasurements).some(
              (size) => p.sizeMeasurements[size]
            ) && (
              <details className="product-size-guide">
                <summary>SIZE GUIDE</summary>

                <p className="size-guide-note">
                  Product measurements are shown in centimetres (cm).
                  Measurements may vary slightly.
                </p>

                <div className="size-guide-table-wrap">
                  <table className="size-guide-table">
                    <thead>
                      <tr>
                        <th>SIZE</th>
                        <th>CHEST</th>
                        <th>LENGTH</th>
                        <th>SHOULDER</th>
                        <th>SLEEVE</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Object.entries(p.sizeMeasurements)
                        .filter(
                          ([, measurements]) =>
                            measurements &&
                            Object.values(measurements).some(
                              (value) =>
                                value !== "" &&
                                value !== null &&
                                value !== undefined
                            )
                        )
                        .sort(([a], [b]) => {
                          const order = Array.isArray(p.sizes)
                            ? p.sizes
                            : String(p.sizes || "")
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean);

                          const ai = order.indexOf(a);
                          const bi = order.indexOf(b);

                          return (
                            (ai === -1 ? 999 : ai) -
                            (bi === -1 ? 999 : bi)
                          );
                        })
                        .map(([size, measurements]) => (
                          <tr key={size}>
                            <th>{size}</th>
                            <td>{measurements.chest || "—"}</td>
                            <td>{measurements.length || "—"}</td>
                            <td>{measurements.shoulder || "—"}</td>
                            <td>{measurements.sleeve || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

          <AddToCart product={p} />

          <details open>
            <summary>DESCRIPTION</summary>
            <p>{p.description}</p>
          </details>

          <details>
            <summary>SHIPPING</summary>
            <p>
              Orders are prepared after checkout. Tracking becomes available
              once your order is created.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}