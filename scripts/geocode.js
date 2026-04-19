#!/usr/bin/env node
// One-time script: geocodes facilities without coordinates via Nominatim (OSM).
// Writes lat/lng back into facilities.json in-place.
// Run: node scripts/geocode.js

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir      = dirname(fileURLToPath(import.meta.url));
const DATA_PATH  = join(__dir, '..', 'facilities.json');
const DELAY_MS   = 1100; // Nominatim ToS: max 1 req/sec
const USER_AGENT = 'shelter-geocoder/1.0 (https://github.com/jensschnitzler/shelter)';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(facility) {
    const { street, postalCode, city } = facility.address;
    const params = new URLSearchParams({
        street,
        postalcode: postalCode,
        city,
        country:    'DE',
        format:     'jsonv2',
        limit:      '1',
    });

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'User-Agent': USER_AGENT } }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status} for "${facility.name}"`);

    const results = await res.json();
    if (!results.length) return null;

    return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
    };
}

async function main() {
    const facilities = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    const missing    = facilities.filter(f => f.lat == null || f.lng == null);

    console.log(`${facilities.length} facilities total, ${missing.length} need geocoding.`);
    if (!missing.length) {
        console.log('Nothing to do.');
        return;
    }

    let ok = 0, failed = 0;

    for (const facility of missing) {
        try {
            const coords = await geocode(facility);
            if (coords) {
                facility.lat = coords.lat;
                facility.lng = coords.lng;
                console.log(`✓  ${facility.name}`);
                ok++;
            } else {
                console.warn(`–  No result: ${facility.name} (${facility.address.street})`);
                failed++;
            }
        } catch (err) {
            console.error(`✗  ${facility.name}: ${err.message}`);
            failed++;
        }

        await sleep(DELAY_MS);
    }

    writeFileSync(DATA_PATH, JSON.stringify(facilities, null, 2));
    console.log(`\nDone. ${ok} geocoded, ${failed} failed. File saved.`);
}

main();
