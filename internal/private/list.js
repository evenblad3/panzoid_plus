( function () {
    "use strict";

    const pane = document.getElementById( "pane_effects" );

    Object.keys( window.pz_tabs ).forEach( function ( key ) {
        const tab = window.pz_tabs[ key ];
        const mine = window.pz_effects.filter( function ( effect ) {
            return effect.tab === tab;
        } );
        if( !mine.length ) return;

        const title = document.createElement( "div" );
        title.className = "group_name no_select";
        title.dataset.name = tab;
        title.textContent = tab;
        pane.appendChild( title );

        const box = document.createElement( "div" );
        box.className = "group_content";
        pane.appendChild( box );

        mine.forEach( function ( effect ) {
            const button = document.createElement( "button" );
            button.type = "button";
            button.dataset.id = effect.id;
            button.className = "effect_button";
            button.appendChild( document.createTextNode( effect.name ) );

            if( effect.desc ) {
                const desc = document.createElement( "span" );
                desc.className = "effect_desc";
                desc.textContent = effect.desc;
                button.appendChild( desc );
            }

            box.appendChild( button );
        } );
    } );
} )();
