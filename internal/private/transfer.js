extension.ready = extension.ready || [];
extension.ready.push( function () {
    "use strict";

    const clipmaker =
        /^https:\/\/([a-z0-9-]+\.)?panzoid\.com\/(tools|legacy)\/gen3\/clipmaker/i;

    const groups = document.getElementById( "effect_groups" );

    function editor_send( clip ) {
        chrome.tabs.query( { active: true, currentWindow: true }, function ( tabs ) {
            if( !tabs.length || !clipmaker.test( tabs[ 0 ].url || "" ) ) return;

            chrome.tabs.sendMessage( tabs[ 0 ].id, { variant: "transfer", any: clip },
                function () {
                    void chrome.runtime.lastError;
                } );
        } );
    }

    function clipboard_send( clip ) {
        try {
            navigator.clipboard.writeText( clip ).catch( function () {} );
        } catch( error ) {}
    }

    groups.addEventListener( "click", function ( event ) {
        const button = event.target.closest( ".effect_button" );
        if( !button ) return;

        const effect = extension.effect.effect_by_serial( button.dataset.serial );
        if( !effect ) return;

        const clip = extension.effect.build_json( effect );

        editor_send( clip );
        clipboard_send( clip );
    } );
} );
