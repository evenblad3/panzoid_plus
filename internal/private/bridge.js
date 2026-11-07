( function() {
    "use strict";

    const site_key = "pz:site";
    const pending = new Map();
    let next_id = 1;

    function store( settings ) {
        try {
            localStorage.setItem( site_key, JSON.stringify( settings ) );
        } catch( error ) {}
    }

    function ask_page( kind, payload, timeout = 2000 ) {
        return new Promise( ( resolve ) => {
            const id = next_id++;
            const timer = setTimeout( () => {
                pending.delete( id );
                resolve( null );
            }, timeout );
            pending.set( id, ( data ) => {
                clearTimeout( timer );
                pending.delete( id );
                resolve( data );
            } );
            window.postMessage( Object.assign( { __pz_plus: true, kind, id }, payload ), "*" );
        } );
    }

    function push( settings ) {
        store( settings );
        return ask_page( "settings", { settings } );
    }

    chrome.storage.local.get( site_key ).then( ( stored ) => {
        const settings = stored && stored[ site_key ];
        if( !settings ) return;
        store( settings );
        ask_page( "settings", { settings }, 1000 );
        if( document.readyState === "loading" ) {
            document.addEventListener( "DOMContentLoaded",
                () => ask_page( "settings", { settings }, 1000 ), { once: true } );
        }
    } ).catch( () => { } );

    chrome.storage.onChanged.addListener( ( changes, area ) => {
        if( area !== "local" || !changes[ site_key ] ) return;
        push( changes[ site_key ].newValue || {} );
    } );

    window.addEventListener( "message", ( event ) => {
        if( event.source !== window ) return;
        const message = event.data;
        if( !message || message.__pz_plus !== true ) return;
        if( message.kind !== "insert_result" && message.kind !== "stats_result"
            && message.kind !== "settings_result" ) return;
        const resolve = pending.get( message.id );
        if( resolve ) resolve( message );
    } );

    function is_editor_frame() {
        return Boolean( document.querySelector( "canvas" )
            || document.querySelector( ".editorpanel" )
            || document.querySelector( "#panecontainer" ) );
    }

    function answer_delay() {
        if( is_editor_frame() ) return 0;
        return window.top === window ? 400 : 200;
    }

    function reply( respond, value ) {
        const wait = answer_delay();
        if( wait === 0 ) respond( value );
        else setTimeout( () => respond( value ), wait );
    }

    chrome.runtime.onMessage.addListener( ( message, sender, respond ) => {
        if( !message || typeof message.type !== "string" ) return undefined;

        if( message.type === "pz_ping" ) {
            ask_page( "stats", {}, 800 ).then( ( result ) => {
                reply( respond, {
                    ok: true,
                    injected: Boolean( result ),
                    editor: is_editor_frame(),
                    stats: result ? result.stats : null,
                    url: location.href,
                } );
            } );
            return true;
        }

        if( message.type === "pz_insert" ) {
            if( !is_editor_frame() ) return undefined;
            ask_page( "insert", { data: message.data }, 2500 ).then( ( result ) => {
                if( !result ) {
                    respond( { ok: false, error: "the page hook did not answer" } );
                    return;
                }
                respond( {
                    ok: true,
                    applied: Boolean( result.applied ),
                    enabled: Boolean( result.enabled ),
                    detail: result.detail || null,
                    error: result.error || null,
                } );
            } );
            return true;
        }

        if( message.type === "pz_settings" ) {
            push( message.settings || {} ).then( ( result ) => {
                respond( { ok: true, applied: result ? result.applied : null } );
            } );
            return true;
        }

        return undefined;
    } );
} )();
