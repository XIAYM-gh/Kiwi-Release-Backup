// src/asset-io.ts
import { createReadStream, createWriteStream, existsSync, unlinkSync } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";
async function download(url, outputPath) {
  const resp = await axios.get(url, {
    responseType: "stream",
    headers: {
      Accept: "application/octet-stream",
      "User-Agent": "Kiwi-Release-Backup-Client/0.0.1"
    }
  });
  const fileStream = createWriteStream(outputPath);
  try {
    await pipeline(resp.data, fileStream);
  } catch (err) {
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
    throw err;
  }
}

// src/request.ts
function getAuthorization() {
  return process.env.GH_TOKEN ? `Bearer ${process.env.GH_TOKEN}` : void 0;
}
async function doRequest(apiPath, reqParams = {}) {
  console.log("Requesting: " + apiPath);
  const headerResp = await fetch(`https://api.github.com${apiPath}${processQuery(reqParams.query)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: getAuthorization(),
      "Content-Type": "application/json",
      "User-Agent": "Kiwi-Release-Backup-Client/0.0.1",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    method: reqParams.body ? "POST" : "GET",
    body: reqParams.body ? JSON.stringify(reqParams.body) : null
  });
  if (!headerResp.ok) {
    throw "Resp not ok: " + headerResp.status;
  }
  return await headerResp.json();
}
function processQuery(queryParams) {
  if (!queryParams) {
    return "";
  }
  return "?" + Object.entries(queryParams).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
}

// src/index.ts
var KIWI_REPO = "kiwibrowser/src.next";
var THIS_REPO = process.env.REPO ?? "XIAYM-gh/Kiwi-Release-Backup";
var thisReleases = await doRequest(`/repos/${THIS_REPO}/releases`);
var presentReleases = Object.fromEntries(
  thisReleases.map((release) => {
    return [release.tag_name, release];
  })
);
var releases = await doRequest(`/repos/${KIWI_REPO}/releases`, {
  query: {
    per_page: 10,
    page: 1
  }
});
for (let release of releases) {
  console.log("Processing release #" + release.tag_name);
  if (getAuthorization() && !presentReleases[release.tag_name]) {
    await doRequest(`/repos/${THIS_REPO}/releases`, {
      body: {
        tag_name: release.tag_name,
        name: release.name,
        prerelease: release.prerelease,
        body: [
          `> Upstream publish date: ${release.published_at}`,
          `> Original URL: [Jump](${release.html_url})`,
          `> Created by: ${release.author.login}`,
          "\n",
          release.body
        ].join("\n"),
        make_latest: false
      }
    });
  }
  const presentAssets = presentReleases[release.tag_name] ? presentReleases[release.tag_name].assets.map((it) => it.name) : [];
  const remainingAssets = release.assets.filter((it) => !presentAssets.includes(it.name));
  for (let asset of remainingAssets) {
    console.log(" ** Processing " + asset.name);
    await download(asset.browser_download_url, asset.name);
    console.log("  Downloaded successfully.");
  }
  console.log("\n");
}
