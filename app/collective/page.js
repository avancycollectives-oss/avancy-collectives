import Link from "next/link";
import QRCode from "qrcode";
import { getActiveProducts, getApprovedCollectiveSubmissions } from "../../lib/db";
import CollectiveForm from "./CollectiveForm";
import CollectiveGallery from "./CollectiveGallery";

export const dynamic = "force-dynamic";

export default async function CollectivePage({ searchParams }) {
  const params = await searchParams;
  const selectedProduct = String(params?.product || "").trim();

  const [products, submissions] = await Promise.all([
    getActiveProducts(),
    getApprovedCollectiveSubmissions(selectedProduct),
  ]);

  const collectiveUrl = "https://avancycollectives.com/collective";

  const qrCode = await QRCode.toDataURL(collectiveUrl, {
    width: 420,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  const selected = products.find((p) => p.id === selectedProduct);

  return (
    <main className="collective-page">
      <header className="collective-nav">
        <Link href="/" className="collective-logo">
          AVANCY <small>COLLECTIVES</small>
        </Link>

        <nav>
          <Link href="/shop">SHOP</Link>
          <Link href="/create-yours">CREATE YOURS</Link>
          <Link href="/account">ACCOUNT</Link>
        </nav>
      </header>

      <section className="collective-hero">
        <span>AVANCY / THE COLLECTIVE</span>
        <h1>
          SHOW US
          <br />
          <em>YOUR AVANCY.</em>
        </h1>
        <p>
          Share a photo of your Avancy piece with us. With your permission,
          approved photos become part of The Collective on our website.
        </p>
      </section>

      <section id="collective-submit" className="collective-submit">
        <div className="collective-submit-copy">
          <span>01 / SUBMIT</span>
          <h2>YOUR PHOTO.</h2>
          <p>
            No social handle required. Just your name, your photo and your
            permission.
          </p>
        </div>

        <CollectiveForm
          products={products}
          selectedProduct={selected?.id || ""}
        />
      </section>

      <section className="collective-gallery">
        <div className="collective-section-head">
          <span>02 / APPROVED</span>
          <h2>
            {selected
              ? `${selected.name} / THE COLLECTIVE`
              : "THE COLLECTIVE."}
          </h2>
        </div>

        <CollectiveGallery
          initialSubmissions={submissions}
          productId={selectedProduct}
          selectedName={selected?.name || ""}
        />
      </section>

      <section className="collective-qr">
        <div>
          <span>03 / SHARE THE LINK</span>
          <h2>SCAN. SUBMIT. JOIN THE COLLECTIVE.</h2>
          <p>
            Scan this code to open the Avancy Collective photo submission
            page.
          </p>
        </div>

        <div className="collective-qr-box">
          <img src={qrCode} alt="QR code for Avancy The Collective" />
        </div>
      </section>

      <footer className="collective-footer">
        <span>AVANCY COLLECTIVES</span>
        <Link href="/">BACK TO AVANCY →</Link>
      </footer>
    </main>
  );
}
