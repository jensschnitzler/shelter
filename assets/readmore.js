/* https://github.com/fabiospampinato/cash */

/* ---
ReadMore.js by Jens Schnitzler
--- */

/* --- Plugin --- */
$(function(){
    console.log('--- ReadMore.js ---');
    $.fn.readMore = function(options) {

        //console.log({options});

        // --- Default settings
        const settings = $.extend({
            linesMax: 6,
            contentClass: '.readmore__content',
            trigger: 'button', // 'button' || 'hover' || 'click'
            toggleClass: '.readmore__toggle',
        }, options );
        const transition_duration = 200; // ms
        const supportsHover = window.matchMedia('(hover: hover)').matches;

        if (!supportsHover && settings.trigger == 'hover') {
            settings.trigger = 'click';
        }

        //console.log({settings});

        // --- Internal functions
        function checkOverflow(elem, content) {
            if ( !elem.hasClass('rm--more') ) {
                const content_height = Math.ceil( content[0].clientHeight ) + 1;
                //console.log({content_height});
                const content_scrollHeight = Math.floor( content[0].scrollHeight );
                //console.log({content_scrollHeight});
                const has_overflow = content_scrollHeight > content_height;
                //console.log({has_overflow});
                if ( has_overflow ) {
                    elem.addClass('rm--active');

                    // mark overflowing children
                    const content_children = content.children().removeClass('rm--overflowing');
                    if( content_children.length > 1 ){

                        const line_height = parseFloat( content.css('line-height') );
                        //console.log({line_height});
                        const lines_max = settings.linesMax;
                        //console.log({lines_max});
                        const threshold = line_height * lines_max;
                        //console.log({threshold});

                        content_children.each(function(){
                            const child = $(this);
                            const top = child.position().top + parseFloat( child.css('margin-top') );
                            if ( top >= threshold ) {
                                child.addClass('rm--overflowing');
                            }
                        });
                    }

                } else {
                    elem.removeClass('rm--active');
                }
            }
        }

        function triggerAfterResize(callback, delay = 100) {
            let resizeTimer;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    callback();
                }, delay);
            });
        }

        function setReadMoreState(elem, expanded = true) {
            const content = elem.find( settings.contentClass ).first();
            elem.toggleClass('rm--more', !expanded);
            content.toggleClass('is-expanded', !expanded);
            const toggle = elem.find( settings.toggleClass ).first();
            if (toggle.length) {
                const labelMore = toggle.find('.readmore__label--more').first();
                const labelLess = toggle.find('.readmore__label--less').first();
                toggle.attr('aria-expanded', !expanded);
                labelMore.prop('hidden', !expanded);
                labelLess.prop('hidden', expanded);
            }
        }

        function toggleReadMore(elem, expanded = true) {
            const content = elem.find( settings.contentClass ).first();
            checkOverflow(elem, content);
            const content_height_before = Math.ceil(content.height());
            if (!expanded) {
                content.data('height-min', content_height_before);
            }
            console.log({content_height_before});
            content.css({
                'height': content_height_before + 'px',
                'overflow': 'clip',
            });
            setTimeout(function(){
                let content_height_after = 0;
                if (expanded) { // minimize
                    console.log('minimize');
                    content_height_after = content.data('height-min');
                    setTimeout(function(){
                        setReadMoreState(elem, expanded); // change state after animation
                    }, transition_duration);
                } else { // maximize
                    console.log('maximize');
                    setReadMoreState(elem, expanded); // change state before animation
                    content_height_after = Math.min( window.innerHeight + content_height_before, Math.ceil(content[0].scrollHeight) );
                }
                content.css({
                    'height': content_height_after + 'px',
                });
                setTimeout(function(){ // reset style attributes after animation
                    content.css({
                        'height': '',
                        'overflow': '',
                    });
                }, transition_duration);
                console.log({content_height_after});
            }, 10);
        }

        // --- Action
        return this.each(function() {
            const elem = $(this);
            const content = elem.find( settings.contentClass ).first();


            if (content.length){

                // prepare animation
                content.css({
                    'transition': 'height ' + transition_duration + 'ms linear',
                    'will-change': 'height',
                    'backface-visibility': 'hidden',
                });

                elem.addClass('rm--init').removeClass('rm--more').css({
                    '--lines_max':settings.linesMax,
                });
                checkOverflow(elem, content)
                triggerAfterResize(function(){
                    elem.removeClass('rm--more');
                    checkOverflow(elem, content);
                });

                const toggle = elem.find( settings.toggleClass ).first();
                if (settings.trigger == 'button' && toggle.length == 0) {
                    settings.trigger = 'click';
                }

                if (settings.trigger == 'button') {
                    const toggle = elem.find( settings.toggleClass ).first();
                    toggle.on('click',function(){
                        const expanded = toggle.attr('aria-expanded') === 'true';
                        toggleReadMore(elem, expanded);
                    });
                } else if (settings.trigger == 'hover') {
                    elem.on('mouseenter',function(){
                        console.log('elem mouseenter');
                        toggleReadMore(elem, false);
                    }).on('mouseleave',function(){
                        console.log('elem mouseleave');
                        toggleReadMore(elem, true);
                    });
                } else if (settings.trigger == 'click') {
                    elem.on('click',function(){
                        const expanded = toggle.attr('aria-expanded') === 'true';
                        toggleReadMore(elem, expanded);
                    });
                }

            }
        });

    };
});


/* --- Initiation --- */
$(function(){
    const elems = $('.readmore').readMore({
        linesMax: 3,
    });
});
