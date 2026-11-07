( function () {
    "use strict";

    const panzoid_site = /^https:\/\/([a-z0-9-]+\.)?panzoid\.com\//i;

    function send_to_editor( clip ) {
        chrome.tabs.query( { active: true, currentWindow: true }, function ( tabs ) {
            if( !tabs.length || !panzoid_site.test( tabs[ 0 ].url || "" ) ) return;

            chrome.tabs.sendMessage( tabs[ 0 ].id, { type: "pz_insert", data: clip },
                function () {
                    void chrome.runtime.lastError;
                } );
        } );
    }

    document.querySelectorAll( ".effect_button" ).forEach( function ( button ) {
        const effect = window.pz_effect.find( button.dataset.id );
        if( !effect ) return;

        button.addEventListener( "click", function () {
            const clip = window.pz_effect.json( effect );

            send_to_editor( clip );

            try {
                navigator.clipboard.writeText( clip ).catch( function () {} );
            } catch( error ) {}
        } );
    } );
} )();
