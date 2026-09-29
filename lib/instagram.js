const API_VERSION = process.env.INSTAGRAM_API_VERSION || "v23.0";
const DEFAULT_IG_USER_ID = "28769639312721926";

function getConfig() {
  const accessToken = String(process.env.INSTAGRAM_ACCESS_TOKEN || "").trim();
  const igUserId = String(
    process.env.INSTAGRAM_USER_ID || DEFAULT_IG_USER_ID
  ).trim();

  if (!accessToken) {
    throw new Error(
      "INSTAGRAM_ACCESS_TOKEN is missing from .env.local."
    );
  }

  if (!igUserId) {
    throw new Error(
      "INSTAGRAM_USER_ID is missing."
    );
  }

  return {
    accessToken,
    igUserId,
  };
}

async function instagramRequest(path, options = {}) {
  const { accessToken } = getConfig();

  const response = await fetch(
    `https://graph.instagram.com/${API_VERSION}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers || {}),
      },
      cache: "no-store",
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data?.error) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Instagram API request failed with status ${response.status}.`;

    const error = new Error(message);
    error.status = response.status;
    error.instagram = data;
    throw error;
  }

  return data;
}

function buildCollectiveCaption(postNumber, productName) {
  const number = String(postNumber || 0).padStart(3, "0");
  const product = String(productName || "AVANCY COLLECTIVES")
    .trim()
    .slice(0, 180);

  return [
    `AVANCY COLLECTIVES — ${number}`,
    "",
    "WORN BY THE COLLECTIVE.",
    "",
    `PRODUCT: ${product}`,
    "",
    "#AvancyCollectives #TheCollective #Avancy #AN",
  ].join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function publishCollectiveToInstagram({
  imageUrl,
  productName,
  postNumber,
}) {
  if (!imageUrl) {
    throw new Error("Collective image URL is missing.");
  }

  const { igUserId } = getConfig();

  const caption = buildCollectiveCaption(
    postNumber,
    productName
  );

  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
  });

  const container = await instagramRequest(
    `/${igUserId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  const creationId = String(container?.id || "").trim();

  if (!creationId) {
    throw new Error(
      "Instagram did not return a media container ID."
    );
  }

  // Give Instagram time to fetch/process the public Cloudinary image.
  let ready = false;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await sleep(3000);

    const status = await instagramRequest(
      `/${creationId}?fields=status_code,status`
    );

    if (status?.status_code === "FINISHED") {
      ready = true;
      break;
    }

    if (
      status?.status_code === "ERROR" ||
      status?.status_code === "EXPIRED"
    ) {
      throw new Error(
        status?.status ||
          `Instagram media container failed with status ${status?.status_code}.`
      );
    }
  }

  if (!ready) {
    throw new Error(
      "Instagram media container was not ready for publishing within the expected time."
    );
  }

  const publishParams = new URLSearchParams({
    creation_id: creationId,
  });

  const published = await instagramRequest(
    `/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: publishParams.toString(),
    }
  );

  const mediaId = String(published?.id || "").trim();

  if (!mediaId) {
    throw new Error(
      "Instagram did not return the published media ID."
    );
  }

  return {
    mediaId,
    creationId,
    caption,
  };
}
