extension.ready = extension.ready || [];
extension.ready.push( function () {
    "use strict";

    const pane = document.getElementById( "pane_effects" );

    function add_group( title ) {
        const heading = document.createElement( "div" );
        heading.className = "group_name no_select";
        heading.dataset.name = title;
        heading.textContent = title;
        pane.appendChild( heading );

        const group = document.createElement( "div" );
        pane.appendChild( group );

        return group;
    }

    function add_effect( group, effect ) {
        const button = document.createElement( "button" );
        button.type = "button";
        button.className = "effect_button";
        button.dataset.serial = effect.serial;
        button.appendChild( document.createTextNode( effect.name ) );

        if( effect.description ) {
            const description = document.createElement( "span" );
            description.className = "effect_description";
            description.textContent = effect.description;
            button.appendChild( description );
        }

        group.appendChild( button );
    }

    Object.keys( extension.tabs ).forEach( function ( key ) {
        const title = extension.tabs[ key ];

        const wanted = extension.effects.filter( function ( effect ) {
            return effect.tab === title;
        } );
        if( !wanted.length ) return;

        const group = add_group( title );
        wanted.forEach( function ( effect ) {
            add_effect( group, effect );
        } );
    } );
} );
