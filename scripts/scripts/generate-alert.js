const fs = require("fs");
const axios = require("axios");
const sharp = require("sharp");

const PRIORITY = [
  "Hurricane Warning",
  "Hurricane Watch",
  "Tropical Storm Warning",
  "Tropical Storm Watch",
  "Flash Flood Warning",
  "Flood Warning",
  "Severe Thunderstorm Warning",
  "Heat Advisory",
  "Flood Advisory",
  "High Surf Advisory",
  "High Rip Current Risk",
  "Small Craft Advisory",
  "Marine Weather Statement"
];

const COLORS = {
  "Hurricane Warning": "#D90429",
  "Hurricane Watch": "#F77F00",
  "Tropical Storm Warning": "#FF8500",
  "Tropical Storm Watch": "#FFD60A",
  "Flash Flood Warning": "#7B2CBF",
  "Flood Warning": "#4361EE",
  "Flood Advisory": "#4CC9F0",
  "Heat Advisory": "#FF8500",
  "High Surf Advisory": "#00B4D8",
  "High Rip Current Risk": "#48CAE4",
  "Small Craft Advisory": "#FFC300",
  "Marine Weather Statement": "#00B4D8",
  "Severe Thunderstorm Warning": "#FFB703"
};

function sanitize(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function chooseAlert(features) {
  for (const alertName of PRIORITY) {
    const match = features.find(
      f => f.properties.event === alertName
    );

    if (match) {
      return match.properties;
    }
  }

  return features[0]?.properties;
}

function createScene(event) {

  if (event.includes("Heat")) {
    return `
      <circle cx="850" cy="200" r="125" fill="#FDB813"/>
      <circle cx="850" cy="200" r="180" fill="#FDB813" opacity="0.15"/>

      <path d="
        M0 950
        Q200 900 400 940
        T800 900
        T1080 930
        L1080 1350
        L0 1350 Z"
        fill="#005F73"/>
    `;
  }

  if (
    event.includes("Flood") ||
    event.includes("Surf") ||
    event.includes("Rip")
  ) {

    return `
      <path d="
      M0 850
      Q140 720 280 850
      T560 830
      T840 820
      T1080 850
      L1080 1350
      L0 1350 Z"
      fill="#00B4D8"/>

      <path d="
      M0 980
      Q180 900 360 980
      T720 960
      T1080 1000
      L1080 1350
      L0 1350 Z"
      fill="#90E0EF"
      opacity="0.65"/>
    `;
  }

  if (
    event.includes("Thunderstorm") ||
    event.includes("Hurricane") ||
    event.includes("Tropical")
  ) {

    return `
      <ellipse
        cx="550"
        cy="260"
        rx="420"
        ry="140"
        fill="#495057"/>

      <ellipse
        cx="420"
        cy="320"
        rx="260"
        ry="90"
        fill="#6C757D"/>

      <path
      d="
      M680 200
      L620 360
      L700 360
      L590 560"
      stroke="#FFD60A"
      stroke-width="18"
      fill="none"/>

      <path d="
      M0 1040
      Q180 980 360 1040
      T720 1030
      T1080 1080
      L1080 1350
      L0 1350 Z"
      fill="#0077B6"/>
    `;
  }

  return `
    <path d="
      M0 1040
      Q180 980 360 1040
      T720 1030
      T1080 1080
      L1080 1350
      L0 1350 Z"
      fill="#0096C7"/>
  `;
}

async function run() {

  const response = await axios.get(
    "https://api.weather.gov/alerts/active?area=PR",
    {
      headers: {
        "User-Agent": "rabirubiawx.com"
      }
    }
  );

  const alerts =
    response.data.features || [];

  let alert =
    chooseAlert(alerts);

  if (!alert) {

    alert = {
      event: "No Active Alerts",
      severity: "Information",
      headline:
        "No active alerts for Puerto Rico.",
      description:
        "Current weather conditions are stable.",
      expires: new Date().toISOString()
    };
  }

  const color =
    COLORS[alert.event] ||
    "#00B4D8";

  const headline =
    sanitize(
      alert.headline ||
      alert.event
    );

  const description =
    sanitize(
      (alert.description || "")
        .replace(/\n/g, " ")
        .substring(0, 250)
    );

  const expires =
    alert.expires
      ? new Date(alert.expires)
          .toLocaleString("en-US", {
            timeZone:
              "America/Puerto_Rico"
          })
      : "N/A";

  const svg = `
  <svg
   xmlns="http://www.w3.org/2000/svg"
   width="1080"
   height="1350">

   <defs>
      <linearGradient
        id="bg"
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%">
        <stop offset="0%" stop-color="#001233"/>
        <stop offset="100%" stop-color="#003566"/>
      </linearGradient>
   </defs>

   <rect
     width="1080"
     height="1350"
     fill="url(#bg)"/>

   ${createScene(alert.event)}

   <text
    x="60"
    y="80"
    fill="#90E0EF"
    font-size="34">
    Rabirubia Weather
   </text>

   <rect
    x="60"
    y="120"
    width="960"
    height="95"
    rx="18"
    fill="${color}"/>

   <text
    x="95"
    y="182"
    fill="white"
    font-size="52"
    font-weight="bold">
    ${sanitize(alert.event)}
   </text>

   <foreignObject
    x="60"
    y="260"
    width="950"
    height="220">

      <div xmlns="http://www.w3.org/1999/xhtml"
      style="
      color:white;
      font-size:42px;
      font-family:Arial;
      font-weight:bold;">
      ${headline}
      </div>

   </foreignObject>

   <foreignObject
    x="60"
    y="520"
    width="950"
    height="300">

      <div xmlns="http://www.w3.org/1999/xhtml"
      style="
      color:#caf0f8;
      font-size:28px;
      line-height:1.4;
      font-family:Arial;">
      ${description}
      </div>

   </foreignObject>

   <text
    x="60"
    y="1020"
    fill="white"
    font-size="34">
    Severity:
    ${sanitize(alert.severity || "N/A")}
   </text>

   <text
    x="60"
    y="1080"
    fill="white"
    font-size="28">
    Expires:
    ${expires}
   </text>

   <rect
    x="0"
    y="1260"
    width="1080"
    height="90"
    fill="#001020"/>

   <text
    x="540"
    y="1316"
    text-anchor="middle"
    fill="white"
    font-size="34">
    rabirubiawx.com
   </text>

  </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(
      "public/weather/nws-latest.png"
    );

  fs.writeFileSync(
    "public/weather/nws-latest.json",
    JSON.stringify(
      {
        updated: new Date().toISOString(),
        event: alert.event,
        severity: alert.severity,
        expires: alert.expires
      },
      null,
      2
    )
  );
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
