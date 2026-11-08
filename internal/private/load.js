( function () {
    "use strict";

    function read( path ) {
        return fetch( chrome.runtime.getURL( path ) ).then( function ( answer ) {
            return answer.text();
        } );
    }

    function run() {
        ( extension.ready || [] ).forEach( function ( step ) {
            try {
                step();
            } catch( error ) {}
        } );
    }

    extension.catalogue.read_all( read ).then( function ( parts ) {
        extension.catalogue.install( parts );

        if( document.readyState === "loading" ) {
            document.addEventListener( "DOMContentLoaded", run, { once: true } );
            return;
        }

        run();
    } );
} )();
