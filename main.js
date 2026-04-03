const TAG_LABELS = {
    '24h':            '24 Stunden',
    alternative_medicine: 'Alternative Medizin',
    anonymous:        'Anonym',
    alle_geschlechter: 'Alle Geschlechter',
    berliner_krisendienst: 'Berliner Krisendienst',
    bekleidung:       'Bekleidung',
    busse_unterwegs:  'Busse unterwegs',
    fachstellen_soziale_wohnhilfe: 'Fachstellen Soziale Wohnhilfe',
    frauen:           'Frauen',
    children:         'Kinder',
    divers:           'Divers',
    drogengebrauchend: 'Drogengebrauchend',
    essen_verpflegung: 'Essen/Verpflegung',
    familien:         'Familien',
    haustierfreundlich: 'Haustierfreundlich',
    jugendliche:      'Jugendliche',
    kleiderkammern_sachspenden: 'Kleiderkammern & Sachspenden',
    maenner:          'Männer',
    medizinische_hilfe: 'Medizinische Hilfe',
    mobile_hilfe:     'Mobile Hilfe',
    nachtcafes:       'Nachtcafés',
    notuebernachtungen: 'Notübernachtungen',
    schlafplatz:      'Schlafplatz',
    shelter:         'Unterkunft',
    night_shelter:   'Nachtunterkunft',
    suchtspezifische_angebote: 'Suchtspezifische Angebote',
    tagesaufenthalt: 'Tagesaufenthalt',
    tagesangebote:   'Tagesangebote',
    youth_shelter:   'Jugendnotunterkunft',
    day_center:      'Tagesstätte',
    crisis_housing:  'Krisenunterkunft',
    transitional_housing: 'Übergangswohnen',
    food:            'Essen',
    soup_kitchen:    'Suppenküche',
    medical:         'Medizin',
    healthcare:      'Gesundheitsversorgung',
    dental:          'Zahnmedizin',
    hygiene:         'Hygiene',
    showers:         'Duschen',
    toilets:         'Toiletten',
    laundry:         'Wäsche',
    counseling:      'Beratung',
    clothing:        'Kleidung',
    legal_aid:       'Rechtsberatung',
    drug_counseling: 'Drogenberatung',
    social_benefits: 'Sozialleistungen',
    social_support:  'Soziale Hilfe',
    long_term_support: 'Langfristige Hilfe',
    women_only:      'Nur Frauen',
    women_specific:  'Frauenangebote',
    families:        'Familien',
    youth:           'Jugend',
    year_round:      'Ganzjährig',
    mobile:          'Mobil',
    lgbtiq:          'LGBTIQ+',
    outreach:        'Aufsuchend',
    transport:       'Transport',
    emergency:       'Notfallhilfe',
    housing:         'Wohnen',
    recovery_housing: 'Genesungswohnen',
    nursing:         'Pflege',
    uninsured:       'Ohne Krankenversicherung',
    multilingual:    'Mehrsprachig',
    eu_citizens:     'EU-Bürger',
    harm_reduction:  'Safer Use',
    mental_health:   'Psychische Gesundheit',
    psychiatrische_rettungsstelle: 'Psychiatrische Rettungsstelle',
    psychiatrische_versorgung: 'Psychiatrische Versorgung',
    psychologische_beratung: 'Psychologische Beratung',
    sozialpsychiatrischer_dienst: 'Sozialpsychiatrischer Dienst',
    community:       'Gemeinschaft',
};

// Fields used for text search (excludes the raw html field)
const SEARCH_FIELDS = ['name', 'organization', 'location', 'district', 'description', 'tags_str'];

function tagLabel(tag) {
    return TAG_LABELS[tag] || tag.replace(/_/g, ' ');
}

function tagCls(tag) {
    return Object.hasOwn(TAG_LABELS, tag) ? `tag tag-${tag}` : 'tag tag-default';
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[char];
    });
}

function normalizeFacility(raw) {
    const address = raw?.address || {};
    const contact = raw?.contact || {};

    return {
        id: raw?.id ?? '',
        name: String(raw?.name || 'Unbekannte Einrichtung'),
        organization: String(raw?.organization || 'Keine Organisation angegeben'),
        location: String(raw?.location || address.district || 'Unbekannter Ort'),
        address: {
            street: String(address.street || 'Adresse auf Anfrage'),
            district: String(address.district || 'Unbekannter Bezirk'),
            postalCode: String(address.postalCode || ''),
            city: String(address.city || 'Berlin'),
        },
        tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean).map(String) : [],
        contact: {
            phone: contact.phone ? String(contact.phone) : '',
            email: contact.email ? String(contact.email) : '',
            website: contact.website ? String(contact.website) : '',
        },
        openingHours: raw?.openingHours ? String(raw.openingHours) : '',
        description: String(raw?.description || 'Keine Beschreibung vorhanden.'),
        seasonalNote: raw?.seasonalNote ? String(raw.seasonalNote) : '',
    };
}

function renderCard(f) {
    const cityLine = `${f.address.postalCode} ${f.address.city}`.trim();
    const addrParts = [f.address.street, f.address.district, cityLine].filter(Boolean);
    const addr = addrParts.join(', ');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
    const facilityName = escapeHtml(f.name);
    const addressLabel = escapeHtml(`Adresse von ${f.name} in Google Maps öffnen`);

    const tags = f.tags
        .map(t => `<span class="${tagCls(t)}">${escapeHtml(tagLabel(t))}</span>`)
        .join('');

    const seasonal = f.seasonalNote && f.seasonalNote !== 'Ganzjährig'
        ? `<span class="seasonal-badge">${renderIcon('calendar_month')}${escapeHtml(f.seasonalNote)}</span>` : '';

    const hours = f.openingHours
        ? `<div class="meta-row">${renderIcon('schedule')}<span>${escapeHtml(f.openingHours)}</span></div>` : '';

    const contacts = [];
    if (f.contact?.phone)
        contacts.push(`<a class="contact-link" href="tel:${escapeHtml(f.contact.phone.replace(/\s/g, ''))}" aria-label="${escapeHtml(`Telefonnummer von ${f.name}: ${f.contact.phone}`)}">${renderIcon('call')}${escapeHtml(f.contact.phone)}</a>`);
    if (f.contact?.email)
        contacts.push(`<a class="contact-link" href="mailto:${escapeHtml(f.contact.email)}" aria-label="${escapeHtml(`E-Mail an ${f.name}: ${f.contact.email}`)}">${renderIcon('mail')}${escapeHtml(f.contact.email)}</a>`);
    if (f.contact?.website)
        contacts.push(`<a class="contact-link" href="${escapeHtml(f.contact.website)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`Website von ${f.name} öffnen`)}">${renderIcon('language')}Website</a>`);

    return `<article class="card">
    <div class="card-header">
        <h2 class="card-name">${facilityName}</h2>
        <p class="card-org">${escapeHtml(f.organization)}</p>
    </div>
    <div class="card-tags">${tags}${seasonal}</div>
    <div class="card-meta">
        <div class="meta-row">
            ${renderIcon('place')}
            <a href="${mapsUrl}" target="_blank" rel="noopener" class="meta-address" aria-label="${addressLabel}">${escapeHtml(addr)}</a>
        </div>
        ${hours}
    </div>
    <details class="card-details">
        <summary class="card-summary">Info</summary>
        <div class="card-desc">${escapeHtml(f.description)}</div>
    </details>
    ${contacts.length ? `<div class="card-contact">${contacts.join('')}</div>` : ''}
</article>`;
}

function renderIcon(name) {
    return `<span class="meta-icon material-symbols-outlined" aria-hidden="true">${name}</span>`;
}

// Flatten nested facility object into List.js-compatible flat values.
// `tags_json` is intentionally NOT in valueNames so List.js won't touch it,
// but it remains accessible via item.values().tags_json for filter callbacks.
function flattenFacility(f) {
    return {
        name:         f.name,
        organization: f.organization,
        location:     f.location,
        district:     f.address.district,
        description:  f.description,
        // Include both tag keys and German labels so both are searchable
        tags_str:     [...f.tags, ...f.tags.map(tagLabel)].join(' '),
        tags_json:    JSON.stringify(f.tags),
        html:         renderCard(f),
    };
}

async function loadFacilities() {
    const res = await fetch('facilities.json');
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const rawFacilities = await res.json();
    return rawFacilities.map(normalizeFacility);
}

async function init() {
    const $stats = $('#stats');
    const $filters = $('#filters');
    $stats.text('Einrichtungen werden geladen …').removeClass('is-error');

    let facilities;

    try {
        facilities = await loadFacilities();
    } catch (error) {
        console.error('Could not load facilities.json', error);
        $stats
            .text('Die Einrichtungen konnten gerade nicht geladen werden.')
            .addClass('is-error');
        return;
    }

    const listInstance = new List('facilities-list', {
        // List.js sets innerHTML on div.html and textContent on hidden spans
        valueNames: ['name', 'organization', 'location', 'district', 'tags_str', 'description', 'html'],
        item: `<li class="item">
            <span class="name"         hidden aria-hidden="true"></span>
            <span class="organization" hidden aria-hidden="true"></span>
            <span class="location"     hidden aria-hidden="true"></span>
            <span class="district"     hidden aria-hidden="true"></span>
            <span class="tags_str"     hidden aria-hidden="true"></span>
            <span class="description"  hidden aria-hidden="true"></span>
            <div class="html"></div>
        </li>`,
    }, facilities.map(flattenFacility));

    // ── Search ──────────────────────────────────────────────────────────────
    $('#search-input').on('input', function () {
        listInstance.search(this.value, SEARCH_FIELDS);
        updateStats();
    });

    // ── Sort ────────────────────────────────────────────────────────────────
    let sortState = { field: 'name', order: 'asc' };

    $('.sort-btn').on('click', function () {
        const field = $(this).attr('data-sort');
        if (sortState.field === field) {
            sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            sortState = { field, order: 'asc' };
        }
        listInstance.sort(field, { order: sortState.order });

        $('.sort-btn').removeClass('active asc desc');
        $('.sort-btn').attr('aria-pressed', 'false');
        $(this).addClass(`active ${sortState.order}`);
        $(this).attr('aria-pressed', 'true');
        updateStats();
    });

    // ── Tag filters ─────────────────────────────────────────────────────────
    const usedTags = [...new Set(facilities.flatMap(f => f.tags))]
        .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), 'de'));

    function makeFilterBtn(label, onClick) {
        const $btn = $('<button>')
            .attr('type', 'button')
            .attr('aria-pressed', 'false')
            .addClass('filter-btn')
            .text(label);
        $btn.on('click', () => {
            $('.filter-btn').removeClass('active');
            $('.filter-btn').attr('aria-pressed', 'false');
            $btn.addClass('active');
            $btn.attr('aria-pressed', 'true');
            onClick();
            updateStats();
        });
        $filters.append($btn);
        return $btn;
    }

    makeFilterBtn('Alle', () => listInstance.filter())
        .addClass('active')
        .attr('aria-pressed', 'true');

    usedTags.forEach(tag => {
        makeFilterBtn(tagLabel(tag), () => {
            listInstance.filter(item => {
                return JSON.parse(item.values().tags_json || '[]').includes(tag);
            });
        });
    });

    // ── Stats ───────────────────────────────────────────────────────────────
    function updateStats() {
        const visible = listInstance.visibleItems.length;
        const total = listInstance.items.length;
        const suffix = visible === 0 ? ' Keine Treffer für die aktuelle Suche oder den Filter.' : '';
        $stats.text(`${visible} von ${total} Einrichtungen${suffix}`);
    }
    updateStats();
}

init();
