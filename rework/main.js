$(document).ready(function() {

    const container = $('#map-container');
    const portion
    function resize() {
        const min = Math.min(container.height(), container.width());

        const area = { w: $('main').width(), h: $('main').height()};
        const 
        $('#dpad-top-container, #dpad-bottom-container').css({
            width: '100%',
            height: (min * 0.1) + 'px'
        })
        $('#dpad-left-container, #dpad-right-container').css({
            width: (min * 0.1) + 'px',
            height: '100%'
        })
        $('main').css({
            'grid-template-columns': `${min*.1}px auto ${min*.1}px`,
            'grid-template-rows': `${min*.1}px auto ${min*.1}px`
        })
        $('#map-container canvas').width(min + 'px')
        $("#map-container canvas").height(min + 'px')


    }
    resize();
    setTimeout(resize, 0);
    $(window).resize(resize)
})