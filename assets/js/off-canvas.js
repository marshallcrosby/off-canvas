var $document = $(document);
var $window = $(window);

// Resize delay
var windowWidth = $window.width();
$window.resize(function() {
    var newWindowWidth = $window.width();

    if (windowWidth !== newWindowWidth) {
        if (this.resizeTO) {
            clearTimeout(this.resizeTO);
        }
        this.resizeTO = setTimeout(function() {
            $(this).trigger('ocResizeEnd');
        }, 150);
    }
    windowWidth = newWindowWidth;
});

(function ($) {
    'use strict';

    // Global variables
    var $body = $('body');
    var toggleBtn = $('.toggle-off-canvas');
    var offCanvasElement = $('.l-off-canvas');
    var offCanvasContent = $('.l-header');
    var offCanvasOverlay = $('.l-off-canvas-overlay');
    var offCanvasCanvas = $('.l-canvas');
    var headerHeight = offCanvasContent.outerHeight();
    var docScrollLoc = 0;
    var currentLoc = 0;
    var focusIndex = 0;
    var tabbableCount = 0;
    var focusBeforeOffCanvas;
    var tapping = false;
    var touchStartX;
    var touchStartY;
    var offCanvasBreakpoint = $body.attr('data-off-canvas-breakpoint');

    // Get browser width with or without scrollbar
    var viewport = function() {
        var view = window;
        var viewString = 'inner';

        if (!('innerWidth' in window)) {
            viewString = 'client';
            view = document.documentElement || document.body;
        }

        return {
            width: view[viewString + 'Width'],
            height: view[viewString + 'Height']
        };
    };

    // Check if is iOS device.
    var isiOS = function() {
        if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {
            $body.addClass('is-ios');
            return true;
        } else {
            return false;
        }
    };

    // Trap the keyboard to the off canvas elements when off canvas is showing
    var trapKeyboardToOC = function() {

        focusBeforeOffCanvas = $(':focus');

        var tabbable = offCanvasElement.find(
            'a[href],' +
            'area[href],' +
            'input:not([disabled]),' +
            'select:not([disabled]),' +
            'textarea:not([disabled]),' +
            'button:not([disabled]),' +
            'iframe,' +
            'object,' +
            'embed,' +
            '[tabindex="0"],' +
            '[contenteditable]'
        );

        var firstTabbable = tabbable.first();
        // var lastTabbable = offCanvasElement.find('.js-tabfix');
        var lastTabbable = tabbable.last();

        // Set focus on first input
        var mlnActive = $('.mln__list .active').last();
        
        if (!mlnActive .length) {
            firstTabbable.focus(); 
        }
        
        //Escape key press
        offCanvasElement.on('keydown', function(e) {
            var childShowingAmount = $(this).find('.mln__child--transitioning').length;

            if (e.keyCode === 27 && !childShowingAmount) {
                e.preventDefault();
                toggleOffCanvas('hide');
            }
        });


        // Redirect last tab to first input
        lastTabbable.on('keydown', function(e) {
            if (e.which === 9 && !e.shiftKey) {
                e.preventDefault();
                firstTabbable.focus();
            }
        });

        // Redirect first shift+tab to last input
        firstTabbable.on('keydown', function(e) {
            if (e.which === 9 && e.shiftKey) {
                e.preventDefault();
                lastTabbable.focus();
            }
        });

        // Focus on the off canvas element
        offCanvasElement.focus();
    };


    var toggleOffCanvas = function(action) {
        docScrollLoc = $document.scrollTop();

        // Close off canvas
        if ($body.hasClass('js-off-canvas-showing') || action === 'undefined' || action === 'hide') {   
            $document.trigger($.Event('hide.offCanvas'));
                     
            $body.removeClass('js-off-canvas-showing');

            // iOS Safari scroll canvas to the original canvas position
            if (isiOS() && $body.hasClass('has-header-fixed')) {
                offCanvasCanvas.css('top', '');

                $('html, body')
                    .css('scroll-behavior', 'auto')
                    .animate({
                        scrollTop: currentLoc
                    }, 0)
                    .css('scroll-behavior', '');
            }

            // After off canvas is hidden
            $('.slide-over-transition')
                .first()
                .one('transitionend webkitTransitionEnd oTransitionEnd', function () {
                    if(!$body.hasClass('js-off-canvas-showing')) {
                        offCanvasElement.addClass('js-l-off-canvas-hide');
                    }
                    $document.trigger($.Event('hidden.offCanvas'));
                }).children().on('transitionend webkitTransitionEnd oTransitionEnd', function () {
                    return false;
                });

            // Syncing aria-expanded attribute on the menu button
            toggleBtn.each(function(){
                $(this).attr('aria-expanded', 'false');
            });

            // Focus on off canvas button
            focusBeforeOffCanvas.focus();

        } else if (!$body.hasClass('js-off-canvas-showing') || action === 'show') { // Open off canvas
            $document.trigger($.Event('show.offCanvas'));
            
            offCanvasElement.removeClass('js-l-off-canvas-hide');

            // iOS Safari set location of canvas so the user doesn't lose where they are
            if (isiOS() && $body.hasClass('has-header-fixed')) {
                offCanvasCanvas.css('top', -(docScrollLoc - headerHeight));
            }

            $body.addClass('js-off-canvas-showing');
            currentLoc = docScrollLoc;

            // Syncing aria-expanded attribute on the menu button
            toggleBtn.each(function(){
                $(this).attr('aria-expanded', 'true');
            });
            
            $('.slide-over-transition')
                .first()
                .one('transitionend webkitTransitionEnd oTransitionEnd', function () {
                    trapKeyboardToOC();
                    $document.trigger($.Event('shown.offCanvas'));
                }).children().on('transitionend webkitTransitionEnd oTransitionEnd', function () {
                    return false;
                });
        }
    };

    // Set height of the off canvas element
    var setOffCanvasHeight = function() {
        if (!$body.hasClass('has-header-fixed')) {
            var offCanvasHeight = $('.l-off-canvas__helper').outerHeight();
            var surroundHeight = $('.l-surround').outerHeight();
            var setHeight;

            if (offCanvasHeight >= surroundHeight) {
                setHeight = offCanvasHeight;
            } else {
                setHeight = surroundHeight;
            }

            setTimeout(function(){
                if (viewport().width < offCanvasBreakpoint) {
                    offCanvasElement.css('min-height', setHeight);
                } else {
                    offCanvasElement.css('min-height', '');
                }
            }, 300);
        }
    };

    // Build overlay that covers up the page content so it can't be interacted with when off canvas nav is enabled
    $('<div></div>')
        .addClass('l-off-canvas-overlay')
        .prependTo('.l-surround');

    // Get X location of user touch
    $body.on('touchstart', function(e) {
        touchStartX = e.originalEvent.touches[0].clientX;
    });

    // If user touches and moves a bit, close the hide the off canvas
    $body.on('touchmove', function(e) {
        var touchRight = e.originalEvent.changedTouches[0].clientX;

        if (touchStartX - 200 > touchRight && $body.hasClass('js-off-canvas-showing') &&
            !$body.hasClass('off-canvas-right') && tapping !== true) {
            toggleOffCanvas();
        } else if (touchStartX + 200 < touchRight && $body.hasClass('js-off-canvas-showing') &&
            $body.hasClass('off-canvas-right') && tapping !== true) {
            toggleOffCanvas();
        }
    });

    // If user clicks (or taps), close the off canvas nav
    $('.toggle-off-canvas, .l-off-canvas-overlay').on('click', function() {
        toggleOffCanvas();
    });

    $(window).on('load', function() {
        setOffCanvasHeight();
        
        offCanvasElement
            .addClass('js-l-off-canvas-hide')
            .append('<span class="js-tabfix" tabindex="0" aria-hidden="true"></span>');
    });

    // Resizer
    $(window).on('ocResizeEnd', function() {
        setOffCanvasHeight();
    });
}(jQuery));
