const TARGET_GROUP_LABELS = {
    women:    'Frauen',
    men:      'Männer',
    families: 'Familien',
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
    return Object.hasOwn(TAG_LABELS, tag) ? `tag pill tag-${tag}` : 'tag pill tag-default';
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
    if (!value) return '';
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
    if (!Array.isArray(raw)) return [];

    return raw
        .map(period => {
            const start = typeof period?.start === 'string' ? period.start : '';
            const end   = typeof period?.end   === 'string' ? period.end   : '';
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
        && periods[0].end   === '2000-12-31';
}

function parseIsoDateParts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return {
        year:  Number(match[1]),
        month: Number(match[2]),
        day:   Number(match[3]),
    };
}

function formatSeasonalBoundary(parts, includeDay) {
    const monthLabel = SEASONAL_MONTHS[parts.month] || '';
    return includeDay ? `${parts.day}. ${monthLabel}` : monthLabel;
}

function formatSeasonalPeriod(period) {
    const start = parseIsoDateParts(period.start);
    const end   = parseIsoDateParts(period.end);
    if (!start || !end) return '';

    const endMonthDays = new Date(end.year, end.month, 0).getDate();
    const includeDay   = start.day !== 1 || end.day !== endMonthDays;
    return `${formatSeasonalBoundary(start, includeDay)} bis ${formatSeasonalBoundary(end, includeDay)}`;
}

function formatSeasonalNote(periods, text) {
    if (!periods.length)      return text || '';
    if (isFullYearSeason(periods)) return 'Ganzjährig';

    return periods
        .map(formatSeasonalPeriod)
        .filter(Boolean)
        .join(' / ');
}

function normalizeOpeningHours(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
        .map(entry => {
            const days  = Array.isArray(entry?.days)
                ? entry.days.filter(day => typeof day === 'string' && WEEKDAY_ORDER.includes(day))
                : [];
            const start = typeof entry?.start === 'string' ? entry.start : '';
            const end   = typeof entry?.end   === 'string' ? entry.end   : '';
            const label = typeof entry?.label === 'string' ? entry.label : '';
            return days.length && start && end ? { days, start, end, label } : null;
        })
        .filter(Boolean);
}

function sortDays(days) {
    return [...days].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
}

function formatDaySequence(days) {
    const sorted = sortDays(days);
    if (sorted.length === 7 && !sorted.includes('holiday')) return 'täglich';

    const regular = sorted.filter(day => day !== 'holiday');
    const labels  = [];

    for (let i = 0; i < regular.length; i += 1) {
        const start = regular[i];
        let end = i;

        while (
            end + 1 < regular.length
            && WEEKDAY_ORDER.indexOf(regular[end + 1]) === WEEKDAY_ORDER.indexOf(regular[end]) + 1
        ) {
            end += 1;
        }

        if (end > i + 1) {
            labels.push(`${WEEKDAY_LABELS[start]}-${WEEKDAY_LABELS[regular[end]]}`);
            i = end;
        } else {
            labels.push(WEEKDAY_LABELS[start]);
        }
    }

    if (sorted.includes('holiday')) labels.push(WEEKDAY_LABELS.holiday);

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
    const address  = raw?.address || {};
    const contact  = raw?.contact || {};
    const seasonal = normalizeSeasonalNote(raw?.seasonalNote, raw?.seasonalNoteText);

    return {
        id:           raw?.id ? String(raw.id) : null,
        name:         String(raw?.name || 'Unbekannte Einrichtung'),
        organization: String(raw?.organization || 'Keine Organisation angegeben'),
        address: {
            street:     String(address.street     || 'Adresse auf Anfrage'),
            district:   String(address.district   || 'Unbekannter Bezirk'),
            postalCode: String(address.postalCode || ''),
            city:       String(address.city       || 'Berlin'),
            subdistrict: String(address.subdistrict || ''),
        },
        tags:        Array.isArray(raw?.tags) ? raw.tags.filter(Boolean).map(String) : [],
        targetGroup: typeof raw?.targetGroup === 'string' ? raw.targetGroup : 'all',
        contact: {
            phone:   contact.phone   ? String(contact.phone)          : '',
            email:   contact.email   ? String(contact.email)          : '',
            website: sanitizeExternalUrl(contact.website),
        },
        openingHours: normalizeOpeningHours(raw?.openingHours),
        openingNote:  raw?.openingNote ? String(raw.openingNote) : '',
        description:  String(raw?.description || 'Keine Beschreibung vorhanden.'),
        seasonalNote: seasonal.periods,
        seasonalNoteText: seasonal.text,
        color:        raw?.color ? String(raw.color) : '',
    };
}

// ── Card rendering ────────────────────────────────────────────────────────────

function renderIcon(name) {
    return `<span class="meta-icon material-symbols-outlined" aria-hidden="true">${name}</span>`;
}

// Renders a single icon + text meta row. The modifier becomes meta-row--{modifier}.
function renderMetaRow(modifier, icon, text) {
    return `<div class="meta-row meta-row--${modifier}">${renderIcon(icon)}<span>${escapeHtml(text)}</span></div>`;
}

// Renders contact links (phone, email, website) as an array of anchor strings.
function renderContactLinks(f) {
    const links = [];
    if (f.contact.phone)
        links.push(`<a class="contact-link" href="tel:${escapeHtml(f.contact.phone.replace(/\s/g, ''))}" aria-label="${escapeHtml(`Telefonnummer von ${f.name}: ${f.contact.phone}`)}">${renderIcon('call')}${escapeHtml(f.contact.phone)}</a>`);
    if (f.contact.email)
        links.push(`<a class="contact-link" href="mailto:${escapeHtml(f.contact.email)}" aria-label="${escapeHtml(`E-Mail an ${f.name}: ${f.contact.email}`)}">${renderIcon('mail')}${escapeHtml(f.contact.email)}</a>`);
    if (f.contact.website)
        links.push(`<a class="contact-link" href="${escapeHtml(f.contact.website)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`Website von ${f.name} öffnen`)}">${renderIcon('language')}Website</a>`);
    return links;
}

function renderCard(f) {
    const cityLine  = `${f.address.postalCode} ${f.address.city}`.trim();
    const addrParts = [f.address.street, f.address.district, cityLine].filter(Boolean);
    const addr      = addrParts.join(', ');
    const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

    const targetGroupTag = f.targetGroup !== 'all' && TARGET_GROUP_LABELS[f.targetGroup]
        ? `<span class="tag pill tag--target-group">${escapeHtml(TARGET_GROUP_LABELS[f.targetGroup])}</span>`
        : '';
    const tags = f.tags.map(t => `<span class="${tagCls(t)}">${escapeHtml(tagLabel(t))}</span>`).join('');

    const seasonalLabel     = formatSeasonalNote(f.seasonalNote, f.seasonalNoteText);
    const openingHoursLabel = formatOpeningHours(f.openingHours);

    const seasonal    = seasonalLabel     ? renderMetaRow('seasonal',     'calendar_month', seasonalLabel)     : '';
    const hours       = openingHoursLabel ? renderMetaRow('hours',        'schedule',       openingHoursLabel) : '';
    const openingNote = f.openingNote     ? renderMetaRow('opening-note', 'info',           f.openingNote)     : '';

    const contactLinks = renderContactLinks(f);
    const safeColor    = /^#[0-9a-fA-F]{6}$/.test(f.color) ? f.color : '';

    return `<article class="card" id="facility-${f.id}"${safeColor ? ` style="--color:${safeColor};"` : ''}>
    <div class="card-header">
        <h2 class="card-name">${escapeHtml(f.name)}</h2>
        <p class="card-org">${escapeHtml(f.organization)}</p>
    </div>
    <div class="card-tags">${targetGroupTag}${tags}</div>
    <div class="card-meta">
        <div class="meta-row meta-row--location">
            ${renderIcon('place')}
            <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" class="meta-address" aria-label="${escapeHtml(`Adresse von ${f.name} in Google Maps öffnen`)}">${escapeHtml(addr)}</a>
        </div>
        ${seasonal}${hours}${openingNote}
    </div>
    <div class="card-info readmore">
        <div id="readmore-content-${f.id}" class="readmore__content">${escapeHtml(f.description)}</div>
        <button class="readmore__toggle" aria-expanded="false" aria-controls="readmore-content-${f.id}">
            <span class="readmore__label--more">Mehr anzeigen</span>
            <span class="readmore__label--less" hidden>Weniger anzeigen</span>
        </button>
    </div>
    ${contactLinks.length ? `<div class="card-contact">${contactLinks.join('')}</div>` : ''}
</article>`;
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
        // Not in valueNames — accessed only in filter callbacks
        tags_json:    JSON.stringify(f.tags),
        target_group: f.targetGroup,
        facility_id:  f.id,
        html:         renderCard(f),
    };
}

// ── Open-now helpers ──────────────────────────────────────────────────────────

const WEEKDAY_CODES = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

// Seasonal periods use year 2000/2001 as a placeholder — compare month+day only.
// A period like Nov 01 – Apr 30 wraps across the year boundary.
function isInSeasonalPeriod(period, now) {
    const [, startMonth, startDay] = period.start.split('-').map(Number);
    const [, endMonth,   endDay]   = period.end.split('-').map(Number);
    const nowMD   = (now.getMonth() + 1) * 100 + now.getDate();
    const startMD = startMonth * 100 + startDay;
    const endMD   = endMonth   * 100 + endDay;
    return startMD <= endMD
        ? nowMD >= startMD && nowMD <= endMD    // non-wrapping
        : nowMD >= startMD || nowMD <= endMD;   // wrapping (e.g. Nov–Apr)
}

function isOpenNow(f, now = new Date()) {
    // If seasonal data is present, check whether today falls within a season.
    if (f.seasonalNote.length > 0 && !f.seasonalNote.some(p => isInSeasonalPeriod(p, now))) {
        return false;
    }

    // No daily hours → we cannot determine → exclude.
    if (f.openingHours.length === 0) return false;

    const todayCode     = WEEKDAY_CODES[now.getDay()];
    const yesterdayCode = WEEKDAY_CODES[(now.getDay() + 6) % 7];
    const currentMin    = now.getHours() * 60 + now.getMinutes();

    for (const slot of f.openingHours) {
        const startMin  = timeToMinutes(slot.start);
        const endMin    = timeToMinutes(slot.end);
        const overnight = startMin > endMin; // e.g. 20:00–08:00

        if (slot.days.includes(todayCode)) {
            if (overnight ? currentMin >= startMin : currentMin >= startMin && currentMin <= endMin) {
                return true;
            }
        }

        // An overnight slot that started yesterday may still be open now.
        if (overnight && slot.days.includes(yesterdayCode) && currentMin <= endMin) {
            return true;
        }
    }

    return false;
}

async function loadFacilities() {
    const res = await fetch('facilities.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawFacilities = await res.json();
    return rawFacilities.map(normalizeFacility);
}

async function init() {
    const $stats     = $('#stats');
    const $filters   = $('#filters');
    const $tgFilters = $('#target-group-filters');
    const $orgFilters = $('#org-filters');
    $stats.text('Einrichtungen werden geladen …').removeClass('is-error');

    let facilities;
    try {
        facilities = await loadFacilities();
    } catch (error) {
        console.error('Could not load facilities.json', error);
        $stats.text('Die Einrichtungen konnten gerade nicht geladen werden.').addClass('is-error');
        return;
    }

    // Keyed lookup used by the open-now filter to avoid re-fetching from List.js
    const facilityMap = new Map(facilities.map(f => [f.id, f]));

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

    // ── Mutable filter/sort state ─────────────────────────────────────────────
    let activeTag          = null;
    let activeTargetGroup  = null;
    let activeOrganization = null;
    let filterOpenNow      = false;
    let sortState          = { field: 'name', order: 'asc' };

    // ── Stats ─────────────────────────────────────────────────────────────────
    function updateStats() {
        const visible = listInstance.visibleItems.length;
        const total   = listInstance.items.length;
        const suffix  = visible === 0 ? ' Keine Treffer für die aktuelle Suche oder den Filter.' : '';
        $stats.text(`${visible} von ${total} Einrichtungen${suffix}`);
    }

    // ── Filtering ─────────────────────────────────────────────────────────────
    function applyFilters() {
        if (!activeTag && !activeTargetGroup && !activeOrganization && !filterOpenNow) {
            listInstance.filter();
            return;
        }
        const now = new Date();
        listInstance.filter(item => {
            const values = item.values();
            if (activeTag          && !JSON.parse(values.tags_json || '[]').includes(activeTag)) return false;
            if (activeTargetGroup  && values.target_group !== activeTargetGroup)                 return false;
            if (activeOrganization && values.organization !== activeOrganization)                return false;
            if (filterOpenNow) {
                const facility = facilityMap.get(values.facility_id);
                if (!facility || !isOpenNow(facility, now)) return false;
            }
            return true;
        });
    }

    // Creates a toggle filter button, appends it to $container, and returns it.
    function makeFilterBtn($container, id, label, onClick) {
        const $btn = $('<button>')
            .attr({ type: 'button', 'data-id': id, 'aria-pressed': 'false' })
            .addClass('filter-btn pill')
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

    // Builds a complete filter group: an "all" reset button followed by one button per item.
    // items: Array<{ id: string, label: string }>
    // onSelect: called with the selected id, or null when "all" is chosen.
    function buildFilterGroup($container, allLabel, items, onSelect) {
        makeFilterBtn($container, 'all', allLabel, () => onSelect(null))
            .addClass('active').attr('aria-pressed', 'true');
        items.forEach(({ id, label }) =>
            makeFilterBtn($container, id, label, () => onSelect(id))
        );
    }

    // ── Search ────────────────────────────────────────────────────────────────
    $('#search-input').on('input', function () {
        listInstance.search(this.value, SEARCH_FIELDS);
        updateStats();
    });

    // ── Open now ──────────────────────────────────────────────────────────────
    $('#open-now-btn').on('click', function () {
        filterOpenNow = !filterOpenNow;
        $(this).toggleClass('active', filterOpenNow).attr('aria-pressed', String(filterOpenNow));
        applyFilters();
        updateStats();
    });

    // ── Sort ──────────────────────────────────────────────────────────────────
    const $sortBtns = $('.sort-btn');
    $sortBtns.on('click', function () {
        const field = $(this).data('sort');
        sortState = sortState.field === field
            ? { field, order: sortState.order === 'asc' ? 'desc' : 'asc' }
            : { field, order: 'asc' };
        listInstance.sort(field, { order: sortState.order });
        $sortBtns.removeClass('active asc desc').attr('aria-pressed', 'false');
        $(this).addClass(`active ${sortState.order}`).attr('aria-pressed', 'true');
        updateStats();
    });

    listInstance.sort(sortState.field, { order: sortState.order });

    // ── Target group filters ──────────────────────────────────────────────────
    const groupOrder = ['women', 'men', 'families', 'youth', 'lgbtiq'];
    const usedGroups = new Set(facilities.map(f => f.targetGroup));
    buildFilterGroup(
        $tgFilters, 'Alle Gruppen',
        groupOrder.filter(g => usedGroups.has(g)).map(g => ({ id: g, label: TARGET_GROUP_LABELS[g] })),
        value => { activeTargetGroup = value; applyFilters(); }
    );

    // ── Tag filters ───────────────────────────────────────────────────────────
    const usedTags = [...new Set(facilities.flatMap(f => f.tags))]
        .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), 'de'));
    buildFilterGroup(
        $filters, 'Alle',
        usedTags.map(tag => ({ id: tag, label: tagLabel(tag) })),
        value => { activeTag = value; applyFilters(); }
    );

    // ── Organization filters ──────────────────────────────────────────────────
    const usedOrgs = [...new Set(facilities.map(f => f.organization))]
        .sort((a, b) => a.localeCompare(b, 'de'));
    buildFilterGroup(
        $orgFilters, 'Alle',
        usedOrgs.map(org => ({ id: org, label: org })),
        value => { activeOrganization = value; applyFilters(); }
    );

    updateStats();
}

init();
