export default function robots() {
  const baseUrl = "https://avancy-collectives.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/account/",
          "/api/",
          "/checkout/",
          "/cart/",
          "/track-order/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}