import axios from 'axios'
import pg from 'pg'
import { v4 as uuid } from 'uuid';

const {Client}=pg
const newsApiUrl = 'https://cfnews.310soft.com/getNews';
const postgresParams = {
    user: 'ryan',
    host: '192.168.2.8',
    database: 'mysite',
    password: '',
    port: '5432',
};

async function getToken(){
    const response=await axios("https://token.310soft.com/getToken")
    return response.data
}


async function fetchNews(apiUrl) {
    const token=await getToken()
    const response = await axios(apiUrl,{headers:{Authorization:`Bearer ${token}`}});
    if (response.status==200) {
        return response.data;
    } else {
        throw new Error(`Failed to fetch news. Status code: ${response.status}`);
    }
}


async function saveToPostgres(newsData, dbParams) {
    const client = new Client(dbParams);
    await client.connect(); 
    
    for (const article of newsData || []) {
        const { title, content, publication_date,photos,publisher } = article;
        const result=await client.query('SELECT EXISTS (SELECT 1 FROM "News" WHERE title = $1) as "exists"', [title])
        if(result.rows[0].exists===true) continue
        const insertQuery = `INSERT INTO "News" (id,title, content, published_at,photos,"publisherId") VALUES ($1,$2,$3,$4,$5,$6)`;
        const values = [uuid(),title, content, publication_date,photos,publisher];
        await client.query(insertQuery, values);
    }
    
    await client.end();
}


(async () => {
    try {      
        const newsData = await fetchNews(newsApiUrl);
        await saveToPostgres(newsData, postgresParams);
        console.log('News successfully fetched and saved to PostgreSQL.');
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
    }
})();

