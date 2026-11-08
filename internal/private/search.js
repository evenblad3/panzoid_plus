extension.ready = extension.ready || [];
extension.ready.push( function () {
    "use strict";

    const field = document.querySelector( ".search_field" );
    const empty = document.getElementById( "no_matches" );
    const count = document.getElementById( "match_count" );

    function visible_in( box ) {
        const buttons = box.querySelectorAll( ".effect_button" );

        for( let it = 0; it < buttons.length; ++it ) {
            if( buttons[ it ].style.display !== "none" ) return buttons[ it ];
        }

        return null;
    }

    function filter() {
        const term = field.value.trim().toLowerCase();
        let found = 0;

        document.querySelectorAll( ".effect_button" ).forEach( function ( button ) {
            const name = button.firstChild.textContent.toLowerCase();
            const description = button.lastElementChild?
                button.lastElementChild.textContent.toLowerCase(): "";

            const hit = !term || ( name + " " + description ).indexOf( term ) !== -1;

            button.style.display = hit? "": "none";
            if( hit ) ++found;
        } );

        document.querySelectorAll( ".group_name" ).forEach( function ( title ) {
            const box = title.nextElementSibling;
            const any = visible_in( box )? "": "none";

            box.style.display = any;
            title.style.display = any;
        } );

        empty.hidden = found > 0;
        count.textContent = term? String( found ): "";
    }

    field.addEventListener( "input", filter );

    field.addEventListener( "keydown", function ( event ) {
        if( event.key === "Escape" ) {
            field.value = "";
            filter();
            return;
        }

        if( event.key !== "Enter" ) return;

        const button = visible_in( document );
        if( button ) button.click();
    } );

    field.focus();
    filter();
} );
