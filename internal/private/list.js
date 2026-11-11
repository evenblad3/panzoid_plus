extension.ready = extension.ready || [];
extension.ready.push( function () {
    "use strict";

    const groups = document.getElementById( "effect_groups" );
    const pinned_key = "panzoid_plus.pinned";

    function pinned_read() {
        try {
            const saved = JSON.parse( localStorage.getItem( pinned_key ) || "[]" );

            return Array.isArray( saved )? saved.filter( function ( one ) {
                return typeof one === "string";
            } ): [];
        } catch( error ) {
            return [];
        }
    }

    function pinned_write( list ) {
        try {
            localStorage.setItem( pinned_key, JSON.stringify( list ) );
        } catch( error ) {}
    }

    function pinned_toggle( serial ) {
        const list = pinned_read();
        const at = list.indexOf( serial );

        if( at === -1 ) list.push( serial );
        else list.splice( at, 1 );

        pinned_write( list );
        draw();

        if( extension.filter ) extension.filter();
    }

    function add_group( title ) {
        const heading = document.createElement( "div" );
        heading.className = "group_name no_select";
        heading.dataset.name = title;
        heading.textContent = title;
        groups.appendChild( heading );

        const box = document.createElement( "div" );
        groups.appendChild( box );

        return box;
    }

    function add_effect( box, effect, pinned ) {
        const row = document.createElement( "div" );
        row.className = "effect_row";

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

        const star = document.createElement( "button" );
        star.type = "button";
        star.className = pinned? "effect_star effect_star_on": "effect_star";
        star.title = pinned? "unpin": "pin";
        star.textContent = "*";
        star.addEventListener( "click", function () {
            pinned_toggle( effect.serial );
        } );

        row.appendChild( button );
        row.appendChild( star );
        box.appendChild( row );
    }

    function draw() {
        const pinned = pinned_read();

        groups.textContent = "";

        const top = extension.effects.filter( function ( effect ) {
            return pinned.indexOf( effect.serial ) !== -1;
        } );

        if( top.length ) {
            const box = add_group( "Pinned" );

            top.forEach( function ( effect ) {
                add_effect( box, effect, true );
            } );
        }

        Object.keys( extension.tabs ).forEach( function ( key ) {
            const title = extension.tabs[ key ];

            const wanted = extension.effects.filter( function ( effect ) {
                return effect.tab === title && pinned.indexOf( effect.serial ) === -1;
            } );
            if( !wanted.length ) return;

            const box = add_group( title );
            wanted.forEach( function ( effect ) {
                add_effect( box, effect, false );
            } );
        } );
    }

    draw();
} );
