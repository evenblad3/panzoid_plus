( function () {
    "use strict";

    const config = {
        base_name: "panzoid_plus_inspect",
        store_name: "opened",
        block: 512,
        save_gap: 250
    };

    const signatures = [
        { head: [ 0x49, 0x44, 0x33 ], suffix: "mp3", kind: "audio/mpeg" },
        { head: [ 0xff, 0xfb ], suffix: "mp3", kind: "audio/mpeg" },
        { head: [ 0x4f, 0x67, 0x67, 0x53 ], suffix: "ogg", kind: "audio/ogg" },
        { head: [ 0x52, 0x49, 0x46, 0x46 ], suffix: "wav", kind: "audio/wav" },
        { head: [ 0x1a, 0x45, 0xdf, 0xa3 ], suffix: "webm", kind: "video/webm" },
        { head: [ 0x89, 0x50, 0x4e, 0x47 ], suffix: "png", kind: "image/png" },
        { head: [ 0xff, 0xd8, 0xff ], suffix: "jpg", kind: "image/jpeg" },
        { head: [ 0x47, 0x49, 0x46, 0x38 ], suffix: "gif", kind: "image/gif" },
        { head: [ 0x00, 0x01, 0x00, 0x00 ], suffix: "ttf", kind: "font/ttf" },
        { head: [ 0x4f, 0x54, 0x54, 0x4f ], suffix: "otf", kind: "font/otf" },
        { head: [ 0x77, 0x4f, 0x46, 0x46 ], suffix: "woff", kind: "font/woff" },
        { head: [ 0x77, 0x4f, 0x46, 0x32 ], suffix: "woff2", kind: "font/woff2" }
    ];

    const zone = document.getElementById( "drop_zone" );
    const picker = document.getElementById( "drop_file" );
    const summary = document.getElementById( "inspect_summary" );
    const tree = document.getElementById( "inspect_tree" );
    const clear = document.getElementById( "inspect_clear" );

    const empty_text = summary.textContent;

    function size_text( count ) {
        if( count < 1024 ) return count + " b";
        if( count < 1024 * 1024 ) return ( count / 1024 ).toFixed( 1 ) + " kb";

        return ( count / ( 1024 * 1024 ) ).toFixed( 1 ) + " mb";
    }

    function signature_of( buffer ) {
        for( const entry of signatures ) {
            const same = entry.head.every( function ( byte, it ) {
                return buffer[ it ] === byte;
            } );

            if( same ) return entry;
        }

        const brand = String.fromCharCode( buffer[ 4 ] || 0, buffer[ 5 ] || 0,
            buffer[ 6 ] || 0, buffer[ 7 ] || 0 );
        if( brand === "ftyp" ) return { suffix: "mp4", kind: "video/mp4" };

        return null;
    }

    function field_read( buffer, from, length ) {
        let out = "";

        for( let it = 0; it < length; it++ ) {
            const code = buffer[ from + it ];
            if( !code ) break;
            out += String.fromCharCode( code );
        }

        return out;
    }

    async function gzip_read( buffer ) {
        const stream = new Blob( [ buffer ] ).stream()
            .pipeThrough( new DecompressionStream( "gzip" ) );

        return new Uint8Array( await new Response( stream ).arrayBuffer() );
    }

    function tar_read( buffer ) {
        const parts = [];
        let at = 0;

        while( at + config.block <= buffer.length ) {
            const name = field_read( buffer, at, 100 );
            if( !name ) break;

            const size = parseInt( field_read( buffer, at + 124, 12 ).trim(), 8 ) || 0;
            const flag = buffer[ at + 156 ] || 48;
            at += config.block;

            if( flag === 48 || flag === 0 ) {
                parts.push( { name: name, buffer: buffer.subarray( at, at + size ) } );
            }

            at += Math.ceil( size / config.block ) * config.block;
        }

        return parts;
    }

    async function archive_open( buffer ) {
        if( buffer[ 0 ] === 0x1f && buffer[ 1 ] === 0x8b ) {
            return tar_read( await gzip_read( buffer ) );
        }

        return tar_read( buffer );
    }

    function project_assets( parts ) {
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
            if( asset && typeof asset === "object" ) found[ key ] = asset;
        } );

        return found;
    }

    function obj_from_model( model ) {
        const points = model.vertices || [];
        const faces = model.faces || [];
        const flat_uv = ( model.uvs && model.uvs[ 0 ] ) || [];

        const lines = [ "# rebuilt by panzoid+" ];

        for( let it = 0; it + 2 < points.length; it += 3 ) {
            lines.push( "v " + points[ it ] + " " + points[ it + 1 ] + " " + points[ it + 2 ] );
        }

        for( let it = 0; it + 1 < flat_uv.length; it += 2 ) {
            lines.push( "vt " + flat_uv[ it ] + " " + flat_uv[ it + 1 ] );
        }

        let at = 0;

        while( at < faces.length ) {
            const kind = faces[ at++ ];
            const corners = ( kind & 1 )? 4: 3;

            const index = [];
            for( let one = 0; one < corners; one++ ) index.push( faces[ at++ ] );

            if( kind & 2 ) at++;
            if( kind & 4 ) at++;

            let uv_index = null;
            if( kind & 8 ) {
                uv_index = [];
                for( let one = 0; one < corners; one++ ) uv_index.push( faces[ at++ ] );
            }

            if( kind & 16 ) at++;
            if( kind & 32 ) at += corners;
            if( kind & 64 ) at++;
            if( kind & 128 ) at += corners;

            lines.push( "f " + index.map( function ( one, where ) {
                if( !uv_index ) return String( one + 1 );
                return ( one + 1 ) + "/" + ( uv_index[ where ] + 1 );
            } ).join( " " ) );
        }

        return lines.join( "\n" ) + "\n";
    }

    function model_of( buffer ) {
        const head = String.fromCharCode( buffer[ 0 ] || 0 );
        if( head !== "{" ) return null;

        let parsed = null;
        try {
            parsed = JSON.parse( new TextDecoder().decode( buffer ) );
        } catch( error ) {
            return null;
        }

        if( !parsed || !Array.isArray( parsed.vertices ) || !Array.isArray( parsed.faces ) ) {
            return null;
        }

        return parsed;
    }

    function file_save( buffer, filename, kind ) {
        const url = URL.createObjectURL( new Blob( [ buffer ], { type: kind } ) );

        const link = document.createElement( "a" );
        link.href = url;
        link.download = filename;
        link.click();

        setTimeout( function () { URL.revokeObjectURL( url ); }, 10000 );
    }

    function store_open() {
        return new Promise( function ( resolve ) {
            let ask = null;

            try {
                ask = indexedDB.open( config.base_name, 1 );
            } catch( error ) {
                resolve( null );
                return;
            }

            ask.onupgradeneeded = function () {
                ask.result.createObjectStore( config.store_name );
            };
            ask.onsuccess = function () { resolve( ask.result ); };
            ask.onerror = function () { resolve( null ); };
        } );
    }

    async function store_keep( name, bytes ) {
        const base = await store_open();
        if( !base ) return;

        try {
            base.transaction( config.store_name, "readwrite" )
                .objectStore( config.store_name )
                .put( { name: name, bytes: bytes }, "last" );
        } catch( error ) {}
    }

    async function store_recall() {
        const base = await store_open();
        if( !base ) return null;

        return new Promise( function ( resolve ) {
            try {
                const ask = base.transaction( config.store_name, "readonly" )
                    .objectStore( config.store_name ).get( "last" );

                ask.onsuccess = function () { resolve( ask.result || null ); };
                ask.onerror = function () { resolve( null ); };
            } catch( error ) {
                resolve( null );
            }
        } );
    }

    async function store_forget() {
        const base = await store_open();
        if( !base ) return;

        try {
            base.transaction( config.store_name, "readwrite" )
                .objectStore( config.store_name ).delete( "last" );
        } catch( error ) {}
    }

    function row_add( title, note ) {
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

    function save_add( line, label, make ) {
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

    function media_list( stem, parts ) {
        const assets = project_assets( parts );
        const counts = {};
        const found = [];

        for( const part of parts ) {
            if( part.name === "project" || part.name === "meta" ) continue;

            const asset = assets[ part.name ];
            const model = model_of( part.buffer );

            if( model ) {
                const body = new TextEncoder().encode( obj_from_model( model ) );
                counts.obj = ( counts.obj || 0 ) + 1;

                found.push( {
                    named: ( asset && asset.filename?
                        asset.filename.replace( /\.[^.]*$/, "" ):
                        stem + " model " + counts.obj ) + ".obj",
                    buffer: body,
                    kind: "model/obj"
                } );
                continue;
            }

            const signature = signature_of( part.buffer );
            if( !signature ) continue;

            counts[ signature.suffix ] = ( counts[ signature.suffix ] || 0 ) + 1;

            found.push( {
                named: ( asset && asset.filename )
                    || stem + " " + signature.suffix + " " + counts[ signature.suffix ]
                        + "." + signature.suffix,
                buffer: part.buffer,
                kind: signature.kind
            } );
        }

        return found;
    }

    function rows_show( name, size, parts ) {
        tree.textContent = "";

        const listed = media_list( name.replace( /\.[^.]*$/, "" ), parts );

        if( !listed.length ) {
            summary.textContent = name + " holds no media that can be pulled out";
            clear.hidden = false;
            return;
        }

        summary.textContent = name + ", " + size_text( size );
        clear.hidden = false;

        for( const entry of listed ) {
            const line = row_add( entry.named, size_text( entry.buffer.length ) );

            save_add( line, "save", function () {
                file_save( entry.buffer, entry.named, entry.kind );
            } );
        }

        const all = row_add( "", listed.length + " in all" );

        save_add( all, "save every file", function () {
            listed.forEach( function ( entry, it ) {
                setTimeout( function () {
                    file_save( entry.buffer, entry.named, entry.kind );
                }, it * config.save_gap );
            } );
        } );
    }

    async function bytes_open( name, bytes, keep ) {
        tree.textContent = "";
        summary.textContent = "reading " + name;

        let parts;
        try {
            parts = await archive_open( bytes );
        } catch( error ) {
            summary.textContent = name + " is not something clipmaker wrote";
            clear.hidden = false;
            return;
        }

        if( !parts.length ) {
            summary.textContent = "nothing readable inside " + name;
            clear.hidden = false;
            return;
        }

        try {
            rows_show( name, bytes.length, parts );
        } catch( error ) {
            summary.textContent = "could not make sense of " + name;
            clear.hidden = false;
            return;
        }

        if( keep ) store_keep( name, bytes );
    }

    async function file_open( file ) {
        let bytes;

        try {
            bytes = new Uint8Array( await file.arrayBuffer() );
        } catch( error ) {
            summary.textContent = "could not read that file";
            return;
        }

        bytes_open( file.name, bytes, true );
    }

    function drag_stop( event ) {
        event.preventDefault();
        event.stopPropagation();
    }

    [ "dragenter", "dragover" ].forEach( function ( variant ) {
        zone.addEventListener( variant, function ( event ) {
            drag_stop( event );
            zone.classList.add( "drop_on" );
        } );
    } );

    [ "dragleave", "dragend" ].forEach( function ( variant ) {
        zone.addEventListener( variant, function ( event ) {
            drag_stop( event );
            zone.classList.remove( "drop_on" );
        } );
    } );

    zone.addEventListener( "drop", function ( event ) {
        drag_stop( event );
        zone.classList.remove( "drop_on" );

        const dropped = event.dataTransfer && event.dataTransfer.files;
        if( dropped && dropped.length ) file_open( dropped[ 0 ] );
    } );

    zone.addEventListener( "click", function () {
        picker.click();
    } );

    picker.addEventListener( "change", function () {
        if( picker.files && picker.files.length ) file_open( picker.files[ 0 ] );
    } );

    clear.addEventListener( "click", function () {
        tree.textContent = "";
        summary.textContent = empty_text;
        clear.hidden = true;

        store_forget();
    } );

    [ "dragover", "drop" ].forEach( function ( variant ) {
        document.addEventListener( variant, function ( event ) { event.preventDefault(); } );
    } );

    store_recall().then( function ( held ) {
        if( held && held.bytes ) bytes_open( held.name, held.bytes, false );
    } );
} )();
