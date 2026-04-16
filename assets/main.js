const TARGET_GROUP_LABELS = {
    women:    'Frauen',
    men:      'Männer',
    children: 'Kinder',
    youth:    'Jugendliche',
    lgbtiq:   'LGBTIQ+',
};

const TAG_LABELS = {
    open_24h:         '24 Stunden',
    alternative_medicine: 'Alternative Medizin',
    anonymous:        'Anonym',
    accessible:       'Barrierearm',
    bed_space:        'Schlafplatz',
    benefits_support: 'Sozialleistungen',
    berlin_crisis_service: 'Berliner Krisendienst',
    clothing:         'Bekleidung',
    clothing_donations: 'Kleiderkammern & Sachspenden',
    community:        'Gemeinschaft',
    counseling:       'Beratung',
    crisis_housing:  'Krisenunterkunft',
    day_center:      'Tagesstätte',
    day_services:    'Tagesangebote',
    dental_care:     'Zahnmedizin',
    emergency:       'Notfallhilfe',
    eu_citizens:     'EU-Bürger',
    food:            'Essen/Verpflegung',
    harm_reduction:  'Safer Use',
    housing:         'Wohnen',
    housing_support_office: 'Fachstellen Soziale Wohnhilfe',
    hygiene:         'Hygiene',
    showers:         'Duschen',
    toilets:         'Toiletten',
    laundry:         'Wäsche',
    legal_aid:       'Rechtsberatung',
    long_term_support: 'Langfristige Hilfe',
    medical_care:    'Medizinische Hilfe',
    mental_health:   'Psychische Gesundheit',
    mobile_support:  'Mobile Hilfe',
    multilingual:    'Mehrsprachig',
    night_cafe:      'Nachtcafés',
    nursing_care:    'Pflege',
    outreach_bus:    'Busse unterwegs',
    outreach:        'Aufsuchend',
    overnight_shelter: 'Notübernachtung',
    people_who_use_drugs: 'Drogengebrauchend',
    pet_friendly:    'Haustierfreundlich',
    psychiatric_emergency_service: 'Psychiatrische Rettungsstelle',
    psychological_counseling: 'Psychologische Beratung',
    recovery_housing: 'Genesungswohnen',
    shelter:         'Unterkunft',
    social_psychiatric_service: 'Sozialpsychiatrischer Dienst',
    social_support:  'Soziale Hilfe',
    soup_kitchen:    'Suppenküche',
    substance_use_counseling: 'Suchtberatung',
    substance_use_support: 'Suchtspezifische Angebote',
    transitional_housing: 'Übergangswohnen',
    transport:       'Transport',
    uninsured:       'Ohne Krankenversicherung',
    youth_shelter:   'Jugendnotunterkunft',
};

// Fields used for text search (excludes the raw html field)
const SEARCH_FIELDS = ['name', 'organization', 'subdistrict', 'district', 'description', 'tags_str'];

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

function sanitizeExternalUrl(value) {
    if (!value) {
        return '';
    }

    try {
        const url = new URL(String(value));
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
    } catch {
        return '';
    }
}

const SEASONAL_MONTHS = [
    '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const WEEKDAY_ORDER = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su', 'holiday'];
const WEEKDAY_LABELS = {
    mo: 'Mo',
    tu: 'Di',
    we: 'Mi',
    th: 'Do',
    fr: 'Fr',
    sa: 'Sa',
    su: 'So',
    holiday: 'Feiertag',
};

function normalizeSeasonalPeriods(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map(period => {
            const start = typeof period?.start === 'string' ? period.start : '';
            const end = typeof period?.end === 'string' ? period.end : '';
            return start && end ? { start, end } : null;
        })
        .filter(Boolean);
}

function normalizeSeasonalNote(rawPeriods, rawText) {
    return {
        periods: Array.isArray(rawPeriods) ? normalizeSeasonalPeriods(rawPeriods) : [],
        text: rawText ? String(rawText) : '',
    };
}

function isFullYearSeason(periods) {
    return periods.length === 1
        && periods[0].start === '2000-01-01'
        && periods[0].end === '2000-12-31';
}

function parseIsoDateParts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
    };
}

function formatSeasonalBoundary(parts, includeDay) {
    const monthLabel = SEASONAL_MONTHS[parts.month] || '';
    return includeDay ? `${parts.day}. ${monthLabel}` : monthLabel;
}

function formatSeasonalPeriod(period) {
    const start = parseIsoDateParts(period.start);
    const end = parseIsoDateParts(period.end);
    if (!start || !end) {
        return '';
    }

    const startMonthDays = new Date(start.year, start.month, 0).getDate();
    const endMonthDays = new Date(end.year, end.month, 0).getDate();
    const includeDay = start.day !== 1 || end.day !== endMonthDays;

    return `${formatSeasonalBoundary(start, includeDay)} bis ${formatSeasonalBoundary(end, includeDay)}`;
}

function formatSeasonalNote(periods, text) {
    if (!periods.length) {
        return text || '';
    }

    if (isFullYearSeason(periods)) {
        return '';
    }

    return periods
        .map(formatSeasonalPeriod)
        .filter(Boolean)
        .join(' / ');
}

function normalizeOpeningHours(raw) {
    if (!Array.isArray(raw)) {
        return [];
    }

    return raw
        .map(entry => {
            const days = Array.isArray(entry?.days)
                ? entry.days.filter(day => typeof day === 'string' && WEEKDAY_ORDER.includes(day))
                : [];
            const start = typeof entry?.start === 'string' ? entry.start : '';
            const end = typeof entry?.end === 'string' ? entry.end : '';
            const label = typeof entry?.label === 'string' ? entry.label : '';

            return days.length && start && end
                ? { days, start, end, label }
                : null;
        })
        .filter(Boolean);
}

function sortDays(days) {
    return [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

function formatDaySequence(days) {
    const sorted = sortDays(days);
    if (sorted.length === 7 && !sorted.includes('holiday')) {
        return 'täglich';
    }

    const regular = sorted.filter(day => day !== 'holiday');
    const labels = [];

    for (let index = 0; index < regular.length; index += 1) {
        const start = regular[index];
        let endIndex = index;

        while (
            endIndex + 1 < regular.length
            && WEEKDAY_ORDER.indexOf(regular[endIndex + 1]) === WEEKDAY_ORDER.indexOf(regular[endIndex]) + 1
        ) {
            endIndex += 1;
        }

        if (endIndex > index + 1) {
            labels.push(`${WEEKDAY_LABELS[start]}-${WEEKDAY_LABELS[regular[endIndex]]}`);
            index = endIndex;
        } else {
            labels.push(WEEKDAY_LABELS[start]);
        }
    }

    if (sorted.includes('holiday')) {
        labels.push(WEEKDAY_LABELS.holiday);
    }

    return labels.join(', ');
}

function formatOpeningEntry(entry) {
    const label = entry.label ? `${entry.label}: ` : '';
    return `${label}${formatDaySequence(entry.days)} ${entry.start}–${entry.end} Uhr`;
}

function formatOpeningHours(entries) {
    return entries.map(formatOpeningEntry).join('; ');
}

function normalizeFacility(raw) {
    const address = raw?.address || {};
    const contact = raw?.contact || {};
    const seasonal = normalizeSeasonalNote(raw?.seasonalNote, raw?.seasonalNoteText);

    return {
        id: raw?.id ?? '',
        name: String(raw?.name || 'Unbekannte Einrichtung'),
        organization: String(raw?.organization || 'Keine Organisation angegeben'),
        address: {
            street: String(address.street || 'Adresse auf Anfrage'),
            district: String(address.district || 'Unbekannter Bezirk'),
            postalCode: String(address.postalCode || ''),
            city: String(address.city || 'Berlin'),
            subdistrict: String(address.subdistrict || ''),
        },
        tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean).map(String) : [],
        targetGroup: typeof raw?.targetGroup === 'string' ? raw.targetGroup : 'all',
        contact: {
            phone: contact.phone ? String(contact.phone) : '',
            email: contact.email ? String(contact.email) : '',
            website: sanitizeExternalUrl(contact.website),
        },
        openingHours: normalizeOpeningHours(raw?.openingHours),
        openingNote: raw?.openingNote ? String(raw.openingNote) : '',
        description: String(raw?.description || 'Keine Beschreibung vorhanden.'),
        seasonalNote: seasonal.periods,
        seasonalNoteText: seasonal.text,
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

    const seasonalLabel = formatSeasonalNote(f.seasonalNote, f.seasonalNoteText);
    const seasonal = seasonalLabel
        ? `<div class="meta-row meta-row--seasonal">${renderIcon('calendar_month')}<span>${escapeHtml(seasonalLabel)}</span></div>` : '';

    const openingHoursLabel = formatOpeningHours(f.openingHours);
    const hours = openingHoursLabel
        ? `<div class="meta-row meta-row--hours">${renderIcon('schedule')}<span>${escapeHtml(openingHoursLabel)}</span></div>` : '';
    const openingNote = f.openingNote
        ? `<div class="meta-row meta-row--opening-note">${renderIcon('info')}<span>${escapeHtml(f.openingNote)}</span></div>` : '';

    const contacts = [];
    if (f.contact?.phone)
        contacts.push(`<a class="contact-link" href="tel:${escapeHtml(f.contact.phone.replace(/\s/g, ''))}" aria-label="${escapeHtml(`Telefonnummer von ${f.name}: ${f.contact.phone}`)}">${renderIcon('call')}${escapeHtml(f.contact.phone)}</a>`);
    if (f.contact?.email)
        contacts.push(`<a class="contact-link" href="mailto:${escapeHtml(f.contact.email)}" aria-label="${escapeHtml(`E-Mail an ${f.name}: ${f.contact.email}`)}">${renderIcon('mail')}${escapeHtml(f.contact.email)}</a>`);
    if (f.contact?.website)
        contacts.push(`<a class="contact-link" href="${escapeHtml(f.contact.website)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`Website von ${f.name} öffnen`)}">${renderIcon('language')}Website</a>`);

    return `<article class="card" id="facility-${f.id}">
    <div class="card-header">
        <h2 class="card-name">${facilityName}</h2>
        <p class="card-org">${escapeHtml(f.organization)}</p>
    </div>
    <div class="card-tags">${tags}</div>
    <div class="card-meta">
        <div class="meta-row meta-row--location">
            ${renderIcon('place')}
            <a href="${mapsUrl}" target="_blank" rel="noopener" class="meta-address" aria-label="${addressLabel}">${escapeHtml(addr)}</a>
        </div>
        ${seasonal}
        ${hours}
        ${openingNote}
    </div>
    <div class="card-info readmore">
        <div id="readmore-content-${f.id}" class="readmore__content">${escapeHtml(f.description)}</div>
        <button class="readmore__toggle" aria-expanded="false" aria-controls="readmore-content-${f.id}">
            <span class="readmore__label--more">Mehr anzeigen</span>
            <span class="readmore__label--less" hidden>Weniger anzeigen</span>
        </button>
    </div>
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
        subdistrict:  f.address.subdistrict,
        district:     f.address.district,
        description:  f.description,
        // Include both tag keys and German labels so both are searchable
        tags_str:     [...f.tags, ...f.tags.map(tagLabel)].join(' '),
        tags_json:    JSON.stringify(f.tags),
        // Not in valueNames — accessed only in filter callbacks
        target_group: f.targetGroup,
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
    const $tgFilters = $('#target-group-filters');
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
        valueNames: ['name', 'organization', 'subdistrict', 'district', 'tags_str', 'description', 'html'],
        item: `<li class="item">
            <span class="name"         hidden aria-hidden="true"></span>
            <span class="organization" hidden aria-hidden="true"></span>
            <span class="subdistrict"  hidden aria-hidden="true"></span>
            <span class="district"     hidden aria-hidden="true"></span>
            <span class="tags_str"     hidden aria-hidden="true"></span>
            <span class="description"  hidden aria-hidden="true"></span>
            <div class="html"></div>
        </li>`,
    }, facilities.map(flattenFacility));

    // Initialize readmore on all cards (must run after List.js renders the items)
    $('.readmore').readMore({ linesMax: 3 });

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

    listInstance.sort(sortState.field, { order: sortState.order });

    // ── Stats ───────────────────────────────────────────────────────────────
    function updateStats() {
        const visible = listInstance.visibleItems.length;
        const total = listInstance.items.length;
        const suffix = visible === 0 ? ' Keine Treffer für die aktuelle Suche oder den Filter.' : '';
        $stats.text(`${visible} von ${total} Einrichtungen${suffix}`);
    }

    // ── Filters ─────────────────────────────────────────────────────────────
    let activeTag = null;
    let activeTargetGroup = null;

    function applyFilters() {
        if (!activeTag && !activeTargetGroup) {
            listInstance.filter();
            return;
        }
        listInstance.filter(item => {
            const values = item.values();
            if (activeTag && !JSON.parse(values.tags_json || '[]').includes(activeTag)) {
                return false;
            }
            if (activeTargetGroup && values.target_group !== activeTargetGroup) {
                return false;
            }
            return true;
        });
    }

    function makeFilterBtn($container, label, onClick) {
        const $btn = $('<button>')
            .attr('type', 'button')
            .attr('aria-pressed', 'false')
            .addClass('filter-btn')
            .text(label);
        $btn.on('click', () => {
            $container.find('.filter-btn').removeClass('active').attr('aria-pressed', 'false');
            $btn.addClass('active').attr('aria-pressed', 'true');
            onClick();
            updateStats();
        });
        $container.append($btn);
        return $btn;
    }

    // ── Target group filters ─────────────────────────────────────────────────
    const groupOrder = ['women', 'men', 'children', 'youth', 'lgbtiq'];
    const usedGroups = new Set(facilities.map(f => f.targetGroup));

    makeFilterBtn($tgFilters, 'Alle Gruppen', () => { activeTargetGroup = null; applyFilters(); })
        .addClass('active').attr('aria-pressed', 'true');
    groupOrder.filter(g => usedGroups.has(g)).forEach(g =>
        makeFilterBtn($tgFilters, TARGET_GROUP_LABELS[g], () => { activeTargetGroup = g; applyFilters(); })
    );

    // ── Tag filters ─────────────────────────────────────────────────────────
    const usedTags = [...new Set(facilities.flatMap(f => f.tags))]
        .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), 'de'));

    makeFilterBtn($filters, 'Alle', () => { activeTag = null; applyFilters(); })
        .addClass('active').attr('aria-pressed', 'true');
    usedTags.forEach(tag =>
        makeFilterBtn($filters, tagLabel(tag), () => { activeTag = tag; applyFilters(); })
    );

    updateStats();
}

init();
