/* https://github.com/fabiospampinato/cash */

/* ---
ReadMore.js by Jens Schnitzler
--- */

/* --- Plugin --- */
$(function(){

    // Shared debounced resize handler — one listener for all readMore instances
    // rather than one per element, which would cause listener accumulation.
    const _resizeCallbacks = [];
    let   _resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(function () {
            for (const fn of _resizeCallbacks) fn();
        }, 100);
    });

    $.fn.readMore = function(options) {

        // --- Default settings
        const settings = $.extend({
            linesMax: 6,
            contentClass: '.readmore__content',
            trigger: 'button', // 'button' || 'hover' || 'click'
            toggleClass: '.readmore__toggle',
        }, options);
        const TRANSITION_MS = 200;
        const supportsHover = window.matchMedia('(hover: hover)').matches;

        if (!supportsHover && settings.trigger === 'hover') {
            settings.trigger = 'click';
        }

        // --- Internal functions
        function checkOverflow(elem, content) {
            if (!elem.hasClass('rm--more')) {
                const clientHeight = Math.ceil(content[0].clientHeight) + 1;
                const scrollHeight = Math.floor(content[0].scrollHeight);
                const hasOverflow  = scrollHeight > clientHeight;

                if (hasOverflow) {
                    elem.addClass('rm--active');

                    // Mark children that fall below the visible threshold
                    const children = content.children().removeClass('rm--overflowing');
                    if (children.length > 1) {
                        const lineHeight = parseFloat(content.css('line-height'));
                        const threshold  = lineHeight * settings.linesMax;

                        children.each(function () {
                            const child = $(this);
                            const top   = child.position().top + parseFloat(child.css('margin-top'));
                            if (top >= threshold) child.addClass('rm--overflowing');
                        });
                    }
                } else {
                    elem.removeClass('rm--active');
                }
            }
        }

        // Sets the DOM state for collapsed (collapse=true) or expanded (collapse=false).
        function setReadMoreState(elem, collapse) {
            const content = elem.find(settings.contentClass).first();
            elem.toggleClass('rm--more', !collapse);
            content.toggleClass('is-expanded', !collapse);
            const toggle = elem.find(settings.toggleClass).first();
            if (toggle.length) {
                const labelMore = toggle.find('.readmore__label--more').first();
                const labelLess = toggle.find('.readmore__label--less').first();
                toggle.attr('aria-expanded', String(!collapse));
                labelMore.prop('hidden', !collapse);
                labelLess.prop('hidden', collapse);
            }
        }

        // Animates to collapsed (collapse=true) or expanded (collapse=false).
        function toggleReadMore(elem, collapse) {
            const content       = elem.find(settings.contentClass).first();
            checkOverflow(elem, content);
            const heightBefore  = Math.ceil(content.height());

            if (!collapse) {
                // Expanding — remember collapsed height so we can animate back later
                content.data('height-min', heightBefore);
            }

            content.css({ height: heightBefore + 'px', overflow: 'clip' });

            setTimeout(function () {
                let heightAfter;
                if (collapse) {
                    heightAfter = content.data('height-min');
                    setTimeout(function () {
                        setReadMoreState(elem, collapse); // update state after animation
                    }, TRANSITION_MS);
                } else {
                    setReadMoreState(elem, collapse); // update state before animation
                    heightAfter = Math.min(
                        window.innerHeight + heightBefore,
                        Math.ceil(content[0].scrollHeight)
                    );
                }
                content.css({ height: heightAfter + 'px' });

                setTimeout(function () { // reset inline styles after animation completes
                    content.css({ height: '', overflow: '' });
                }, TRANSITION_MS);
            }, 10);
        }

        // --- Action
        return this.each(function () {
            const elem    = $(this);
            const content = elem.find(settings.contentClass).first();

            if (content.length) {

                // Prepare height transition
                content.css({
                    transition: 'height ' + TRANSITION_MS + 'ms linear',
                    'will-change': 'height',
                    'backface-visibility': 'hidden',
                });

                elem.addClass('rm--init').removeClass('rm--more').css({
                    '--lines_max': settings.linesMax,
                });
                checkOverflow(elem, content);

                // Re-check overflow on resize; collapse first to remeasure correctly
                _resizeCallbacks.push(function () {
                    elem.removeClass('rm--more');
                    checkOverflow(elem, content);
                });

                const toggle = elem.find(settings.toggleClass).first();
                if (settings.trigger === 'button' && toggle.length === 0) {
                    settings.trigger = 'click';
                }

                if (settings.trigger === 'button') {
                    toggle.on('click', function () {
                        const collapse = toggle.attr('aria-expanded') === 'true';
                        toggleReadMore(elem, collapse);
                    });
                } else if (settings.trigger === 'hover') {
                    elem.on('mouseenter', function () {
                        toggleReadMore(elem, false); // false = expand
                    }).on('mouseleave', function () {
                        toggleReadMore(elem, true);  // true = collapse
                    });
                } else if (settings.trigger === 'click') {
                    elem.on('click', function () {
                        const collapse = toggle.attr('aria-expanded') === 'true';
                        toggleReadMore(elem, collapse);
                    });
                }
            }
        });

    };
});


/* --- Initiation is handled by main.js after List.js renders cards --- */
