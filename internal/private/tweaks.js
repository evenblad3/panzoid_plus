( function () {
    "use strict";

    const storage_key = "panzoid_plus.settings";

    const defaults = {
        anisotropy: true,
        better_shadows: true,
        fix_text_uv: true,
        mount_effects: true,
        precise_values: false,
        sharp_preview: false
    };

    const pickers = {};

    Object.keys( defaults ).forEach( function ( name ) {
        const picker = document.getElementById( "tweak_" + name );
        if( picker ) pickers[ name ] = picker;
    } );

    function save() {
        const settings = {};

        Object.keys( defaults ).forEach( function ( name ) {
            settings[ name ] = pickers[ name ]?
                pickers[ name ].value === "on": defaults[ name ];
        } );

        chrome.storage.local.set( { [ storage_key ]: settings } );
    }

    chrome.storage.local.get( storage_key, function ( stored ) {
        const saved = stored[ storage_key ] || {};

        Object.keys( pickers ).forEach( function ( name ) {
            const on = typeof saved[ name ] === "boolean"? saved[ name ]: defaults[ name ];

            pickers[ name ].value = on? "on": "off";
            pickers[ name ].addEventListener( "change", save );
        } );
    } );
} )();
