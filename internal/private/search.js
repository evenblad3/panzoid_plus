( function () {
    "use strict";

    const field = document.querySelector( ".search_field" );
    const empty = document.getElementById( "no_matches" );
    const count = document.getElementById( "match_count" );

    function shown_in( box ) {
        const buttons = box.querySelectorAll( ".effect_button" );

        for( let it = 0; it < buttons.length; ++it ) {
            if( buttons[ it ].style.display !== "none" ) return true;
        }

        return false;
    }

    function filter() {
        const term = field.value.trim().toLowerCase();
        let found = 0;

        document.querySelectorAll( ".effect_button" ).forEach( function ( button ) {
            const name = button.firstChild.textContent.toLowerCase();
            const desc = button.lastElementChild ? button.lastElementChild.textContent : "";
            const hit = !term || ( name + " " + desc.toLowerCase() ).indexOf( term ) !== -1;

            button.style.display = hit ? "" : "none";
            if( hit ) ++found;
        } );

        document.querySelectorAll( ".group_name" ).forEach( function ( title ) {
            const box = title.nextElementSibling;
            const any = shown_in( box );

            box.style.display = any ? "" : "none";
            title.style.display = any ? "" : "none";
        } );

        empty.hidden = found > 0;
        count.textContent = term ? String( found ) : "";
    }

    function first_shown() {
        const buttons = document.querySelectorAll( ".effect_button" );

        for( let it = 0; it < buttons.length; ++it ) {
            if( buttons[ it ].style.display !== "none" ) return buttons[ it ];
        }

        return null;
    }

    field.addEventListener( "input", filter );

    field.addEventListener( "keydown", function ( event ) {
        if( event.key === "Escape" ) {
            field.value = "";
            filter();
            return;
        }

        if( event.key !== "Enter" ) return;

        const button = first_shown();
        if( button ) button.click();
    } );

    field.focus();
    filter();
} )();
