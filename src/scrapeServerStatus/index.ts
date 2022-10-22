import puppeteer from "puppeteer";

export async function serversStatus() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.tracing.start({
    path: "trace.json",
    categories: ["devtools.timeline"],
  });
  await page.goto("https://www.playlostark.com/en-gb/support/server-status");

  // Force console log onto node js rather than browser
  // page.on("console", async (msg) => {
  //   const msgArgs = msg.args();
  //   for (let i = 0; i < msgArgs.length; ++i) {
  //     console.log(await msgArgs[i].jsonValue());
  //   }
  // });

  const regions = await page.$$eval(
    "a.ags-ServerStatus-content-tabs-tabHeading",
    (regions) => {
      // Get the name and index of the region
      return regions.map((region) => {
        const regionIndex = region.getAttribute("data-index");
        const regionName = region
          .querySelector(`div.ags-ServerStatus-content-tabs-tabHeading-label`)
          ?.innerHTML.replace(/[\n\r]+|[\s]{2,}/g, " ")
          .trim();

        return { name: regionName, dataIndex: regionIndex };
      });
    }
  );

  const servers = await page.$$eval(
    "div.ags-ServerStatus-content-responses-response",
    (regions) => {
      return regions.map((regions) => {
        const regionIndex = regions.getAttribute("data-index");
        const servers = regions.querySelectorAll(
          "div.ags-ServerStatus-content-responses-response-server"
        );

        let result: any[] = [];
        servers.forEach((server) => {
          const serverName = server
            .querySelector(
              `div.ags-ServerStatus-content-responses-response-server-name`
            )
            ?.textContent?.replace(/[\n\r]+|[\s]{2,}/g, " ")
            .trim();

          const serverMaintenance = server.querySelector(
            `div.ags-ServerStatus-content-responses-response-server-status--maintenance`
          )?.innerHTML
            ? "Maintenance"
            : undefined;

          const serverBusy = server.querySelector(
            `div.ags-ServerStatus-content-responses-response-server-status--busy`
          )?.innerHTML
            ? "Busy "
            : undefined;

          const serverGood = server.querySelector(
            `div.ags-ServerStatus-content-responses-response-server-status--good`
          )?.innerHTML
            ? "Good"
            : undefined;

          const serverFull = server.querySelector(
            `div.ags-ServerStatus-content-responses-response-server-status--full`
          )?.innerHTML
            ? "Full"
            : undefined;

          const serverStatus =
            serverMaintenance || serverBusy || serverGood || serverFull;

          result.push({
            name: serverName,
            status: serverStatus,
            dataIndex: regionIndex,
          });
        });
        return result;
      });
    }
  );

  let result: any = [];
  servers.forEach((server) => {
    server.forEach((nestedServer) => {
      // Attach the server region to the server
      regions.forEach((region) => {
        if (nestedServer.dataIndex === region.dataIndex) {
          delete nestedServer.dataIndex;
          nestedServer.region = region.name;
          result.push(nestedServer);
        }
      });
    });
  });

  await page.tracing.stop();
  await browser.close();
  // console.log(result);
  return result;
}
