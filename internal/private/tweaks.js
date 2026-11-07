( function () {
    "use strict";

    const storage_key = "pz:site";

    const defaults = {
        fix_text_uv: true,
        anisotropy: true,
        better_shadows: true,
        mount_effects: true,
        precise_values: false,
        sharp_preview: false
    };

    const boxes = {};

    Object.keys( defaults ).forEach( function ( name ) {
        const box = document.getElementById( "tweak_" + name );
        if( box ) boxes[ name ] = box;
    } );

    function save_settings() {
        const settings = {};

        Object.keys( defaults ).forEach( function ( name ) {
            settings[ name ] = boxes[ name ] ? boxes[ name ].checked : defaults[ name ];
        } );

        chrome.storage.local.set( { [ storage_key ]: settings } );
    }

    chrome.storage.local.get( storage_key, function ( stored ) {
        const saved = stored[ storage_key ] || {};

        Object.keys( boxes ).forEach( function ( name ) {
            boxes[ name ].checked = typeof saved[ name ] === "boolean"
                ? saved[ name ]
                : defaults[ name ];
            boxes[ name ].addEventListener( "change", save_settings );
        } );
    } );
} )();
