import { delay } from "./delay";
import axios from "axios";

export async function keepHerokuAlive() {
  try {
    while (process.env.HEROKU_URL ? true : false) {
      axios.get(process.env.HEROKU_URL).then((res) => {
        const { status } = res.data;
        console.log(`Heroku Status: ${status}`);
      });
      await delay(
        process.env.SCRAPER_TIMEOUT
          ? parseInt(process.env.SCRAPER_TIMEOUT)
          : 60000
      );
    }
  } catch {
    // Determine delay
    await delay(
      process.env.SCRAPER_TIMEOUT
        ? parseInt(process.env.SCRAPER_TIMEOUT) * 2
        : 120000
    );
  }
}
