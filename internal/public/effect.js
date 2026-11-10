window.extension = window.extension || {};

extension.tabs = {
    blur: "Blur & Sharpen",
    color: "Color Correction",
    distort: "Distort",
    generate: "Generate",
    perspective: "Perspective",
    stylize: "Stylize"
};

extension.effects = [];

extension.effect = {
    banner: "/* effect is inlined and minified. */",
    precision: "precision highp float;",

    variants: {
        float: 0,
        float2: 1,
        float3: 2,
        float4: 3,
        float_pipette: 4
    },

    component_names: [ "x", "y", "z", "w" ],

    given: [
        { name: "tDiffuse", line: "uniform sampler2D tDiffuse;" },

        { name: "vUv", line: "varying vec2 vUv;" },
        { name: "uvScale", line: "uniform vec2 uvScale;" }
    ],

    library: "",
    sources: {},

    use( catalogue, library, sources ) {
        extension.effect.library = library;
        extension.effect.sources = sources;

        extension.effects.length = 0;
        catalogue.forEach( function ( effect ) {
            extension.effects.push( Object.assign( {}, effect, {
                tab: extension.tabs[ effect.tab ]
            } ) );
        } );
    },

    mentions( text, name ) {
        return new RegExp( "\\b" + name + "\\b" ).test( text );
    },

    split_statements( source ) {
        const found = [];
        let depth = 0;
        let start = 0;

        for( let it = 0; it < source.length; it++ ) {
            const letter = source[ it ];

            if( letter === "{" ) depth++;
            if( letter === "}" ) depth--;
            if( depth !== 0 ) continue;
            if( letter !== ";" && letter !== "}" ) continue;

            const piece = source.slice( start, it + 1 ).trim();
            if( piece ) found.push( piece );
            start = it + 1;
        }

        const tail = source.slice( start ).trim();
        if( tail ) found.push( tail );

        return found;
    },

    split_declarations( source ) {
        const found = [];
        let plain = [];

        source.split( "\n" ).forEach( function ( line ) {
            if( line.trim().indexOf( "#" ) !== 0 ) {
                plain.push( line );
                return;
            }

            found.push( ...extension.effect.split_statements( plain.join( "\n" ) ) );
            found.push( line.trim() );
            plain = [];
        } );

        found.push( ...extension.effect.split_statements( plain.join( "\n" ) ) );
        return found;
    },

    declared_name( piece ) {
        const defined = piece.match( /^#define\s+(\w+)/ );
        if( defined ) return defined[ 1 ];

        const named = piece.match( /^(?:const\s+)?\w+\s+(\w+)\s*[=(]/ );
        return named? named[ 1 ]: "";
    },

    read_macros( source ) {
        const found = [];

        source.split( "\n" ).forEach( function ( line ) {
            const named = line.match( /^#define\s+(\w+)\(([^)]*)\)\s*(.+)$/ );
            if( !named ) return;

            found.push( {
                name: named[ 1 ],
                takes: named[ 2 ].split( "," ).map( function ( one ) { return one.trim(); } ),
                body: named[ 3 ].trim()
            } );
        } );

        return found;
    },

    split_arguments( text ) {
        const found = [];
        let depth = 0;
        let start = 0;

        for( let it = 0; it < text.length; it++ ) {
            const letter = text[ it ];

            if( letter === "(" ) depth++;
            if( letter === ")" ) depth--;
            if( letter !== "," || depth !== 0 ) continue;

            found.push( text.slice( start, it ) );
            start = it + 1;
        }

        found.push( text.slice( start ) );
        return found.map( function ( one ) { return one.trim(); } );
    },

    expand_once( shader, macro ) {
        const opens = new RegExp( "\\b" + macro.name + "\\s*\\(" );
        let at = shader.search( opens );
        if( at < 0 ) return shader;

        const open = shader.indexOf( "(", at );
        let depth = 0;
        let close = open;

        for( ; close < shader.length; close++ ) {
            if( shader[ close ] === "(" ) depth++;
            if( shader[ close ] === ")" ) depth--;
            if( depth === 0 ) break;
        }

        const given = extension.effect.split_arguments( shader.slice( open + 1, close ) );

        let body = macro.body;
        macro.takes.forEach( function ( name, it ) {
            const passed = given[ it ] === undefined? "": given[ it ];
            const plain = /^[\w.]+$/.test( passed );

            body = body.replace( new RegExp( "\\b" + name + "\\b", "g" ),
                plain? passed: "( " + passed + " )" );
        } );

        return shader.slice( 0, at ) + body + shader.slice( close + 1 );
    },

    expand( shader, macros ) {
        for( let round = 0; round < 64; round++ ) {
            const before = shader;

            macros.forEach( function ( macro ) {
                for( let it = 0; it < 64; it++ ) {
                    const made = extension.effect.expand_once( shader, macro );
                    if( made === shader ) break;
                    shader = made;
                }
            } );

            if( shader === before ) return shader;
        }

        return shader;
    },

    keep_used( pieces, shader ) {
        let kept = pieces.slice();

        for( ; ; ) {
            const alive = kept.filter( function ( piece ) {
                if( !piece.name ) return true;

                const elsewhere = kept
                    .filter( function ( other ) { return other !== piece; } )
                    .map( function ( other ) { return other.text; } )
                    .join( "\n" );

                return extension.effect.mentions( shader, piece.name )
                    || extension.effect.mentions( elsewhere, piece.name );
            } );

            if( alive.length === kept.length ) return alive;
            kept = alive;
        }
    },

    loop_bounds( shader, controls ) {
        return ( controls || [] ).filter( function ( control ) {
            return !control.constant && control.far !== undefined
                && shader.indexOf( "c_" + control.name + "_max" ) !== -1;
        } ).map( function ( control ) {
            return "const int c_" + control.name + "_max = "
                + Math.round( control.far ) + ";";
        } );
    },

    squeeze_lines( lines ) {
        return lines.join( "\n" )
            .replace( /\s+/g, " " )
            .replace( /\s*([(){}\[\];,=<>!?:])\s*/g, "$1" )
            .replace( /([-+*\/])\s+/g, "$1" )
            .replace( /\s+([-+*\/])/g, "$1" )
            .trim();
    },

    squeeze( shader ) {
        return extension.effect.banner + extension.effect.squeeze_lines( shader.split( "\n" ) );
    },

    preprocess( effect ) {
        const shader = extension.effect.sources[ effect.internal ] || "";

        const lines = shader.split( "\n" );
        let head = 0;

        for( let it = 0; it < lines.length; it++ ) {
            if( /^(?:uniform|varying)\b/.test( lines[ it ].trim() ) ) head = it + 1;
        }

        const ours = lines.slice( 0, head ).join( "\n" ).trim();
        const macros = extension.effect.read_macros( extension.effect.library );
        const body = extension.effect.expand(
            lines.slice( head ).join( "\n" ).trim(), macros );

        const pieces = extension.effect.split_declarations( extension.effect.library )
            .filter( function ( text ) { return text.indexOf( "#" ) !== 0; } )
            .map( function ( text ) {
                return { name: extension.effect.declared_name( text ), text: text };
            } );

        const used = extension.effect.keep_used( pieces, body )
            .map( function ( piece ) { return piece.text; } );

        const seen = [ ours, body, used.join( "\n" ) ].join( "\n" );
        const site = extension.effect.given.filter( function ( entry ) {
            return extension.effect.mentions( seen, entry.name );
        } ).map( function ( entry ) { return entry.line; } );

        return extension.effect.squeeze( [
            extension.effect.precision,
            site.join( "\n" ),
            ours,
            used.join( "\n\n" ),
            extension.effect.loop_bounds( body, effect.controls ).join( "\n" ),
            body
        ].filter( Boolean ).join( "\n\n" ) );
    },

    build_entry( control, variant, dynamic ) {
        const entry = {
            type: { custom: true, type: variant },
            properties: { name: control.name }
        };

        if( dynamic ) entry.type.dynamic = true;
        if( control.near !== undefined ) entry.type.min = control.near;
        if( control.far !== undefined ) entry.type.max = control.far;

        return entry;
    },

    build_constant( control ) {
        const entry = extension.effect.build_entry( control, 0, false );

        entry.type.value = control.any;
        entry.value = control.any;

        return entry;
    },

    build_number( control ) {
        const entry = extension.effect.build_entry( control, 0, true );

        entry.keyframes = [ { value: control.any } ];
        return entry;
    },

    build_group( control, variant ) {
        const entry = extension.effect.build_entry( control, variant, true );
        const count = variant === ( 4 )? 3: variant + 1;

        if( control.near !== undefined || control.far !== undefined ) {
            entry.type.group = true;
            entry.type.objects = [];

            for( let it = 0; it < count; it++ ) {
                const component = {
                    dynamic: true,
                    name: extension.effect.component_names[ it ],
                    type: 0,
                    value: control.any[ it ]
                };

                if( control.near !== undefined ) {
                    component.min = extension.effect.get_limit( control.near, it );
                }
                if( control.far !== undefined ) {
                    component.max = extension.effect.get_limit( control.far, it );
                }

                entry.type.objects.push( component );
            }
        }

        entry.keyframes = [ { value: control.any.slice() } ];
        return entry;
    },

    build_control( control ) {
        const variant = extension.effect.variants[ control.variant ];

        if( control.constant ) return extension.effect.build_constant( control );
        if( variant === ( 0 ) ) return extension.effect.build_number( control );

        return extension.effect.build_group( control, variant );
    },

    build_any( effect ) {
        const any = {
            type: 1,
            properties: {
                name: effect.name,
                fragShader: extension.effect.preprocess( effect )
            }
        };

        if( effect.controls && effect.controls.length ) {
            any.customProperties = effect.controls.map( extension.effect.build_control );
        }

        return any;
    },

    build_clip( effect ) {
        return [ { data: [ extension.effect.build_any( effect ) ], baseType: "effect" } ];
    },

    build_json( effect ) {
        return JSON.stringify( extension.effect.build_clip( effect ) );
    },

    get_limit( limit, it ) {
        return Array.isArray( limit )? limit[ it ]: limit;
    },

    effect_by_serial( serial ) {
        return extension.effects.find( function ( effect ) {
            return effect.serial === serial;
        } );
    }
};
