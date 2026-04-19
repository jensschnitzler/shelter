const TARGET_GROUP_LABELS = {
    women:                'Frauen',
    men:                  'Männer',
    families:             'Familien',
    youth:                'Jugendliche',
    lgbtiq:               'LGBTIQ+',
    eu_citizens:          'EU-Bürger:innen',
    uninsured:            'Ohne Krankenversicherung',
    people_who_use_drugs: 'Drogengebrauchend',
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

const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char]);
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
        periods: normalizeSeasonalPeriods(rawPeriods), // handles non-arrays internally
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
        const rangeStart = regular[i];
        let rangeEndIdx  = i;

        while (
            rangeEndIdx + 1 < regular.length
            && WEEKDAY_ORDER.indexOf(regular[rangeEndIdx + 1]) === WEEKDAY_ORDER.indexOf(regular[rangeEndIdx]) + 1
        ) {
            rangeEndIdx += 1;
        }

        if (rangeEndIdx > i + 1) {
            labels.push(`${WEEKDAY_LABELS[rangeStart]}-${WEEKDAY_LABELS[regular[rangeEndIdx]]}`);
            i = rangeEndIdx;
        } else {
            labels.push(WEEKDAY_LABELS[rangeStart]);
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

function normalizeStringArray(raw, fallback = []) {
    return Array.isArray(raw) ? raw.filter(Boolean).map(String) : fallback;
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
        tagsOffer:   normalizeStringArray(raw?.tagsOffer),
        tagsFeature: normalizeStringArray(raw?.tagsFeature),
        targetGroup: normalizeStringArray(raw?.targetGroup, ['all']),
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

    const targetGroupTags = f.targetGroup
        .filter(g => g !== 'all' && TARGET_GROUP_LABELS[g])
        .map(g => `<span class="tag pill tag--target-group">${escapeHtml(TARGET_GROUP_LABELS[g])}</span>`)
        .join('');
    const offerTags   = f.tagsOffer.map(t => `<span class="${tagCls(t)}">${escapeHtml(tagLabel(t))}</span>`).join('');
    const featureTags = f.tagsFeature.map(t => `<span class="${tagCls(t)}">${escapeHtml(tagLabel(t))}</span>`).join('');

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
    <div class="card-tags">${targetGroupTags}${offerTags}${featureTags}</div>
    <div class="card-meta">
        <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener"  class="meta-row meta-row--location" aria-label="${escapeHtml(`Adresse von ${f.name} in Google Maps öffnen`)}">
            ${renderIcon('place')}
            <span class="meta-address">${escapeHtml(addr)}</span>
        </a>
        ${seasonal}
        ${hours}
        ${openingNote}
    </div>
    <div class="card-info readmore">
        <div id="readmore-content-${f.id}" class="readmore__content">${escapeHtml(f.description)}</div>
        <button class="readmore__toggle" aria-expanded="false" aria-controls="readmore-content-${f.id}">
            <span class="readmore__label--more">${renderIcon('plus')} Mehr anzeigen</span>
            <span class="readmore__label--less" hidden>${renderIcon('minus')} Weniger anzeigen</span>
        </button>
    </div>
    ${contactLinks.length ? `<div class="card-contact">${contactLinks.join('')}</div>` : ''}
</article>`;
}

// Builds the searchable tag string: raw keys + translated labels for both tag groups.
function buildTagSearchStr(tagsOffer, tagsFeature) {
    const all = [...tagsOffer, ...tagsFeature];
    return [...all, ...all.map(tagLabel)].join(' ');
}

// Flatten nested facility object into List.js-compatible flat values.
// tags_offer / tags_feature / target_group are intentionally omitted from valueNames
// so List.js won't serialize them to DOM, but they remain accessible via
// item.values() for filter callbacks.
function flattenFacility(f) {
    return {
        name:         f.name,
        organization: f.organization,
        subdistrict:  f.address.subdistrict,
        district:     f.address.district,
        description:  f.description,
        tags_str:     buildTagSearchStr(f.tagsOffer, f.tagsFeature),
        // Not in valueNames — accessed only in filter callbacks
        tags_offer:   f.tagsOffer,
        tags_feature: f.tagsFeature,
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
    const $stats          = $('#stats');
    const $tgFilters      = $('#target-group-filters');
    const $offerFilters   = $('#offer-filters');
    const $featureFilters = $('#feature-filters');
    const $orgFilters     = $('#org-filters');
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
    let activeOfferTag     = null;
    let activeFeatureTag   = null;
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
        if (!activeOfferTag && !activeFeatureTag && !activeTargetGroup && !activeOrganization && !filterOpenNow) {
            listInstance.filter();
            return;
        }
        const now = new Date();
        listInstance.filter(item => {
            const values = item.values();
            if (activeOfferTag   && !values.tags_offer.includes(activeOfferTag))   return false;
            if (activeFeatureTag && !values.tags_feature.includes(activeFeatureTag)) return false;
            if (activeTargetGroup) {
                const groups = values.target_group;
                if (!groups.includes(activeTargetGroup) && !groups.includes('all')) return false;
            }
            if (activeOrganization && values.organization !== activeOrganization) return false;
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
    const groupOrder = ['women', 'men', 'families', 'youth', 'lgbtiq', 'eu_citizens', 'uninsured', 'people_who_use_drugs'];
    const usedGroups = new Set(facilities.flatMap(f => f.targetGroup));
    buildFilterGroup(
        $tgFilters, 'Alle',
        groupOrder.filter(g => usedGroups.has(g)).map(g => ({ id: g, label: TARGET_GROUP_LABELS[g] })),
        value => { activeTargetGroup = value; applyFilters(); }
    );

    // ── Offer tag filters ─────────────────────────────────────────────────────
    const usedOfferTags = [...new Set(facilities.flatMap(f => f.tagsOffer))]
        .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), 'de'));
    buildFilterGroup(
        $offerFilters, 'Alle',
        usedOfferTags.map(tag => ({ id: tag, label: tagLabel(tag) })),
        value => { activeOfferTag = value; applyFilters(); }
    );

    // ── Feature tag filters ───────────────────────────────────────────────────
    const usedFeatureTags = [...new Set(facilities.flatMap(f => f.tagsFeature))]
        .sort((a, b) => tagLabel(a).localeCompare(tagLabel(b), 'de'));
    buildFilterGroup(
        $featureFilters, 'Alle',
        usedFeatureTags.map(tag => ({ id: tag, label: tagLabel(tag) })),
        value => { activeFeatureTag = value; applyFilters(); }
    );

    // ── Organization filters ──────────────────────────────────────────────────
    const usedOrgs = [...new Set(facilities.map(f => f.organization))]
        .sort((a, b) => a.localeCompare(b, 'de'));
    buildFilterGroup(
        $orgFilters, 'Alle',
        usedOrgs.map(org => ({ id: org, label: org })),
        value => { activeOrganization = value; applyFilters(); }
    );

    initCollapsibleControls();
    updateStats();
}

// Wraps filter buttons in collapsible pill containers for each .controls--collapsible nav.
// Only collapses a nav when its pills actually wrap to more than one row.
function initCollapsibleControls() {
    $('.controls--collapsible').each(function () {
        const $nav = $(this);

        // Move all filter buttons into a dedicated pills row
        const $pills = $('<div class="controls__pills"></div>');
        $nav.children('.filter-btn').appendTo($pills);
        $nav.append($pills);

        // Measure overflow before collapsing — offsetHeight reflects full content at this point
        const pillsEl   = $pills[0];
        const firstPill = $pills.children('.filter-btn')[0];
        const rowPx     = firstPill ? firstPill.offsetHeight : 0;

        if (rowPx === 0 || pillsEl.offsetHeight <= rowPx + 4) {
            return; // Single row — nothing to collapse, skip toggle entirely
        }

        // Inject toggle button into the label row (between label and pills)
        const $toggle = $(
            '<button class="controls__toggle pill" aria-expanded="false">' +
            '<span class="controls__toggle-label">Mehr</span>' +
            '<span class="material-symbols-outlined" aria-hidden="true">expand_more</span>' +
            '</button>'
        );
        $nav.children('span').first().after($toggle);

        // Start collapsed
        $pills.css('max-height', rowPx + 'px');
        $nav.addClass('is-collapsed');

        $toggle.on('click', function () {
            const isCollapsed = $nav.hasClass('is-collapsed');

            if (isCollapsed) {
                // Expand: animate max-height to full scroll height, then clear for free reflow
                $nav.removeClass('is-collapsed');
                $pills.css('max-height', pillsEl.scrollHeight + 'px');
                $pills.one('transitionend', () => {
                    if (!$nav.hasClass('is-collapsed')) $pills.css('max-height', 'none');
                });
                $toggle.attr('aria-expanded', 'true');
                $toggle.find('.controls__toggle-label').text('Weniger');
            } else {
                // Collapse: set explicit start value first — max-height: none cannot be transitioned.
                // Double rAF ensures the browser commits the new value before the transition begins.
                $pills.css('max-height', pillsEl.scrollHeight + 'px');
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    $nav.addClass('is-collapsed');
                    $pills.css('max-height', rowPx + 'px');
                }));
                $toggle.attr('aria-expanded', 'false');
                $toggle.find('.controls__toggle-label').text('Mehr');
            }
        });
    });
}

init();
