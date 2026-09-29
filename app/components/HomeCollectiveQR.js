import Link from "next/link";
import QRCode from "qrcode";

export default async function HomeCollectiveQR() {
  const collectiveUrl = "https://avancycollectives.com/collective";

  const qrCode = await QRCode.toDataURL(collectiveUrl, {
    width: 420,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return (
    <section className="home-collective-qr">
      <div className="home-collective-qr-copy">
        <span>AVANCY / THE COLLECTIVE</span>

        <h2>
          SHOW US
          <br />
          <em>YOUR AVANCY.</em>
        </h2>

        <p>
          Wearing Avancy? Scan the QR code and share
          your photo with The Collective.
        </p>

        <Link
          href="/collective"
          className="home-collective-qr-button"
        >
          JOIN THE COLLECTIVE →
        </Link>
      </div>

      <div className="home-collective-qr-box">
        <div className="home-collective-qr-frame">
          <img
            src={qrCode}
            alt="QR code to join the Avancy Collectives"
          />
        </div>

        <span>SCAN TO SUBMIT</span>
      </div>
    </section>
  );
}
