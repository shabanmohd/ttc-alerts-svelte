/**
 * Download and extract TTC GTFS data from Toronto Open Data
 *
 * This script downloads the latest GTFS ZIP file and extracts it to the scripts/gtfs folder.
 * Run this before process-gtfs-schedules.ts to ensure you have the latest schedule data.
 *
 * Data Source: https://open.toronto.ca/dataset/ttc-routes-and-schedules/
 * Update Frequency: Approximately every 6 weeks (officially "Monthly")
 *
 * Usage: npx ts-node scripts/download-gtfs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Toronto Open Data GTFS download URL
const GTFS_DOWNLOAD_URL =
	'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/7795b45e-e65a-4465-81fc-c36b9dfff169/resource/cfb6b2b8-6191-41e3-bda1-b175c51148cb/download/TTC%20Routes%20and%20Schedules%20Data.zip';

const OUTPUT_DIR = path.join(__dirname, 'gtfs');
const ZIP_FILE = path.join(__dirname, 'gtfs-download.zip');

// Required GTFS files for schedule processing
const REQUIRED_FILES = [
	'calendar.txt',
	'calendar_dates.txt',
	'routes.txt',
	'stop_times.txt',
	'stops.txt',
	'trips.txt'
];

/**
 * Download file from URL to destination
 */
function downloadFile(url: string, dest: string): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`📥 Downloading GTFS data from Toronto Open Data...`);
		console.log(`   URL: ${url}`);

		const file = fs.createWriteStream(dest);

		const request = https.get(url, (response) => {
			// Handle redirects
			if (response.statusCode === 301 || response.statusCode === 302) {
				const redirectUrl = response.headers.location;
				if (redirectUrl) {
					file.close();
					fs.unlinkSync(dest);
					downloadFile(redirectUrl, dest).then(resolve).catch(reject);
					return;
				}
			}

			if (response.statusCode !== 200) {
				reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
				return;
			}

			const totalSize = parseInt(response.headers['content-length'] || '0', 10);
			let downloadedSize = 0;

			response.on('data', (chunk) => {
				downloadedSize += chunk.length;
				if (totalSize > 0) {
					const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
					process.stdout.write(`\r   Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(1)} MB)`);
				}
			});

			response.pipe(file);

			file.on('finish', () => {
				file.close();
				console.log(`\n✅ Download complete: ${(downloadedSize / 1024 / 1024).toFixed(1)} MB`);
				resolve();
			});
		});

		request.on('error', (err) => {
			fs.unlink(dest, () => {}); // Delete the file on error
			reject(err);
		});

		file.on('error', (err) => {
			fs.unlink(dest, () => {}); // Delete the file on error
			reject(err);
		});
	});
}

/**
 * Extract ZIP file using system unzip command
 */
function extractZip(zipPath: string, outputDir: string): void {
	console.log(`\n📦 Extracting ZIP file...`);

	// Create output directory if it doesn't exist
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Use system unzip command (available on Linux, macOS, and Git Bash on Windows)
	try {
		execSync(`unzip -o "${zipPath}" -d "${outputDir}"`, { stdio: 'pipe' });
		console.log(`✅ Extracted to: ${outputDir}`);
	} catch (error) {
		// Fallback: try using PowerShell on Windows
		try {
			execSync(
				`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${outputDir}' -Force"`,
				{ stdio: 'pipe' }
			);
			console.log(`✅ Extracted to: ${outputDir}`);
		} catch (psError) {
			throw new Error(`Failed to extract ZIP file. Please install unzip or extract manually.`);
		}
	}
}

/**
 * Verify all required GTFS files exist
 */
function verifyFiles(dir: string): boolean {
	console.log(`\n🔍 Verifying required GTFS files...`);

	let allFound = true;
	for (const file of REQUIRED_FILES) {
		const filePath = path.join(dir, file);
		if (fs.existsSync(filePath)) {
			const stats = fs.statSync(filePath);
			const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
			console.log(`   ✅ ${file} (${sizeMB} MB)`);
		} else {
			console.log(`   ❌ ${file} - MISSING`);
			allFound = false;
		}
	}

	return allFound;
}

/**
 * Get metadata about the download
 */
function getMetadata(): { lastUpdated: string; version: string } {
	return {
		lastUpdated: new Date().toISOString(),
		version: new Date().toISOString().split('T')[0] // Use date as version
	};
}

/**
 * Main function
 */
async function main() {
	console.log('🚌 TTC GTFS Data Downloader\n');
	console.log('Data Source: Toronto Open Data');
	console.log('Update Frequency: Approximately every 6 weeks\n');

	try {
		// Step 1: Download the ZIP file
		await downloadFile(GTFS_DOWNLOAD_URL, ZIP_FILE);

		// Step 2: Extract the ZIP file
		extractZip(ZIP_FILE, OUTPUT_DIR);

		// Step 3: Verify required files exist
		const verified = verifyFiles(OUTPUT_DIR);

		// Step 4: Clean up ZIP file
		if (fs.existsSync(ZIP_FILE)) {
			fs.unlinkSync(ZIP_FILE);
			console.log(`\n🗑️  Cleaned up temporary ZIP file`);
		}

		// Step 5: Save metadata
		const metadata = getMetadata();
		const metadataPath = path.join(OUTPUT_DIR, 'download-metadata.json');
		fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
		console.log(`\n📝 Saved download metadata to: download-metadata.json`);

		if (verified) {
			console.log(`\n✅ GTFS data downloaded successfully!`);
			console.log(`\n📌 Next step: Run schedule processing`);
			console.log(`   npx ts-node scripts/process-gtfs-schedules.ts`);
		} else {
			console.error(`\n⚠️  Some required files are missing. Check the download.`);
			process.exit(1);
		}
	} catch (error) {
		console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		process.exit(1);
	}
}

main();
