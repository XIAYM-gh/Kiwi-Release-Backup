export function getAuthorization(): string | undefined {
	return process.env.GH_TOKEN ? `Bearer ${process.env.GH_TOKEN}` : undefined;
}

export async function doRequest(apiPath: string, reqParams: { query?: object; body?: object } = {}): Promise<any> {
	console.log('Requesting: ' + apiPath);

	const headerResp = await fetch(`https://api.github.com${apiPath}${processQuery(reqParams.query)}`, {
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: getAuthorization()!,
			'Content-Type': 'application/json',
			'User-Agent': 'Kiwi-Release-Backup-Client/0.0.1',
			'X-GitHub-Api-Version': '2022-11-28'
		},
		method: reqParams.body ? 'POST' : 'GET',
		body: reqParams.body ? JSON.stringify(reqParams.body) : null
	});

	if (!headerResp.ok) {
		throw 'Resp not ok: ' + headerResp.status;
	}

	return await headerResp.json();
}

function processQuery(queryParams?: object): string {
	if (!queryParams) {
		return '';
	}

	return (
		'?' +
		Object.entries(queryParams)
			.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
			.join('&')
	);
}
