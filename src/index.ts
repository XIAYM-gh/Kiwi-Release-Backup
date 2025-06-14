import { download, upload } from './asset-io';
import { doRequest, getAuthorization } from './request';

const KIWI_REPO = 'kiwibrowser/src.next';
const THIS_REPO = process.env.REPO ?? 'XIAYM-gh/Kiwi-Release-Backup';

const thisReleases = <any[]>await doRequest(`/repos/${THIS_REPO}/releases`);

// Tag Name: string => Release Object
const presentReleases = Object.fromEntries(
	<[string, any][]>thisReleases.map(release => {
		return [release.tag_name, release];
	})
);

const releases = <any[]>await doRequest(`/repos/${KIWI_REPO}/releases`, {
	query: {
		per_page: 10,
		page: 1
	}
});

for (let release of releases) {
	// const publishTime = new Date(release.published_at).getTime();
	// if (Date.now() - publishTime > 7 * 24 * 60 * 60 * 1000 /* 1 week */) {
	// 	continue;
	// }

	let releaseId = presentReleases[release.tag_name] ? presentReleases[release.tag_name].id : -1;

	console.log('Processing release #' + release.tag_name);
	if (getAuthorization() && !presentReleases[release.tag_name]) {
		// Copy the release
		const created = await doRequest(`/repos/${THIS_REPO}/releases`, {
			body: {
				tag_name: release.tag_name,
				name: release.name,
				prerelease: release.prerelease,
				body: [
					`> Upstream publish date: ${release.published_at}`,
					`> Original URL: [Jump](${release.html_url})`,
					`> Created by: ${release.author.login}`,
					'\n',
					release.body
				].join('\n'),
				make_latest: "false"
			}
		});

		console.log(' Successfully created release');
		releaseId = created.id;
	}

	const presentAssets = presentReleases[release.tag_name] ? presentReleases[release.tag_name].assets.map((it: any) => it.name) : [];
	const remainingAssets = <any[]>release.assets.filter((it: any) => !presentAssets.includes(it.name));
	for (let asset of remainingAssets) {
		console.log(' ** Processing ' + asset.name);

		await download(asset.browser_download_url, asset.name);
		console.log('  Downloaded successfully.');

		await upload(
			`https://uploads.github.com/repos/${THIS_REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(asset.name)}`,
			asset.name
		);
		console.log('  Uploaded successfully.');
	}

	console.log('\n');
}
