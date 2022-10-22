import { serversStatus } from "./scrapeServerStatus";
import prisma from "../lib/prisma";
import * as dotenv from "dotenv";
import app from "./webapp";
import { delay } from "./lib/delay";
import { keepHerokuAlive } from "./lib/keepHerokuAlive";

dotenv.config();
app.listen(process.env.PORT);

console.log(`
  Scraper Enabled: ${process.env.SCRAPER_ENABLED}
  Scraper Timeout: ${process.env.SCRAPER_TIMEOUT}
  Database Url: ${process.env.DATABASE_URL ? true : false}

  ${
    process.env.HEROKU_URL
      ? `${`HEROKU_URL found. Attempting to keep alive ${process.env.HEROKU_URL}`}`
      : false
  } 
  `);

async function updateDatabase() {
  try {
    while (process.env.SCRAPER_ENABLED) {
      const scrapedServerList = await serversStatus();
      scrapedServerList.map((server: any) => {
        // Create server if it doesn't exist
        prisma.server
          .create({
            data: {
              uniqueName: `${server.name} - ${server.region}`,
              name: server.name,
              region: server.region,
            },
          })
          .then((server) => {
            console.log(`Server added ${server.name}`);
          })
          .catch((err: any) => {
            if (
              err.code === "P2002" &&
              err.meta.target === "Server_uniqueName_key"
            ) {
              // Not an error. Server exists.
            } else {
              console.log(err);
            }
          });

        prisma.server
          .findUnique({
            where: { uniqueName: `${server.name} - ${server.region}` },
            select: { serverStatus: true },
          })
          .then((uniqueServer: any) => {
            const lastStatus = uniqueServer?.serverStatus.pop();
            //   console.log({
            //     name: server.name,
            //     lastStatus: lastStatus,
            //     currentStatus: server,
            //   });

            if (lastStatus?.status === server.status) {
              // No point no changes
            } else {
              prisma.server
                .update({
                  where: { uniqueName: `${server.name} - ${server.region}` },
                  data: {
                    serverStatus: {
                      create: {
                        status: server.status,
                      },
                    },
                  },
                })
                .then(() => {
                  console.log(`Added new server status for ${server.name}`);
                })
                .catch((err: any) => {
                  console.log(err);
                });
            }
          });
      });

      const dbServerList = await prisma.server
        .findMany({
          select: {
            name: true,
            region: true,
            serverStatus: { take: 1 },
          },
        })
        .then((res) => {
          return res.map((server) => {
            return {
              name: server.name,
              region: server.region,
              status: server.serverStatus[0].status,
            };
          });
        });

      // Determine offline servers
      dbServerList.map((dbServer: any) => {
        const dbHasScrapedServer = scrapedServerList.filter(
          (scrapedServer: any) =>
            scrapedServer.name === dbServer.name &&
            scrapedServer.region === dbServer.region
        );

        if (dbHasScrapedServer.length === 0) {
          prisma.server
            .findUnique({
              where: { uniqueName: `${dbServer.name} - ${dbServer.region}` },
              select: { name: true, region: true, serverStatus: true },
            })
            .then((uniqueServer: any) => {
              const lastStatus = uniqueServer?.serverStatus.pop();

              if (lastStatus?.status === "Offline") {
                // No point no changes
              } else {
                prisma.server
                  .update({
                    where: {
                      uniqueName: `${uniqueServer.name} - ${uniqueServer.region}`,
                    },
                    data: {
                      serverStatus: {
                        create: {
                          status: "Offline",
                        },
                      },
                    },
                  })
                  .then(() => {
                    console.log(`Added new server status for ${dbServer.name}`);
                  })
                  .catch((err: any) => {
                    console.log(err);
                  });
              }
            });
        }
      });

      // Determine delay
      await delay(
        process.env.SCRAPER_TIMEOUT
          ? parseInt(process.env.SCRAPER_TIMEOUT)
          : 60000
      );
    }
  } catch (err) {
    console.log(err);
    // Long delay on error
    await delay(
      process.env.SCRAPER_TIMEOUT
        ? parseInt(process.env.SCRAPER_TIMEOUT) * 2
        : 120000
    );
    updateDatabase();
  }
}

updateDatabase();
keepHerokuAlive();
