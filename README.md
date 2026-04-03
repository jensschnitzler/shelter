# shelter

Static directory of support services for people experiencing homelessness in Berlin.

## Overview

This project is a lightweight client-side web app. It loads facility data from
`facilities.json` and renders a searchable, sortable, filterable directory in
the browser.

The app is intentionally simple:

- `index.html` contains the page structure
- `main.js` loads data and wires search, sorting, filters, and rendering
- `styles.css` contains the complete visual styling
- `facilities.json` is the single source of truth for facility data
- `cash.min.js` and `list.min.js` are vendored browser dependencies

## Running locally

Do not open `index.html` directly via `file://...` in the browser. The app
fetches `facilities.json`, so it should be served over HTTP.

One simple option is PHP:

```bash
php -S localhost:8000
```

Then open:

```text
http://localhost:8000
```

Any other static server works too.

## Features

- Free-text search across name, organization, district, location, description,
  and tags
- Sorting by name or district
- Tag-based filtering generated from the dataset
- Accessible status updates for result counts
- Graceful error handling if `facilities.json` cannot be loaded

## Data model

Each facility entry in `facilities.json` follows this general structure:

```json
{
  "id": 1,
  "name": "Facility name",
  "organization": "Organization name",
  "address": {
    "street": "Street 1",
    "district": "District",
    "postalCode": "12345",
    "city": "Berlin"
  },
  "location": "Short location label",
  "tags": ["shelter", "food"],
  "contact": {
    "phone": "030 123456",
    "email": "info@example.org",
    "website": "https://example.org"
  },
  "openingHours": "Daily 09:00-17:00",
  "description": "Short human-readable summary",
  "seasonalNote": "Ganzjährig"
}
```

The UI tolerates missing optional values, but keeping records complete improves
search quality and presentation.

## Editing content

To add or update facilities:

1. Edit `facilities.json`.
2. Reload the page through your local server.
3. Verify search, sorting, and relevant filters still behave as expected.

If you add new tags, the UI will automatically make them searchable and create
filter buttons for them. Human-friendly labels are defined in `main.js`.

## Deployment notes

This is a static site. Deployment only requires serving the repository contents
from a web server that can deliver `index.html`, `main.js`, `styles.css`, the
vendored libraries, and `facilities.json`.

## Known limitations

- There is no automated test suite yet
- Facility data is curated manually
- The app depends on client-side rendering and does not provide a backend API


## To Do

- [x] Add "Psychiatrische Versorgung" (die Caritas an der Turmstraße hat ne Sprechstunde und [...] alle psychiatrischen Rettungsstellen der Bezirke)
- [x] Add entries from Kältehilfe PDF
- [x] Add "ASOG Einrichtungen"
- [x] Improve icons (https://github.com/google/material-design-icons)
- [ ] Add map
- [ ] Add feature to report wrong and outdated information
- [ ] Add form to add new anonymously facilities
- [ ] Ensure accessibility (Web Content Accessibility Guidelines 2.1 (WCAG 2.1))
- [ ] Improve language support
- [ ] Support simple language
- [ ] Add form for feature requests, bug reports
