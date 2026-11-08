( function () {
    "use strict";

    const storage_key = "panzoid_plus.settings";
    const marker = "panzoid+";

    const waiting = new Map();
    let next_serial = 1;

    function remember( settings ) {
        try {
            localStorage.setItem( storage_key, JSON.stringify( settings ) );
        } catch( error ) {}
    }

    function ask_page( variant, payload, timeout ) {
        return new Promise( function ( resolve ) {
            const serial = next_serial++;

            const timer = setTimeout( function () {
                waiting.delete( serial );
                resolve( null );
            }, timeout );

            waiting.set( serial, function ( answer ) {
                clearTimeout( timer );
                waiting.delete( serial );
                resolve( answer );
            } );

            window.postMessage(
                Object.assign( { extension: marker, variant, serial }, payload ), "*" );
        } );
    }

    function push( settings ) {
        remember( settings );
        return ask_page( "settings", { settings }, 2000 );
    }

    function is_editor_frame() {
        return Boolean( document.querySelector( "canvas" )
            || document.querySelector( ".editorpanel" )
            || document.querySelector( "#panecontainer" ) );
    }

    function answer_delay() {
        if( is_editor_frame() ) return 0;
        return window.top === window? 400: 200;
    }

    function reply( respond, any ) {
        const wait = answer_delay();

        if( wait === 0 ) respond( any );
        else setTimeout( function () { respond( any ); }, wait );
    }

    function read( path ) {
        return fetch( chrome.runtime.getURL( path ) ).then( function ( answer ) {
            return answer.text();
        } );
    }

    function send_catalogue() {
        read( "blobs/effects.json" ).then( function ( text ) {
            const catalogue = JSON.parse( text );
            const names = catalogue.map( function ( effect ) { return effect.internal; } );

            const wanted = [ read( "blobs/library.effect" ) ].concat(
                names.map( function ( name ) { return read( "blobs/effects/" + name ); } ) );

            return Promise.all( wanted ).then( function ( texts ) {
                const sources = {};
                names.forEach( function ( name, it ) { sources[ name ] = texts[ it + 1 ]; } );

                window.postMessage( {
                    extension: marker, variant: "catalogue",
                    parts: { catalogue, library: texts[ 0 ], sources }
                }, "*" );
            } );
        } ).catch( function () {} );
    }

    send_catalogue();

    chrome.storage.local.get( storage_key ).then( function ( stored ) {
        const settings = stored && stored[ storage_key ];
        if( !settings ) return;

        remember( settings );
        ask_page( "settings", { settings }, 1000 );

        if( document.readyState === "loading" ) {
            document.addEventListener( "DOMContentLoaded", function () {
                ask_page( "settings", { settings }, 1000 );
            }, { once: true } );
        }
    } ).catch( function () {} );

    chrome.storage.onChanged.addListener( function ( changes, area ) {
        if( area !== "local" || !changes[ storage_key ] ) return;
        push( changes[ storage_key ].newValue || {} );
    } );

    window.addEventListener( "message", function ( event ) {
        if( event.source !== window ) return;

        const message = event.data;
        if( !message || message.extension !== marker ) return;
        if( !/_answer$/.test( message.variant || "" ) ) return;

        const resolve = waiting.get( message.serial );
        if( resolve ) resolve( message );
    } );

    chrome.runtime.onMessage.addListener( function ( message, sender, respond ) {
        if( !message || typeof message.variant !== "string" ) return undefined;

        if( message.variant === "status" ) {
            ask_page( "status", {}, 800 ).then( function ( answer ) {
                reply( respond, {
                    ok: true,
                    armed: Boolean( answer ),
                    editor: is_editor_frame(),
                    status: answer? answer.status: null,
                    url: location.href
                } );
            } );
            return true;
        }

        if( message.variant === "transfer" ) {
            if( !is_editor_frame() ) return undefined;

            ask_page( "transfer", { any: message.any }, 2500 ).then( function ( answer ) {
                if( !answer ) {
                    respond( { ok: false, error: "the page hook did not answer" } );
                    return;
                }

                respond( {
                    ok: true,
                    applied: Boolean( answer.applied ),
                    detail: answer.detail || null,
                    error: answer.error || null
                } );
            } );
            return true;
        }

        if( message.variant === "settings" ) {
            push( message.settings || {} ).then( function ( answer ) {
                respond( { ok: true, applied: answer? answer.applied: null } );
            } );
            return true;
        }

        return undefined;
    } );
} )();
