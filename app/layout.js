import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://avancy-collectives.vercel.app"),

  title: {
    default: "Avancy Collectives | Premium Streetwear",
    template: "%s | Avancy Collectives",
  },

  description:
    "Shop Avancy Collectives for premium streetwear, graphic tees and custom printed clothing. Discover original designs and create your own custom piece.",

  keywords: [
    "Avancy Collectives",
    "Avancy",
    "streetwear",
    "streetwear India",
    "premium streetwear",
    "graphic t shirts",
    "oversized t shirts",
    "custom t shirts",
    "custom printed t shirts",
    "printed t shirts India",
    "streetwear Chennai",
    "Indian streetwear",
  ],

  applicationName: "Avancy Collectives",

  authors: [
    {
      name: "Avancy Collectives",
      url: "https://avancy-collectives.vercel.app",
    },
  ],

  creator: "Avancy Collectives",
  publisher: "Avancy Collectives",

  alternates: {
    canonical: "https://avancy-collectives.vercel.app",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://avancy-collectives.vercel.app",
    siteName: "Avancy Collectives",
    title: "Avancy Collectives | Premium Streetwear",
    description:
      "Premium streetwear, graphic tees and custom printed clothing by Avancy Collectives.",
  },

  twitter: {
    card: "summary",
    title: "Avancy Collectives | Premium Streetwear",
    description:
      "Premium streetwear, graphic tees and custom printed clothing by Avancy Collectives.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}