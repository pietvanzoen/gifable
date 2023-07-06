const https = require("https");
const fs = require("fs/promises");

const SEARCH = process.argv[2];
const CACHE_PATH = process.env.alfred_workflow_cache;
const { GIFABLE_TOKEN, GIFABLE_BASE_URL } = process.env;

async function main() {
  if (!GIFABLE_TOKEN) {
    console.log(
      JSON.stringify({
        items: [
          {
            title: "Token not set",
            subtitle: "Go to the workflow configuration to set your token",
            valid: false,
          },
        ],
      })
    );
    return;
  }

  let gifs;
  try {
    console.error("Fetching results...");
    gifs = await fetchResults(SEARCH);
  } catch (e) {
    console.error(`Error fetching results: ${e.message}`);
    return;
  }

  console.error("Caching files...");

  const cachedFiles = await Promise.all(
    gifs.map(async ({ url, id }) => ({
      id,
      url,
      href: `${GIFABLE_BASE_URL}/media/${id}`,
      path: await cacheURL(url),
    }))
  );

  const manifest = cachedFiles.reduce((acc, data) => {
    acc[data.path] = data;
    return acc;
  }, {});

  await fs.writeFile(`${CACHE_PATH}/manifest.json`, JSON.stringify(manifest));

  const items = gifs.map((gif) => {
    const title = gif.url.split("/").pop();
    const { path } = cachedFiles.find((f) => f.url === gif.url);
    return {
      uid: gif.url,
      title,
      type: "file",
      subtitle: gif.comment,
      arg: path,
      icon: { path },
    };
  });

  console.log(JSON.stringify({ items }));
}

async function cacheURL(url) {
  const filename = url.split("/").pop();
  const filePath = `${CACHE_PATH}/${filename}`;
  await fs.mkdir(CACHE_PATH, { recursive: true, force: true });
  try {
    console.error(`Checking cache for ${filename}`);
    await fs.access(filePath);
    return filePath;
  } catch (e) {
    console.error(`Downloading ${filename}`);
    console.error(`Writing ${filename}`);
    const buffer = await downloadURL(url);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }
}

async function fetchResults(search = "") {
  const url = `${GIFABLE_BASE_URL}/api/media?search=${search}`;
  headers = {
    authorization: `Bearer ${GIFABLE_TOKEN}`,
    Accept: "application/json",
  };

  console.error(`Fetching ${url}`);
  const resp = await fetch(url, { headers });

  console.error(`Got response ${resp.status}`);

  if (!resp.ok) {
    throw new Error(json.message);
  }

  const json = await resp.json();
  return json.data;
}

function downloadURL(url) {
  console.error(`Downloading ${url}`);
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = [];

      res.on("data", (chunk) => {
        data.push(chunk);
      });

      res.on("end", () => {
        if (res.statusCode > 299) {
          reject({ message: "Request failed", status: res.statusCode });
          return;
        }
        resolve(Buffer.concat(data));
      });
    });
  });
}

function chunk(arr, size) {
  const chunked_arr = [];
  let index = 0;
  while (index < arr.length) {
    chunked_arr.push(arr.slice(index, size + index));
    index += size;
  }
  return chunked_arr;
}


main();

