( function () {
    "use strict";

    function read( path ) {
        return fetch( chrome.runtime.getURL( path ) ).then( function ( answer ) {
            return answer.text();
        } );
    }

    function fail( error ) {
        const groups = document.getElementById( "effect_groups" );
        if( !groups ) return;

        const note = document.createElement( "div" );

        note.className = "empty no_select";
        note.textContent = "the effect list did not load: "
            + ( ( error && error.message ) || String( error ) );

        groups.appendChild( note );
    }

    function run() {
        ( extension.ready || [] ).forEach( function ( step ) {
            try {
                step();
            } catch( error ) {
                fail( error );
            }
        } );
    }

    function start() {
        if( document.readyState === "loading" ) {
            document.addEventListener( "DOMContentLoaded", run, { once: true } );
            return;
        }

        run();
    }

    extension.catalogue.read_all( read ).then( function ( parts ) {
        extension.catalogue.install( parts );
        start();
    } ).catch( function ( error ) {
        if( document.readyState === "loading" ) {
            document.addEventListener( "DOMContentLoaded", function () {
                fail( error );
            }, { once: true } );
            return;
        }

        fail( error );
    } );
} )();
