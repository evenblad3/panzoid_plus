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

    const variant_names = [
        "number", "vector2", "vector3", "vector4", "color", "gradient",
        "option", "text", "asset", "list", "curve", "shader"
    ];

    const part_names = {
        meta: "which Clipmaker wrote this",
        project: "the whole project",
        basics: "project basics, from an older save",
        objects: "the object tree, from an older save",
        scenes: "the scenes, from an older save",
        layers: "the layers, from an older save",
        fx: "the effects, from an older save",
        camsequence: "the camera track, from an older save",
        audio: "the audio track"
    };

    const part_prefixes = [
        { head: "font_", says: "a font the project uses" },
        { head: "audio_", says: "a sound the project uses" },
        { head: "image_", says: "an image the project uses" }
    ];

    const signatures = [
        { head: [ 0x89, 0x50, 0x4e, 0x47 ], suffix: "png" },
        { head: [ 0xff, 0xd8, 0xff ], suffix: "jpg" },
        { head: [ 0x49, 0x44, 0x33 ], suffix: "mp3" },
        { head: [ 0x4f, 0x67, 0x67, 0x53 ], suffix: "ogg" },
        { head: [ 0x52, 0x49, 0x46, 0x46 ], suffix: "wav" },
        { head: [ 0x00, 0x01, 0x00, 0x00 ], suffix: "ttf" },
        { head: [ 0x4f, 0x54, 0x54, 0x4f ], suffix: "otf" },
        { head: [ 0x77, 0x4f, 0x46, 0x46 ], suffix: "woff" }
    ];

    const block = 512;
    const depth_limit = 10;

    const zone = document.getElementById( "drop_zone" );
    const picker = document.getElementById( "drop_file" );
    const summary = document.getElementById( "inspect_summary" );
    const tree = document.getElementById( "inspect_tree" );

    function buffer_text( count ) {
        if( count < 1024 ) return count + " b";
        if( count < 1024 * 1024 ) return ( count / 1024 ).toFixed( 1 ) + " kb";

        return ( count / ( 1024 * 1024 ) ).toFixed( 1 ) + " mb";
    }

    function part_says( name ) {
        if( part_names[ name ] ) return part_names[ name ];

        const found = part_prefixes.filter( function ( entry ) {
            return name.indexOf( entry.head ) === 0;
        } );

        return found.length? found[ 0 ].says: "";
    }

    function suffix_of( buffer ) {
        const found = signatures.filter( function ( entry ) {
            return entry.head.every( function ( byte, it ) {
                return buffer[ it ] === byte;
            } );
        } );
        if( found.length ) return found[ 0 ].suffix;

        const head = String.fromCharCode( buffer[ 0 ] || 0 );
        return ( head === "{" || head === "[" )? "json": "bin";
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
            const folder = read_field( buffer, at + 345, 155 );
            at += block;

            if( flag === 48 || flag === 0 ) {
                parts.push( {
                    name: ( folder? folder + "/": "" ) + name,
                    buffer: buffer.subarray( at, at + size )
                } );
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
        if( head === "{" || head === "[" ) return [ { name: filename, buffer } ];

        return untar( buffer );
    }

    function parse_json( buffer ) {
        let text;

        try {
            text = new TextDecoder( "utf-8", { fatal: true } ).decode( buffer );
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

    function is_property( any ) {
        return Boolean( any ) && typeof any === "object" && Array.isArray( any.keyframes );
    }

    function show_number( any ) {
        if( typeof any !== "number" ) return String( any );
        return Number.isInteger( any )? String( any ): any.toFixed( 3 );
    }

    function show_value( any ) {
        if( any === null || any === undefined ) return "none";
        if( Array.isArray( any ) ) return any.map( show_number ).join( " " );
        if( typeof any === "boolean" ) return any? "on": "off";
        if( typeof any === "object" ) return "";

        return show_number( any );
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

    function name_of( any ) {
        if( !any || typeof any !== "object" ) return "";

        if( typeof any.name === "string" ) return any.name;
        if( is_property( any.name ) && any.name.keyframes.length ) {
            return String( any.name.keyframes[ 0 ].value );
        }
        if( typeof any.baseType === "string" ) return any.baseType;
        if( typeof any.type === "number" && variant_names[ any.type ] ) {
            return variant_names[ any.type ];
        }

        return "";
    }

    function add_line( label, any, depth ) {
        const line = document.createElement( "div" );
        line.className = "node";
        line.style.paddingLeft = ( 9 + depth * 11 ) + "px";

        if( label ) {
            const shown = document.createElement( "span" );
            shown.className = "node_name";
            shown.textContent = label;
            line.appendChild( shown );
        }

        if( any ) {
            const shown = document.createElement( "span" );
            shown.className = "node_value";
            shown.textContent = any;
            line.appendChild( shown );
        }

        tree.appendChild( line );
        return line;
    }

    function save_buffer( buffer, filename, variant ) {
        const url = URL.createObjectURL( new Blob( [ buffer ], { type: variant } ) );

        const link = document.createElement( "a" );
        link.href = url;
        link.download = filename;
        link.click();

        setTimeout( function () { URL.revokeObjectURL( url ); }, 10000 );
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

    function flat( list ) {
        return list.every( function ( any ) {
            return any === null || typeof any !== "object";
        } );
    }

    function walk( label, any, depth ) {
        if( depth > depth_limit ) return;

        if( is_property( any ) ) {
            add_line( label, describe_property( any ), depth );
            return;
        }

        if( Array.isArray( any ) ) {
            if( !any.length ) {
                add_line( label, "empty", depth );
                return;
            }
            if( flat( any ) ) {
                add_line( label, show_value( any ), depth );
                return;
            }

            add_line( label, any.length + " items", depth );
            any.forEach( function ( entry, it ) {
                walk( name_of( entry ) || String( it ), entry, depth + 1 );
            } );
            return;
        }

        if( any && typeof any === "object" ) {
            add_line( label, "", depth );
            Object.keys( any ).forEach( function ( key ) {
                walk( key, any[ key ], depth + 1 );
            } );
            return;
        }

        add_line( label, show_value( any ), depth );
    }

    function walk_contents( parsed, depth ) {
        if( Array.isArray( parsed ) ) {
            parsed.forEach( function ( entry, it ) {
                walk( name_of( entry ) || String( it ), entry, depth );
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

    function show_part( part, stem ) {
        const line = add_line( part.name, buffer_text( part.buffer.length ), 0 );
        line.classList.add( "entry" );

        const says = part_says( part.name );
        const suffix = suffix_of( part.buffer );

        add_save( line, "save", function () {
            save_buffer( part.buffer, stem + "." + part.name + "." + suffix,
                suffix === "json"? "application/json": "application/octet-stream" );
        } );

        if( says ) add_line( "", says, 1 );

        const parsed = parse_json( part.buffer );
        if( parsed === undefined ) {
            add_line( "", suffix + ", not settings", 1 );
            return null;
        }

        walk_contents( parsed, 1 );
        return parsed;
    }

    function show( file, parts ) {
        if( !parts.length ) {
            summary.textContent = "nothing readable inside " + file.name;
            return;
        }

        const stem = file.name.replace( /\.[^.]*$/, "" );
        let version = "";

        const meta = parts.filter( function ( part ) { return part.name === "meta"; } );
        if( meta.length ) {
            const parsed = parse_json( meta[ 0 ].buffer );
            if( parsed && parsed.version !== undefined ) version = ", saved by " + parsed.version;
        }

        summary.textContent = file.name + ", " + buffer_text( file.size ) + ", "
            + parts.length + ( parts.length === 1? " part": " parts" ) + version;

        const decoded = { file: file.name, buffer: file.size, parts: [] };

        parts.forEach( function ( part ) {
            const contents = show_part( part, stem );
            decoded.parts.push( {
                name: part.name, buffer: part.buffer.length, contents
            } );
        } );

        const line = add_line( "", "", 0 );
        line.classList.add( "entry" );
        add_save( line, "save every setting as json", function () {
            save_buffer( JSON.stringify( decoded, null, 4 ),
                stem + ".decoded.json", "application/json" );
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
