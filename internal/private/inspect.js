( function () {
    "use strict";

    const signatures = [
        { head: [ 0x89, 0x50, 0x4e, 0x47 ], suffix: "png", kind: "image/png", says: "image" },
        { head: [ 0xff, 0xd8, 0xff ], suffix: "jpg", kind: "image/jpeg", says: "image" },
        { head: [ 0x47, 0x49, 0x46, 0x38 ], suffix: "gif", kind: "image/gif", says: "image" },
        { head: [ 0x49, 0x44, 0x33 ], suffix: "mp3", kind: "audio/mpeg", says: "sound" },
        { head: [ 0xff, 0xfb ], suffix: "mp3", kind: "audio/mpeg", says: "sound" },
        { head: [ 0x4f, 0x67, 0x67, 0x53 ], suffix: "ogg", kind: "audio/ogg", says: "sound" },
        { head: [ 0x66, 0x4c, 0x61, 0x43 ], suffix: "flac", kind: "audio/flac", says: "sound" },
        { head: [ 0x52, 0x49, 0x46, 0x46 ], suffix: "wav", kind: "audio/wav", says: "sound" },
        { head: [ 0x1a, 0x45, 0xdf, 0xa3 ], suffix: "webm", kind: "video/webm", says: "video" },
        { head: [ 0x00, 0x01, 0x00, 0x00 ], suffix: "ttf", kind: "font/ttf", says: "font" },
        { head: [ 0x4f, 0x54, 0x54, 0x4f ], suffix: "otf", kind: "font/otf", says: "font" },
        { head: [ 0x77, 0x4f, 0x46, 0x46 ], suffix: "woff", kind: "font/woff", says: "font" },
        { head: [ 0x77, 0x4f, 0x46, 0x32 ], suffix: "woff2", kind: "font/woff2", says: "font" },
        { head: [ 0x67, 0x6c, 0x54, 0x46 ], suffix: "glb", kind: "model/gltf-binary", says: "model" }
    ];

    const settings = { suffix: "json", kind: "application/json", says: "settings" };
    const unknown = { suffix: "bin", kind: "application/octet-stream", says: "file" };

    const block = 512;

    const zone = document.getElementById( "drop_zone" );
    const picker = document.getElementById( "drop_file" );
    const summary = document.getElementById( "inspect_summary" );
    const tree = document.getElementById( "inspect_tree" );

    function buffer_text( count ) {
        if( count < 1024 ) return count + " b";
        if( count < 1024 * 1024 ) return ( count / 1024 ).toFixed( 1 ) + " kb";

        return ( count / ( 1024 * 1024 ) ).toFixed( 1 ) + " mb";
    }

    function signature_of( buffer ) {
        const found = signatures.filter( function ( entry ) {
            return entry.head.every( function ( byte, it ) {
                return buffer[ it ] === byte;
            } );
        } );
        if( found.length ) return found[ 0 ];

        const brand = String.fromCharCode( buffer[ 4 ] || 0, buffer[ 5 ] || 0,
            buffer[ 6 ] || 0, buffer[ 7 ] || 0 );
        if( brand === "ftyp" ) return { suffix: "mp4", kind: "video/mp4", says: "video" };

        const head = String.fromCharCode( buffer[ 0 ] || 0 );
        if( head === "{" || head === "[" ) return settings;

        return unknown;
    }

    function read_field( buffer, from, length ) {
        let out = "";

        for( let it = 0; it < length; it++ ) {
            const code = buffer[ from + it ];
            if( !code ) break;
            out += String.fromCharCode( code );
        }

        return out;
    }

    async function gunzip( buffer ) {
        const stream = new Blob( [ buffer ] ).stream()
            .pipeThrough( new DecompressionStream( "gzip" ) );

        return new Uint8Array( await new Response( stream ).arrayBuffer() );
    }

    function untar( buffer ) {
        const parts = [];
        let at = 0;

        while( at + block <= buffer.length ) {
            const name = read_field( buffer, at, 100 );
            if( !name ) break;

            const size = parseInt( read_field( buffer, at + 124, 12 ).trim(), 8 ) || 0;
            const flag = buffer[ at + 156 ] || 48;
            at += block;

            if( flag === 48 || flag === 0 ) {
                parts.push( { name: name, buffer: buffer.subarray( at, at + size ) } );
            }

            at += Math.ceil( size / block ) * block;
        }

        return parts;
    }

    async function open_file( buffer, filename ) {
        if( buffer[ 0 ] === 0x1f && buffer[ 1 ] === 0x8b ) {
            return untar( await gunzip( buffer ) );
        }

        const head = String.fromCharCode( buffer[ 0 ] || 0 );
        if( head === "{" || head === "[" ) return [ { name: filename, buffer: buffer } ];

        return untar( buffer );
    }

    function read_names( parts ) {
        const found = {};

        const project = parts.filter( function ( part ) {
            return part.name === "project";
        } );
        if( !project.length ) return found;

        let parsed = null;
        try {
            parsed = JSON.parse( new TextDecoder().decode( project[ 0 ].buffer ) );
        } catch( error ) {
            return found;
        }

        const listed = parsed && parsed.assets;
        if( !listed || typeof listed !== "object" ) return found;

        Object.keys( listed ).forEach( function ( key ) {
            const asset = listed[ key ];
            if( asset && typeof asset === "object" && asset.filename ) {
                found[ key ] = asset.filename;
            }
        } );

        return found;
    }

    function save_buffer( buffer, filename, kind ) {
        const url = URL.createObjectURL( new Blob( [ buffer ], { type: kind } ) );

        const link = document.createElement( "a" );
        link.href = url;
        link.download = filename;
        link.click();

        setTimeout( function () { URL.revokeObjectURL( url ); }, 10000 );
    }

    function add_row( title, note ) {
        const line = document.createElement( "div" );
        line.className = "node entry";

        const name = document.createElement( "span" );
        name.className = "node_name";
        name.textContent = title;
        line.appendChild( name );

        const shown = document.createElement( "span" );
        shown.className = "node_value";
        shown.textContent = note;
        line.appendChild( shown );

        tree.appendChild( line );
        return line;
    }

    function add_save( line, label, make ) {
        const button = document.createElement( "button" );
        button.type = "button";
        button.className = "text_button save_button";
        button.textContent = label;

        button.addEventListener( "click", function ( event ) {
            event.stopPropagation();
            make();
        } );

        line.appendChild( button );
    }

    function list_parts( file, parts ) {
        const stem = file.name.replace( /\.[^.]*$/, "" );
        const names = read_names( parts );
        const counts = {};

        return parts.map( function ( part ) {
            const signature = signature_of( part.buffer );
            counts[ signature.says ] = ( counts[ signature.says ] || 0 ) + 1;

            const named = names[ part.name ]
                || ( ( part.name === "project" || part.name === "meta" )
                    ? part.name + "." + signature.suffix
                    : stem + " " + signature.says + " " + counts[ signature.says ]
                        + "." + signature.suffix );

            return { part: part, signature: signature, named: named, counts: counts };
        } );
    }

    function show( file, parts ) {
        if( !parts.length ) {
            summary.textContent = "nothing readable inside " + file.name;
            return;
        }

        const listed = list_parts( file, parts );
        const counts = listed[ listed.length - 1 ].counts;

        summary.textContent = file.name + ", " + buffer_text( file.size ) + ", "
            + Object.keys( counts ).sort().map( function ( says ) {
                return counts[ says ] + " " + says + ( counts[ says ] > 1? "s": "" );
            } ).join( ", " );

        listed.forEach( function ( entry ) {
            const line = add_row( entry.named, buffer_text( entry.part.buffer.length ) );

            add_save( line, "save", function () {
                save_buffer( entry.part.buffer, entry.named, entry.signature.kind );
            } );
        } );

        const all = add_row( "", listed.length + " in all" );

        add_save( all, "save every file", function () {
            listed.forEach( function ( entry, it ) {
                setTimeout( function () {
                    save_buffer( entry.part.buffer, entry.named, entry.signature.kind );
                }, it * 250 );
            } );
        } );
    }

    async function load( file ) {
        tree.textContent = "";
        summary.textContent = "reading " + file.name;

        let buffer;
        try {
            buffer = new Uint8Array( await file.arrayBuffer() );
        } catch( error ) {
            summary.textContent = "could not read that file";
            return;
        }

        let parts;
        try {
            parts = await open_file( buffer, file.name );
        } catch( error ) {
            summary.textContent = file.name + " is not something clipmaker wrote";
            return;
        }

        try {
            show( file, parts );
        } catch( error ) {
            summary.textContent = "could not make sense of " + file.name;
        }
    }

    function stop( event ) {
        event.preventDefault();
        event.stopPropagation();
    }

    [ "dragenter", "dragover" ].forEach( function ( variant ) {
        zone.addEventListener( variant, function ( event ) {
            stop( event );
            zone.classList.add( "drop_on" );
        } );
    } );

    [ "dragleave", "dragend" ].forEach( function ( variant ) {
        zone.addEventListener( variant, function ( event ) {
            stop( event );
            zone.classList.remove( "drop_on" );
        } );
    } );

    zone.addEventListener( "drop", function ( event ) {
        stop( event );
        zone.classList.remove( "drop_on" );

        const dropped = event.dataTransfer && event.dataTransfer.files;
        if( dropped && dropped.length ) load( dropped[ 0 ] );
    } );

    zone.addEventListener( "click", function () {
        picker.click();
    } );

    picker.addEventListener( "change", function () {
        if( picker.files && picker.files.length ) load( picker.files[ 0 ] );
    } );

    [ "dragover", "drop" ].forEach( function ( variant ) {
        document.addEventListener( variant, function ( event ) { event.preventDefault(); } );
    } );
} )();
