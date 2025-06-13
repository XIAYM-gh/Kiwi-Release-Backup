import { createReadStream, createWriteStream, existsSync, statSync, unlinkSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

export async function download(url: string, outputPath: string): Promise<void> {
	const resp = await axios.get(url, {
		responseType: 'stream',
		headers: {
			Accept: 'application/octet-stream',
			'User-Agent': 'Kiwi-Release-Backup-Client/0.0.1'
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

export async function upload(url: string, inputPath: string): Promise<void> {
	await axios.post(url, createReadStream(inputPath), {
		headers: {
			Authorization: `Bearer ${process.env.GH_TOKEN}`,
			'User-Agent': 'Kiwi-Release-Backup-Client/0.0.1',
			'Content-Type': 'application/octet-stream',
			'Content-Length': statSync(inputPath).size
		}
	});
}
