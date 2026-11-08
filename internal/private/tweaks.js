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

    const boxes = {};

    Object.keys( defaults ).forEach( function ( name ) {
        const box = document.getElementById( "tweak_" + name );
        if( box ) boxes[ name ] = box;
    } );

    function save() {
        const settings = {};

        Object.keys( defaults ).forEach( function ( name ) {
            settings[ name ] = boxes[ name ]? boxes[ name ].checked: defaults[ name ];
        } );

        chrome.storage.local.set( { [ storage_key ]: settings } );
    }

    chrome.storage.local.get( storage_key, function ( stored ) {
        const saved = stored[ storage_key ] || {};

        Object.keys( boxes ).forEach( function ( name ) {
            boxes[ name ].checked = typeof saved[ name ] === "boolean"
                ? saved[ name ]
                : defaults[ name ];

            boxes[ name ].addEventListener( "change", save );
        } );
    } );
} )();
