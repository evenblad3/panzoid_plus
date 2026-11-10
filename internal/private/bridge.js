( function () {
    "use strict";

    const config = {
        storage_key: "panzoid_plus.settings",
        marker: "panzoid+",

        settings_wait: 2000,
        transfer_wait: 2500
    };

    const page_answers = new Map();
    let page_serial = 1;

    function storage_remember( settings ) {
        try {
            localStorage.setItem( config.storage_key, JSON.stringify( settings ) );
        } catch( error ) {}
    }

    function page_ask( variant, payload, wait ) {
        return new Promise( function ( resolve ) {
            const serial = page_serial++;

            const timer = setTimeout( function () {
                page_answers.delete( serial );
                resolve( null );
            }, wait );

            page_answers.set( serial, function ( answer ) {
                clearTimeout( timer );
                page_answers.delete( serial );
                resolve( answer );
            } );

            window.postMessage(
                Object.assign( { extension: config.marker, variant, serial }, payload ), "*" );
        } );
    }

    function settings_push( settings ) {
        storage_remember( settings );
        return page_ask( "settings", { settings }, config.settings_wait );
    }

    function frame_is_editor() {
        return Boolean( document.querySelector( "canvas" )
            || document.querySelector( ".editorpanel" )
            || document.querySelector( "#panecontainer" ) );
    }

    function blob_read( path ) {
        return fetch( chrome.runtime.getURL( path ) ).then( function ( answer ) {
            return answer.text();
        } );
    }

    function catalogue_send() {
        blob_read( "blobs/effects.json" ).then( function ( text ) {
            const catalogue = JSON.parse( text );
            const names = catalogue.map( function ( effect ) { return effect.internal; } );

            const wanted = [ blob_read( "blobs/library.effect" ) ].concat(
                names.map( function ( name ) {
                    return blob_read( "blobs/effects/" + name );
                } ) );

            return Promise.all( wanted ).then( function ( texts ) {
                const sources = {};
                names.forEach( function ( name, it ) { sources[ name ] = texts[ it + 1 ]; } );

                window.postMessage( {
                    extension: config.marker,
                    variant: "catalogue",
                    parts: { catalogue, library: texts[ 0 ], sources }
                }, "*" );
            } );
        } ).catch( function () {} );
    }

    catalogue_send();

    chrome.storage.local.get( config.storage_key ).then( function ( stored ) {
        const settings = stored && stored[ config.storage_key ];
        if( !settings ) return;

        storage_remember( settings );
        page_ask( "settings", { settings }, config.settings_wait );

        if( document.readyState !== "loading" ) return;

        document.addEventListener( "DOMContentLoaded", function () {
            page_ask( "settings", { settings }, config.settings_wait );
        }, { once: true } );
    } ).catch( function () {} );

    chrome.storage.onChanged.addListener( function ( changes, area ) {
        if( area !== "local" || !changes[ config.storage_key ] ) return;
        settings_push( changes[ config.storage_key ].newValue || {} );
    } );

    window.addEventListener( "message", function ( event ) {
        if( event.source !== window ) return;

        const message = event.data;
        if( !message || message.extension !== config.marker ) return;
        if( !/_answer$/.test( message.variant || "" ) ) return;

        const resolve = page_answers.get( message.serial );
        if( resolve ) resolve( message );
    } );

    chrome.runtime.onMessage.addListener( function ( message, sender, respond ) {
        if( !message || typeof message.variant !== "string" ) return undefined;

        if( message.variant === "transfer" ) {
            if( !frame_is_editor() ) return undefined;

            page_ask( "transfer", { any: message.any }, config.transfer_wait )
                .then( function ( answer ) {
                    respond( { applied: Boolean( answer && answer.applied ) } );
                } );

            return true;
        }

        if( message.variant === "settings" ) {
            settings_push( message.settings || {} ).then( function ( answer ) {
                respond( { applied: Boolean( answer && answer.applied ) } );
            } );

            return true;
        }

        return undefined;
    } );
} )();
