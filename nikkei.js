import axios from "axios";
import pg from "pg";
import { v4 as uuid } from "uuid";

/*************************************
  https://cfnews.310soft.com/nytimes,
  https://cfnews.310soft.com/bbc",
  https://cfnews.310soft.com/nikkei,
  https://cfnews.310soft.com/joins
  ***********************************/

const { Client } = pg;
const newsApiUrls = "https://cfnews.310soft.com/nikkei";

const postgresParams = {
  user: "ryan",
  host: "192.168.2.8",
  database: "310soft",
  password: "password",
  port: "5432",
};

async function getToken() {
  const response = await axios("https://token.310soft.com/getToken");
  return response.data;
}

async function fetchNews(apiUrl) {
  const token = await getToken();
  const news = [];

  try {
    const response = await axios(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status == 200) news.push(...response.data);
  } catch (e) {}

  return news;
}

async function saveToPostgres(newsData, dbParams) {
  const client = new Client(dbParams);
  try {
    await client.connect();

    for (const article of newsData || []) {
      try {
        const { title, content, publication_date, photos, publisher } = article;
        const result = await client.query(
          'SELECT EXISTS (SELECT 1 FROM "News" WHERE title = $1) as "exists"',
          [title]
        );
        if (result.rows[0].exists === true) continue;
        const insertQuery = `INSERT INTO "News" (id,title, content, published_at,photos,"publisherId") VALUES ($1,$2,$3,$4,$5,$6)`;
        const values = [
          uuid(),
          title,
          content,
          publication_date,
          photos,
          publisher,
        ];
        await client.query(insertQuery, values);
      } catch (e) {
        console.log("Error", article);
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

(async () => {
  try {
    const newsData = await fetchNews(newsApiUrls);
    await saveToPostgres(newsData, postgresParams);
    console.log("News successfully fetched and saved to PostgreSQL.");
  } catch (error) {
    console.error(`An error occurred: ${error}`);
  }
})();
