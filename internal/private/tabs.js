( function () {
    "use strict";

    const remembered = "panzoid_plus.tab";

    const panes = [
        { name: "effects", button: null, pane: null },
        { name: "tweaks", button: null, pane: null },
        { name: "inspect", button: null, pane: null },
        { name: "readme", button: null, pane: null }
    ];

    function show( open ) {
        panes.forEach( function ( entry ) {
            entry.button.classList.toggle( "rail_on", entry === open );
            entry.pane.classList.toggle( "pane_off", entry !== open );
        } );

        localStorage.setItem( remembered, open.name );
    }

    function start() {
        panes.forEach( function ( entry ) {
            entry.button = document.getElementById( "tab_" + entry.name );
            entry.pane = document.getElementById( "pane_" + entry.name );

            entry.button.addEventListener( "click", function () {
                show( entry );
            } );
        } );

        const saved = localStorage.getItem( remembered );
        const wanted = panes.filter( function ( entry ) {
            return entry.name === saved;
        } );

        show( wanted.length? wanted[ 0 ]: panes[ 0 ] );
    }

    document.addEventListener( "DOMContentLoaded", start );
} )();
