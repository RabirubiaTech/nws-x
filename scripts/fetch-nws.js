const fs = require('fs');
const https = require('https');
const { chromium } = require('playwright');

const KEYWORDS = [
  'heat advisory',
  'heat',
  'excessive heat',
  'warning',
  'watch',
  'advisory',
  'flood',
  'flooding',
  'flash flood',
  'storm',
  'severe',
  'marine',
  'hazard',
  'thunderstorm',
  'tropical',
  'hurricane'
];

async function downloadImage(url, destination) {

  return new Promise((resolve, reject) => {

    const file = fs.createWriteStream(destination);

    https.get(url, response => {

      if (response.statusCode !== 200) {

        reject(
          new Error(
            `Download failed (${response.statusCode})`
          )
        );

        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(resolve);
      });

    }).on('error', reject);

  });
}

async function saveStatus(message) {

  fs.writeFileSync(
    'public/weather/nws-status.json',
    JSON.stringify(
      {
        updated: new Date().toISOString(),
        status: message
      },
      null,
      2
    )
  );
}

async function main() {

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    viewport: {
      width: 1440,
      height: 3000
    }
  });

  try {

    console.log('Loading NWSSanJuan...');

    await page.goto(
      'https://x.com/NWSSanJuan',
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    await page.waitForTimeout(8000);

    await page.screenshot({
      path: 'public/weather/debug.png',
      fullPage: true
    });

    fs.writeFileSync(
      'public/weather/page.html',
      await page.content()
    );

    const articleCount =
      await page.locator('article').count();

    console.log(
      `Articles found: ${articleCount}`
    );

    const result = await page.evaluate((keywords) => {

      const DAY_MS =
        24 * 60 * 60 * 1000;

      const candidates = [];

      const tweets = [
        ...document.querySelectorAll('article')
      ];

      for (const tweet of tweets) {

        const timeNode =
          tweet.querySelector('time');

        if (!timeNode) continue;

        const published =
          new Date(
            timeNode.getAttribute('datetime')
          );

        if (
          Date.now() -
          published.getTime() >
          DAY_MS
        ) {
          continue;
        }

        const text =
          tweet.innerText.toLowerCase();

        const matched =
          keywords.some(keyword =>
            text.includes(
              keyword.toLowerCase()
            )
          );

        if (!matched) continue;

        const images =
          [...tweet.querySelectorAll('img')]
          .filter(img =>
            img.src.includes(
              'pbs.twimg.com'
            )
          );

        if (images.length === 0)
          continue;

        candidates.push({
          timestamp:
            published.getTime(),
          datetime:
            published.toISOString(),
          imageUrl:
            images[0].src,
          text:
            tweet.innerText
        });
      }

      if (
        candidates.length === 0
      ) {
        return {
          articleCount:
            tweets.length,
          candidates: 0
        };
      }

      candidates.sort(
        (a, b) =>
          b.timestamp - a.timestamp
      );

      return {
        articleCount:
          tweets.length,
        candidates:
          candidates.length,
        latest:
          candidates[0]
      };

    }, KEYWORDS);

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );

    if (!result.latest) {

      await saveStatus(
        `No matching advisory image found. Articles=${result.articleCount}`
      );

      await browser.close();

      process.exit(0);
    }

    console.log(
      `Downloading ${result.latest.imageUrl}`
    );

    await downloadImage(
      result.latest.imageUrl,
      'public/weather/nws-latest.jpg'
    );

    fs.writeFileSync(
      'public/weather/nws-latest.json',
      JSON.stringify(
        {
          updated:
            new Date().toISOString(),
          source:
            'https://x.com/NWSSanJuan',
          alertDate:
            result.latest.datetime,
          image:
            '/weather/nws-latest.jpg',
          text:
            result.latest.text,
          matches:
            result.candidates
        },
        null,
        2
      )
    );

    await saveStatus(
      'Latest advisory image updated.'
    );

    console.log(
      'Latest advisory image saved.'
    );

    await browser.close();

  } catch (error) {

    console.error(error);

    await saveStatus(
      `Error: ${error.message}`
    );

    await browser.close();

    process.exit(0);
  }
}

main();
