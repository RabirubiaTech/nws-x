const fs = require("fs");
const path = require("path");

const BEARER = process.env.TWITTER_BEARER_TOKEN;

const KEYWORDS = [
  "advisory",
  "warning",
  "watch",
  "flood",
  "flooding",
  "storm",
  "tropical",
  "hurricane",
  "marine",
  "weather statement"
];

async function twitter(url) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${BEARER}`
    }
  });

  if (!r.ok) {
    throw new Error(await r.text());
  }

  return r.json();
}

async function main() {
  // NWS San Juan user id currently should be looked up once and stored
  const USER_ID = "18169117";

  const tweets = await twitter(
    `https://api.twitter.com/2/users/${USER_ID}/tweets?max_results=20&tweet.fields=created_at,attachments,text&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`
  );

  const mediaMap = {};

  if (tweets.includes?.media) {
    tweets.includes.media.forEach(m => {
      mediaMap[m.media_key] = m;
    });
  }

  const match = tweets.data.find(tweet => {
    const text = tweet.text.toLowerCase();

    return KEYWORDS.some(keyword =>
      text.includes(keyword)
    );
  });

  if (!match) {
    console.log("No matching advisory found");
    return;
  }

  let imageUrl = null;

  for (const key of match.attachments?.media_keys || []) {
    const media = mediaMap[key];

    if (media?.type === "photo" && media.url) {
      imageUrl = media.url;
      break;
    }
  }

  if (!imageUrl) {
    console.log("No image found");
    return;
  }

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  fs.writeFileSync(
    path.join("public", "nws-latest.jpg"),
    imageBuffer
  );

  fs.writeFileSync(
    path.join("public", "nws-latest.json"),
    JSON.stringify(
      {
        updated: new Date().toISOString(),
        tweetId: match.id,
        text: match.text,
        image: "/nws-latest.jpg"
      },
      null,
      2
    )
  );

  console.log("Updated image");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
