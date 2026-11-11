( function () {
    "use strict";

    const storage_key = "panzoid_plus.settings";

    const defaults = {
        anisotropy: true,
        correct_uv: true,
        mount_effects: true,
        precise_values: true,
        full_preview: false
    };

    const state = Object.assign( {}, defaults );
    const pickers = {};
    const touched = {};

    function settings_save() {
        chrome.storage.local.set( { [ storage_key ]: state } );
    }

    Object.keys( defaults ).forEach( function ( name ) {
        const picker = document.getElementById( "tweak_" + name );
        if( !picker ) return;

        pickers[ name ] = picker;
        picker.checked = state[ name ];

        picker.addEventListener( "change", function () {
            touched[ name ] = true;
            state[ name ] = picker.checked;

            settings_save();
        } );
    } );

    chrome.storage.local.get( storage_key, function ( stored ) {
        const saved = ( stored || {} )[ storage_key ] || {};

        Object.keys( pickers ).forEach( function ( name ) {
            if( touched[ name ] || typeof saved[ name ] !== "boolean" ) return;

            state[ name ] = saved[ name ];
            pickers[ name ].checked = saved[ name ];
        } );

        if( Object.keys( touched ).length ) settings_save();
    } );
} )();
