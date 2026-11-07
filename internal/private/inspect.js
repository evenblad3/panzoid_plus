( function () {
    "use strict";

    const easings = [
        "none", "linear",
        "quadratic in", "quadratic out", "quadratic in-out",
        "cubic in", "cubic out", "cubic in-out",
        "quartic in", "quartic out", "quartic in-out",
        "quintic in", "quintic out", "quintic in-out",
        "sinusoidal in", "sinusoidal out", "sinusoidal in-out",
        "exponential in", "exponential out", "exponential in-out",
        "circular in", "circular out", "circular in-out",
        "elastic in", "elastic out", "elastic in-out",
        "back in", "back out", "back in-out",
        "bounce in", "bounce out", "bounce in-out",
        "cubic out-in"
    ];

    const property_types = [
        "number", "vector2", "vector3", "vector4", "color", "gradient",
        "option", "text", "asset", "list", "curve", "shader"
    ];

    const block = 512;
    const depth_limit = 10;

    const zone = document.getElementById( "drop_zone" );
    const picker = document.getElementById( "drop_file" );
    const summary = document.getElementById( "inspect_summary" );
    const tree = document.getElementById( "inspect_tree" );
    const save = document.getElementById( "inspect_save" );

    let decoded = null;

    function bytes_text( count ) {
        if( count < 1024 ) return count + " b";
        if( count < 1024 * 1024 ) return ( count / 1024 ).toFixed( 1 ) + " kb";
        return ( count / ( 1024 * 1024 ) ).toFixed( 1 ) + " mb";
    }

    function read_field( bytes, from, length ) {
        let out = "";

        for( let it = 0; it < length; it++ ) {
            const code = bytes[ from + it ];
            if( !code ) break;
            out += String.fromCharCode( code );
        }

        return out;
    }

    async function gunzip( bytes ) {
        const stream = new Blob( [ bytes ] ).stream()
            .pipeThrough( new DecompressionStream( "gzip" ) );
        return new Uint8Array( await new Response( stream ).arrayBuffer() );
    }

    function untar( bytes ) {
        const entries = [];
        let at = 0;

        while( at + block <= bytes.length ) {
            const name = read_field( bytes, at, 100 );
            if( !name ) break;

            const size = parseInt( read_field( bytes, at + 124, 12 ).trim(), 8 ) || 0;
            const kind = bytes[ at + 156 ] || 48;
            const prefix = read_field( bytes, at + 345, 155 );
            at += block;

            if( kind === 48 || kind === 0 ) {
                entries.push( {
                    name: ( prefix ? prefix + "/" : "" ) + name,
                    data: bytes.subarray( at, at + size )
                } );
            }

            at += Math.ceil( size / block ) * block;
        }

        return entries;
    }

    async function open_file( bytes, filename ) {
        if( bytes[ 0 ] === 0x1f && bytes[ 1 ] === 0x8b ) {
            return untar( await gunzip( bytes ) );
        }

        const head = String.fromCharCode( bytes[ 0 ] || 0 );
        if( head === "{" || head === "[" ) return [ { name: filename, data: bytes } ];

        return untar( bytes );
    }

    function parse_json( data ) {
        let text;
        try {
            text = new TextDecoder( "utf-8", { fatal: true } ).decode( data );
        } catch( error ) {
            return undefined;
        }

        const head = text.trim().charAt( 0 );
        if( head !== "{" && head !== "[" ) return text;

        try {
            return JSON.parse( text );
        } catch( error ) {
            return text;
        }
    }

    function is_property( value ) {
        return Boolean( value ) && typeof value === "object"
            && Array.isArray( value.keyframes );
    }

    function show_number( value ) {
        if( typeof value !== "number" ) return String( value );
        return Number.isInteger( value ) ? String( value ) : value.toFixed( 3 );
    }

    function show_value( value ) {
        if( value === null || value === undefined ) return "none";
        if( Array.isArray( value ) ) return value.map( show_number ).join( " " );
        if( typeof value === "boolean" ) return value ? "on" : "off";
        if( typeof value === "object" ) return "";
        return show_number( value );
    }

    function easing_of( key ) {
        const code = ( key.tween || 0 ) & 255;
        return easings[ code ] || ( "tween " + code );
    }

    function describe_property( property ) {
        const keys = property.keyframes;
        if( !keys.length ) return "nothing set";

        if( !property.animated || keys.length === 1 ) return show_value( keys[ 0 ].value );

        const first = keys[ 0 ];
        const last = keys[ keys.length - 1 ];
        const used = [];

        keys.forEach( function ( key ) {
            const name = easing_of( key );
            if( used.indexOf( name ) === -1 ) used.push( name );
        } );

        return keys.length + " keyframes, frame " + first.frame + " to " + last.frame
            + ", " + show_value( first.value ) + " to " + show_value( last.value )
            + ", " + used.join( " / " );
    }

    function name_of( entry ) {
        if( !entry || typeof entry !== "object" ) return "";

        if( typeof entry.name === "string" ) return entry.name;
        if( is_property( entry.name ) && entry.name.keyframes.length ) {
            return String( entry.name.keyframes[ 0 ].value );
        }
        if( typeof entry.baseType === "string" ) return entry.baseType;
        if( typeof entry.type === "number" && property_types[ entry.type ] ) {
            return property_types[ entry.type ];
        }

        return "";
    }

    function add_line( label, value, depth ) {
        const line = document.createElement( "div" );
        line.className = "node";
        line.style.paddingLeft = ( 9 + depth * 11 ) + "px";

        if( label ) {
            const shown = document.createElement( "span" );
            shown.className = "node_name";
            shown.textContent = label;
            line.appendChild( shown );
        }

        if( value ) {
            const shown = document.createElement( "span" );
            shown.className = "node_value";
            shown.textContent = value;
            line.appendChild( shown );
        }

        tree.appendChild( line );
        return line;
    }

    function flat( list ) {
        return list.every( function ( entry ) {
            return entry === null || typeof entry !== "object";
        } );
    }

    function walk( label, value, depth ) {
        if( depth > depth_limit ) return;

        if( is_property( value ) ) {
            add_line( label, describe_property( value ), depth );
            return;
        }

        if( Array.isArray( value ) ) {
            if( !value.length ) {
                add_line( label, "empty", depth );
                return;
            }
            if( flat( value ) ) {
                add_line( label, show_value( value ), depth );
                return;
            }

            add_line( label, value.length + " items", depth );
            value.forEach( function ( entry, index ) {
                walk( name_of( entry ) || String( index ), entry, depth + 1 );
            } );
            return;
        }

        if( value && typeof value === "object" ) {
            add_line( label, "", depth );
            Object.keys( value ).forEach( function ( key ) {
                walk( key, value[ key ], depth + 1 );
            } );
            return;
        }

        add_line( label, show_value( value ), depth );
    }

    function walk_contents( parsed, depth ) {
        if( Array.isArray( parsed ) ) {
            parsed.forEach( function ( entry, index ) {
                walk( name_of( entry ) || String( index ), entry, depth );
            } );
            return;
        }

        if( parsed && typeof parsed === "object" ) {
            Object.keys( parsed ).forEach( function ( key ) {
                walk( key, parsed[ key ], depth );
            } );
            return;
        }

        add_line( "", String( parsed ).slice( 0, 400 ), depth );
    }

    function show( file, entries ) {
        decoded = { file: file.name, bytes: file.size, entries: [] };

        if( !entries.length ) {
            summary.textContent = "nothing readable inside " + file.name;
            return;
        }

        let version = "";
        const meta = entries.find( function ( entry ) { return entry.name === "meta"; } );
        if( meta ) {
            const parsed = parse_json( meta.data );
            if( parsed && parsed.version !== undefined ) version = ", saved by " + parsed.version;
        }

        summary.textContent = file.name + ", " + bytes_text( file.size ) + ", "
            + entries.length + ( entries.length === 1 ? " part" : " parts" ) + version;

        entries.forEach( function ( entry ) {
            const line = add_line( entry.name, bytes_text( entry.data.length ), 0 );
            line.classList.add( "entry" );

            const parsed = parse_json( entry.data );
            if( parsed === undefined ) {
                decoded.entries.push( { name: entry.name, bytes: entry.data.length } );
                add_line( "", "binary, not settings", 1 );
                return;
            }

            decoded.entries.push( {
                name: entry.name, bytes: entry.data.length, contents: parsed
            } );
            walk_contents( parsed, 1 );
        } );

        save.hidden = false;
    }

    async function load( file ) {
        tree.textContent = "";
        save.hidden = true;
        decoded = null;
        summary.textContent = "reading " + file.name;

        let bytes;
        try {
            bytes = new Uint8Array( await file.arrayBuffer() );
        } catch( error ) {
            summary.textContent = "could not read that file";
            return;
        }

        let entries;
        try {
            entries = await open_file( bytes, file.name );
        } catch( error ) {
            summary.textContent = file.name + " is not something clipmaker wrote";
            return;
        }

        try {
            show( file, entries );
        } catch( error ) {
            summary.textContent = "could not make sense of " + file.name;
        }
    }

    function stop( event ) {
        event.preventDefault();
        event.stopPropagation();
    }

    [ "dragenter", "dragover" ].forEach( function ( kind ) {
        zone.addEventListener( kind, function ( event ) {
            stop( event );
            zone.classList.add( "drop_on" );
        } );
    } );

    [ "dragleave", "dragend" ].forEach( function ( kind ) {
        zone.addEventListener( kind, function ( event ) {
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

    [ "dragover", "drop" ].forEach( function ( kind ) {
        document.addEventListener( kind, function ( event ) { event.preventDefault(); } );
    } );

    save.addEventListener( "click", function () {
        if( !decoded ) return;

        const text = JSON.stringify( decoded, null, 4 );
        const url = URL.createObjectURL( new Blob( [ text ], { type: "application/json" } ) );

        const link = document.createElement( "a" );
        link.href = url;
        link.download = decoded.file.replace( /\.[^.]*$/, "" ) + ".decoded.json";
        link.click();

        setTimeout( function () { URL.revokeObjectURL( url ); }, 10000 );
    } );
} )();
