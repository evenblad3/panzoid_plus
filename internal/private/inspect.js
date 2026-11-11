( function () {
    "use strict";

    const config = {
        base_name: "panzoid_plus_inspect",
        store_name: "opened",
        block: 512,
        magic_at: 257,
        name_length: 100,
        size_at: 124,
        size_length: 12,
        flag_at: 156
    };

    const signatures = [
        { head: [ 0x49, 0x44, 0x33 ], suffix: "mp3", variant: "audio/mpeg" },
        { head: [ 0x4f, 0x67, 0x67, 0x53 ], suffix: "ogg", variant: "audio/ogg" },
        { head: [ 0x66, 0x4c, 0x61, 0x43 ], suffix: "flac", variant: "audio/flac" },
        { head: [ 0x1a, 0x45, 0xdf, 0xa3 ], suffix: "webm", variant: "video/webm" },
        { head: [ 0x89, 0x50, 0x4e, 0x47 ], suffix: "png", variant: "image/png" },
        { head: [ 0xff, 0xd8, 0xff ], suffix: "jpg", variant: "image/jpeg" },
        { head: [ 0x47, 0x49, 0x46, 0x38 ], suffix: "gif", variant: "image/gif" },
        { head: [ 0x42, 0x4d ], suffix: "bmp", variant: "image/bmp" },
        { head: [ 0x00, 0x01, 0x00, 0x00 ], suffix: "ttf", variant: "font/ttf" },
        { head: [ 0x4f, 0x54, 0x54, 0x4f ], suffix: "otf", variant: "font/otf" },
        { head: [ 0x77, 0x4f, 0x46, 0x46 ], suffix: "woff", variant: "font/woff" },
        { head: [ 0x77, 0x4f, 0x46, 0x32 ], suffix: "woff2", variant: "font/woff2" }
    ];

    const riff_variants = {
        WEBP: { suffix: "webp", variant: "image/webp" },
        WAVE: { suffix: "wav", variant: "audio/wav" },
        "AVI ": { suffix: "avi", variant: "video/x-msvideo" }
    };

    const zone = document.getElementById( "drop_zone" );
    const picker = document.getElementById( "drop_file" );
    const summary = document.getElementById( "inspect_summary" );
    const tree = document.getElementById( "inspect_tree" );
    const clear = document.getElementById( "inspect_clear" );

    const empty_text = summary.textContent;

    let reading = 0;

    function size_text( count ) {
        if( count < 1024 ) return count + " b";
        if( count < 1024 * 1024 ) return ( count / 1024 ).toFixed( 1 ) + " kb";

        return ( count / ( 1024 * 1024 ) ).toFixed( 1 ) + " mb";
    }

    function four_at( buffer, from ) {
        return String.fromCharCode( buffer[ from ] || 0, buffer[ from + 1 ] || 0,
            buffer[ from + 2 ] || 0, buffer[ from + 3 ] || 0 );
    }

    function signature_of( buffer ) {
        if( four_at( buffer, 0 ) === "RIFF" ) {
            return riff_variants[ four_at( buffer, 8 ) ] || null;
        }
        if( four_at( buffer, 4 ) === "ftyp" ) return { suffix: "mp4", variant: "video/mp4" };

        for( const entry of signatures ) {
            const same = entry.head.every( function ( byte, it ) {
                return buffer[ it ] === byte;
            } );

            if( same ) return entry;
        }

        if( buffer[ 0 ] === 0xff && ( buffer[ 1 ] & 0xe0 ) === 0xe0 ) {
            return { suffix: "mp3", variant: "audio/mpeg" };
        }

        return null;
    }

    function name_safe( wanted, suffix ) {
        const bare = String( wanted ).split( /[\\/]/ ).pop()
            .replace( /[\x00-\x1f<>:"|?*]/g, "" ).trim();

        if( !bare || bare === "." || bare === ".." ) return "asset." + suffix;
        if( bare.toLowerCase().endsWith( "." + suffix ) ) return bare;

        return bare.replace( /\.[^.]*$/, "" ) + "." + suffix;
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
        let cut = false;

        if( four_at( buffer, config.magic_at ) !== "usta" ) {
            return { parts: parts, cut: false, tar: false };
        }

        while( at + config.block <= buffer.length ) {
            const name = field_read( buffer, at, config.name_length );
            if( !name ) break;

            const field = field_read( buffer, at + config.size_at, config.size_length ).trim();
            const size = parseInt( field, 8 );
            const flag = buffer[ at + config.flag_at ];

            at += config.block;

            if( !isFinite( size ) || size < 0 || at + size > buffer.length ) {
                cut = true;
                break;
            }

            if( flag === 48 || flag === 0 ) {
                parts.push( { name: name, buffer: buffer.subarray( at, at + size ) } );
            }

            at += Math.ceil( size / config.block ) * config.block;
        }

        return { parts: parts, cut: cut, tar: true };
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
        const normals = model.normals || [];

        const layers = Math.max( ( model.uvs || [] ).length, 1 );
        const lines = [ "# rebuilt by panzoid+" ];

        for( let it = 0; it + 2 < points.length; it += 3 ) {
            lines.push( "v " + points[ it ] + " " + points[ it + 1 ] + " " + points[ it + 2 ] );
        }

        for( let it = 0; it + 1 < flat_uv.length; it += 2 ) {
            lines.push( "vt " + flat_uv[ it ] + " " + flat_uv[ it + 1 ] );
        }

        for( let it = 0; it + 2 < normals.length; it += 3 ) {
            lines.push( "vn " + normals[ it ] + " " + normals[ it + 1 ]
                + " " + normals[ it + 2 ] );
        }

        let at = 0;

        while( at < faces.length ) {
            const variant = faces[ at++ ];
            const corners = ( variant & 1 )? 4: 3;

            const index = [];
            for( let one = 0; one < corners; one++ ) index.push( faces[ at++ ] );

            if( variant & 2 ) at++;
            if( variant & 4 ) at += layers;

            let uv_index = null;
            if( variant & 8 ) {
                uv_index = [];

                for( let layer = 0; layer < layers; layer++ ) {
                    for( let one = 0; one < corners; one++ ) {
                        const got = faces[ at++ ];
                        if( layer === 0 ) uv_index.push( got );
                    }
                }
            }

            if( variant & 16 ) at++;

            let normal_index = null;
            if( variant & 32 ) {
                normal_index = [];
                for( let one = 0; one < corners; one++ ) normal_index.push( faces[ at++ ] );
            }

            if( variant & 64 ) at++;
            if( variant & 128 ) at += corners;

            if( !flat_uv.length ) uv_index = null;
            if( !normals.length ) normal_index = null;

            lines.push( "f " + index.map( function ( one, where ) {
                const uv = uv_index? String( uv_index[ where ] + 1 ): "";
                const normal = normal_index? String( normal_index[ where ] + 1 ): "";

                if( !uv && !normal ) return String( one + 1 );
                return ( one + 1 ) + "/" + uv + ( normal? "/" + normal: "" );
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

    function file_save( buffer, filename, variant ) {
        const url = URL.createObjectURL( new Blob( [ buffer ], { type: variant } ) );

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
                const base = ask.result;

                if( !base.objectStoreNames.contains( config.store_name ) ) {
                    base.createObjectStore( config.store_name );
                }
            };

            ask.onsuccess = function () { resolve( ask.result ); };
            ask.onerror = function () { resolve( null ); };
            ask.onblocked = function () { resolve( null ); };
        } );
    }

    function store_write( run ) {
        return store_open().then( function ( base ) {
            if( !base ) return false;

            return new Promise( function ( resolve ) {
                let deal = null;

                try {
                    deal = base.transaction( config.store_name, "readwrite" );
                } catch( error ) {
                    base.close();
                    resolve( false );
                    return;
                }

                deal.oncomplete = function () { base.close(); resolve( true ); };
                deal.onerror = function () { base.close(); resolve( false ); };
                deal.onabort = function () { base.close(); resolve( false ); };

                try {
                    run( deal.objectStore( config.store_name ) );
                } catch( error ) {}
            } );
        } );
    }

    function store_keep( name, bytes ) {
        return store_write( function ( shop ) {
            shop.put( { name: name, bytes: bytes }, "last" );
        } );
    }

    function store_forget() {
        return store_write( function ( shop ) {
            shop.delete( "last" );
        } );
    }

    function store_recall() {
        return store_open().then( function ( base ) {
            if( !base ) return null;

            return new Promise( function ( resolve ) {
                let ask = null;

                try {
                    ask = base.transaction( config.store_name, "readonly" )
                        .objectStore( config.store_name ).get( "last" );
                } catch( error ) {
                    base.close();
                    resolve( null );
                    return;
                }

                ask.onsuccess = function () { base.close(); resolve( ask.result || null ); };
                ask.onerror = function () { base.close(); resolve( null ); };
            } );
        } );
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
            const wanted = asset && asset.filename;
            const model = model_of( part.buffer );

            if( model ) {
                counts.obj = ( counts.obj || 0 ) + 1;

                found.push( {
                    named: name_safe( wanted || stem + " model " + counts.obj, "obj" ),
                    buffer: new TextEncoder().encode( obj_from_model( model ) ),
                    variant: "model/obj"
                } );
                continue;
            }

            const signature = signature_of( part.buffer );
            const suffix = signature? signature.suffix: "bin";

            counts[ suffix ] = ( counts[ suffix ] || 0 ) + 1;

            found.push( {
                named: name_safe( wanted || stem + " " + suffix + " " + counts[ suffix ],
                    suffix ),
                buffer: part.buffer,
                variant: signature? signature.variant: "application/octet-stream",
                unknown: !signature
            } );
        }

        return found;
    }

    function rows_show( name, size, parts, cut ) {
        tree.textContent = "";

        const listed = media_list( name.replace( /\.[^.]*$/, "" ), parts );
        const strange = listed.filter( function ( entry ) { return entry.unknown; } ).length;

        clear.hidden = false;

        if( !listed.length ) {
            summary.textContent = name + " holds no media that can be pulled out";
            return;
        }

        summary.textContent = name + ", " + size_text( size )
            + ( cut? ", cut short": "" )
            + ( strange? ", " + strange + " not recognised": "" );

        for( const entry of listed ) {
            const line = row_add( entry.named, size_text( entry.buffer.length ) );

            save_add( line, "save", function () {
                file_save( entry.buffer, entry.named, entry.variant );
            } );
        }

        const all = row_add( "", listed.length + " in all" );

        save_add( all, "save every file", function () {
            for( const entry of listed ) file_save( entry.buffer, entry.named, entry.variant );
        } );
    }

    async function bytes_open( name, bytes, keep ) {
        const mine = ++reading;

        tree.textContent = "";
        summary.textContent = "reading " + name;

        let read;
        try {
            read = await archive_open( bytes );
        } catch( error ) {
            if( mine !== reading ) return;

            summary.textContent = name + " is not something clipmaker wrote";
            clear.hidden = false;
            return;
        }

        if( mine !== reading ) return;

        if( !read.tar ) {
            summary.textContent = name + " is not a .pz, there is no tar inside it";
            clear.hidden = false;
            return;
        }

        if( !read.parts.length ) {
            summary.textContent = "nothing readable inside " + name;
            clear.hidden = false;
            return;
        }

        try {
            rows_show( name, bytes.length, read.parts, read.cut );
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
        const chosen = picker.files && picker.files.length? picker.files[ 0 ]: null;

        picker.value = "";
        if( chosen ) file_open( chosen );
    } );

    clear.addEventListener( "click", function () {
        reading++;

        tree.textContent = "";
        summary.textContent = empty_text;
        clear.hidden = true;
        picker.value = "";

        store_forget();
    } );

    [ "dragover", "drop" ].forEach( function ( variant ) {
        document.addEventListener( variant, function ( event ) { event.preventDefault(); } );
    } );

    let restored = false;

    function restore_try() {
        if( restored ) return;
        restored = true;

        store_recall().then( function ( held ) {
            if( held && held.bytes && !reading ) bytes_open( held.name, held.bytes, false );
        } );
    }

    document.addEventListener( "DOMContentLoaded", function () {
        const pane = document.getElementById( "pane_inspect" );
        const tab = document.getElementById( "tab_inspect" );

        if( tab ) tab.addEventListener( "click", restore_try );
        if( pane && !pane.classList.contains( "pane_off" ) ) restore_try();
    } );
} )();
