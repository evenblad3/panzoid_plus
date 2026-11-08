
( function() {
    "use strict";

    if( window.__plus_armed ) return;
    window.__plus_armed = true;

    const defaults = {
        fix_text_uv: true,
        anisotropy: true,
        better_shadows: true,
        mount_effects: true,
        sharp_preview: false,
        precise_values: false
    };

    const marker = "panzoid+";

    const anisotropy_level = 8;
    const decimals_shown = 3;
    const shadow_factor = 4;
    const shadow_bias = -0.016;
    const preview_scale_limit = 8;
    const flat_enough = 0.5;
    const epsilon = 1e-12;

    let settings = defaults;
    try {
        const raw = localStorage.getItem( "panzoid_plus.settings" );
        if( raw ) settings = Object.assign( {}, defaults, JSON.parse( raw ) );
    } catch( error ) {}

    const status = {
        contexts: 0,
        samples: 0,
        three: "not found",
        patched: 0,
        geometries_fixed: 0,
        shadows_scaled: 0,
        shadow_size: 0,
        anisotropic: 0,
        mounted: 0,
        preview: "",
        last_transfer: "",
    };

    let max_texture_size = 0;

    function describe( node ) {
        if( node === window ) return "window";
        if( node === document ) return "document";
        if( !node ) return "null";
        if( !node.tagName ) {
            return String( ( node.constructor && node.constructor.name ) || node );
        }
        return node.tagName.toLowerCase()
            + ( node.id ? "#" + node.id : "" )
            + ( node.className && typeof node.className === "string"
                ? "." + node.className.trim().split( /\s+/ ).slice( 0, 2 ).join( "." ) : "" );
    }

    function renderer_params( parameters ) {
        const given = parameters[ 0 ] && typeof parameters[ 0 ] === "object"
            ? parameters[ 0 ] : {};

        if( given.context ) return parameters;

        parameters[ 0 ] = Object.assign( {}, given, {
            antialias: true,
            powerPreference: "high-performance",
        } );
        return parameters;
    }

    function note_renderer( renderer ) {
        try {
            const context = renderer.context
                || ( typeof renderer.getContext === "function" ? renderer.getContext() : null );
            if( !context ) return;

            status.contexts++;

            const attributes = context.getContextAttributes();
            status.samples = attributes && attributes.antialias
                ? ( context.getParameter( context.SAMPLES ) || 0 ) : 0;
            max_texture_size = Math.max( max_texture_size,
                context.getParameter( context.MAX_TEXTURE_SIZE ) || 0 );
        } catch( error ) {}

        return renderer;
    }

    function fix_geometry_uv( geometry ) {
        if( !geometry || geometry.__plus_uv_fixed ) return;

        const position = geometry.attributes && geometry.attributes.position;
        const uv = geometry.attributes && geometry.attributes.uv;
        if( !position || !uv ) return;
        if( position.count !== uv.count || position.count % 3 !== 0 ) return;

        const points = position.array;
        const coordinates = uv.array;
        let touched = 0;

        for( let it = 0; it < position.count; it += 3 ) {
            const first = it * 3;
            const second = first + 3;
            const third = first + 6;

            const edge_a_x = points[ second ] - points[ first ];
            const edge_a_y = points[ second + 1 ] - points[ first + 1 ];
            const edge_a_z = points[ second + 2 ] - points[ first + 2 ];

            const edge_b_x = points[ third ] - points[ first ];
            const edge_b_y = points[ third + 1 ] - points[ first + 1 ];
            const edge_b_z = points[ third + 2 ] - points[ first + 2 ];

            const normal_x = edge_a_y * edge_b_z - edge_a_z * edge_b_y;
            const normal_y = edge_a_z * edge_b_x - edge_a_x * edge_b_z;
            const normal_z = edge_a_x * edge_b_y - edge_a_y * edge_b_x;

            const length = Math.hypot( normal_x, normal_y, normal_z );
            if( length < epsilon ) continue;
            if( Math.abs( normal_z / length ) > flat_enough ) continue;

            const span_x = Math.max( Math.abs( edge_a_x ), Math.abs( edge_b_x ) );
            const span_y = Math.max( Math.abs( edge_a_y ), Math.abs( edge_b_y ) );
            const along_x = span_x >= span_y;

            for( let corner = 0; corner < 3; corner++ ) {
                const at = first + corner * 3;
                coordinates[ ( it + corner ) * 2 ] = along_x ? points[ at ] : points[ at + 1 ];
            }
            touched++;
        }

        geometry.__plus_uv_fixed = true;
        if( !touched ) return;
        uv.needsUpdate = true;
        status.geometries_fixed++;
    }

    function fix_legacy_geometry_uv( geometry ) {
        if( !geometry || geometry.__plus_uv_fixed ) return;

        const vertices = geometry.vertices;
        const faces = geometry.faces;
        const coordinates = geometry.faceVertexUvs && geometry.faceVertexUvs[ 0 ];
        if( !vertices || !faces || !coordinates ) return;
        if( coordinates.length !== faces.length ) return;

        let touched = 0;

        for( let it = 0; it < faces.length; it++ ) {
            const face = faces[ it ];
            const corners = [ vertices[ face.a ], vertices[ face.b ], vertices[ face.c ] ];
            const row = coordinates[ it ];
            if( !row || row.length < 3 ) continue;

            const normal = face.normal;
            const length = normal ? Math.hypot( normal.x, normal.y, normal.z ) : 0;
            if( length < epsilon ) continue;
            if( Math.abs( normal.z / length ) > flat_enough ) continue;

            const span_x = Math.max( Math.abs( corners[ 1 ].x - corners[ 0 ].x ),
                Math.abs( corners[ 2 ].x - corners[ 0 ].x ) );
            const span_y = Math.max( Math.abs( corners[ 1 ].y - corners[ 0 ].y ),
                Math.abs( corners[ 2 ].y - corners[ 0 ].y ) );
            const along_x = span_x >= span_y;

            for( let corner = 0; corner < 3; corner++ ) {
                row[ corner ].x = along_x ? corners[ corner ].x : corners[ corner ].y;
            }
            touched++;
        }

        geometry.__plus_uv_fixed = true;
        if( !touched ) return;
        geometry.uvsNeedUpdate = true;
        status.geometries_fixed++;
    }

    function fix_any( geometry ) {
        if( !settings.fix_text_uv || !geometry ) return geometry;
        try {
            if( geometry.attributes ) fix_geometry_uv( geometry );
            else if( geometry.faces ) fix_legacy_geometry_uv( geometry );
        } catch( error ) {}
        return geometry;
    }

    function arm_anisotropy( THREE ) {
        const prototype = THREE.Texture && THREE.Texture.prototype;
        if( !prototype ) return;
        if( Object.prototype.hasOwnProperty.call( prototype, "anisotropy" ) ) return;

        Object.defineProperty( prototype, "anisotropy", {
            configurable: true,
            get() {
                return this.__plus_anisotropy === undefined ? 1 : this.__plus_anisotropy;
            },
            set( any ) {
                const wanted = settings.anisotropy
                    ? Math.max( any, anisotropy_level ) : any;
                Object.defineProperty( this, "__plus_anisotropy", {
                    value: wanted, writable: true, configurable: true,
                } );
                if( wanted > 1 ) status.anisotropic++;
            },
        } );
    }

    const classes = {
        TextGeometry: { after: fix_any },
        TextBufferGeometry: { after: fix_any },
        ExtrudeGeometry: { after: fix_any },
        ExtrudeBufferGeometry: { after: fix_any },
        WebGLRenderer: { before: renderer_params, after: note_renderer },
    };
    const class_names = Object.keys( classes );

    function wrap_class( name, original ) {
        if( typeof original !== "function" || original.__plus_wrapped ) return original;
        const rules = classes[ name ] || {};

        function patched( ...parameters ) {
            const ready = rules.before ? rules.before( parameters ) : parameters;
            if( this instanceof patched ) {
                try {
                    original.apply( this, ready );
                    if( rules.after ) rules.after( this );
                    return this;
                } catch( error ) {}
            }
            const instance = new original( ...ready );
            if( rules.after ) rules.after( instance );
            return instance;
        }
        patched.prototype = original.prototype;
        patched.__plus_wrapped = true;
        Object.setPrototypeOf( patched, original );

        try {
            Object.defineProperty( patched, "name", { value: name, configurable: true } );
        } catch( error ) {}

        status.patched++;
        return patched;
    }

    function arm_object( THREE ) {
        if( !THREE || typeof THREE !== "object" || THREE.__plus_three_armed ) return;
        try {
            Object.defineProperty( THREE, "__plus_three_armed", { value: true, enumerable: false } );
        } catch( error ) {}

        const claim = ( name, transform ) => {
            let held = transform( name, THREE[ name ] );
            try {
                Object.defineProperty( THREE, name, {
                    configurable: true,
                    enumerable: true,
                    get() { return held; },
                    set( next ) { held = transform( name, next ); },
                } );
            } catch( error ) {}
        };

        for( const name of class_names ) claim( name, wrap_class );
        arm_anisotropy( THREE );

        status.three = "r" + ( THREE.REVISION || "?" ) + " armed";
    }

    function watch_for_three() {
        let held = window.THREE;
        if( held ) {
            arm_object( held );
            return;
        }
        try {
            Object.defineProperty( window, "THREE", {
                configurable: true,
                get() { return held; },
                set( any ) {
                    held = any;
                    arm_object( any );
                },
            } );
        } catch( error ) {
            status.three = "global is locked";
        }
    }

    watch_for_three();

    function global_pz() {
        try {
            if( typeof PZ !== "undefined" && PZ ) return PZ;
        } catch( error ) {}
        return window.PZ || null;
    }

    let light_patched = false;
    let mounted = false;
    let viewport_armed = false;
    let precision_armed = false;

    function fill( list ) {
        if( !Array.isArray( list ) || !settings.mount_effects ) return list;
        if( list.some( ( entry ) => entry && entry.__plus_mounted ) ) return list;

        const api = window.extension;
        const effects = api && api.effects;
        const build = api && api.effect;
        if( !Array.isArray( effects ) || !effects.length || !build ) return list;

        list.push( { name: "Panzoid+", category: true, __plus_mounted: true } );

        for( const effect of effects ) {
            const any = build.build_any( effect );

            list.push( {
                name: effect.name,
                desc: effect.description
                    || ( effect.tab? "Panzoid+ " + effect.tab.toLowerCase(): "Panzoid+" ),
                type: any.type,
                data: any,
                __plus_mounted: true
            } );
        }

        status.mounted = effects.length;
        return list;
    }

    function mount( PZ ) {
        if( mounted ) return;

        const types = PZ.ui && PZ.ui.objectTypes;
        if( !types || typeof types.get !== "function" ) return;

        const read = types.get.bind( types );
        types.get = function( key ) {
            const list = read( key );
            return key === PZ.effect ? fill( list ) : list;
        };

        fill( PZ.effect && read( PZ.effect ) );
        mounted = true;
    }

    const live_fields = new Set();

    function repaint_fields() {
        live_fields.forEach( function( field ) {
            const element = field.el;
            if( !element || !element.isConnected ) {
                live_fields.delete( field );
                return;
            }
            if( typeof field.value !== "number" ) return;
            try {
                field.update( field.value );
            } catch( error ) {}
        } );
    }

    function arm_precision( PZ ) {
        if( precision_armed ) return;

        const input = PZ.ui && PZ.ui.input;
        const prototype = input && input.prototype;
        if( !prototype || typeof prototype.update !== "function" ) return;

        try {
            Object.defineProperty( prototype, "decimals", {
                configurable: true,
                get() {
                    return settings.precise_values ? decimals_shown : this.__plus_decimals;
                },
                set( any ) {
                    Object.defineProperty( this, "__plus_decimals", {
                        value: any, writable: true, configurable: true
                    } );
                }
            } );
        } catch( error ) {
            return;
        }

        const original = prototype.update;
        prototype.update = function( any, forced ) {
            live_fields.add( this );
            return original.call( this, any, forced );
        };

        precision_armed = true;
    }

    function with_pixel_ratio( ratio, body ) {
        let own = null;

        try {
            own = Object.getOwnPropertyDescriptor( window, "devicePixelRatio" );
            Object.defineProperty( window, "devicePixelRatio", {
                configurable: true,
                get() { return ratio; }
            } );
        } catch( error ) {
            return body();
        }

        try {
            return body();
        } finally {
            try {
                if( own ) Object.defineProperty( window, "devicePixelRatio", own );
                else delete window.devicePixelRatio;
            } catch( error ) {}
        }
    }

    function preview_scale( view ) {
        const resolution = view.sequence.properties.resolution.get();
        const project_width = resolution[ 0 ];
        const project_height = resolution[ 1 ];
        if( !project_width || !project_height ) return 1;

        const box = view.el.getBoundingClientRect();
        const fit = Math.min( box.width / project_width, box.height / project_height );
        if( !isFinite( fit ) || fit <= 0 ) return 1;

        const ratio = window.devicePixelRatio || 1;
        const natural_width = Math.round( Math.round( project_width * fit ) * ratio );
        const natural_height = Math.round( Math.round( project_height * fit ) * ratio );
        if( !natural_width || !natural_height ) return 1;

        const cap = max_texture_size || 4096;
        const scale = Math.min(
            project_width / natural_width,
            project_height / natural_height,
            cap / natural_width,
            cap / natural_height );

        return scale > 1 ? Math.min( scale, preview_scale_limit ) : 1;
    }

    function arm_viewport( PZ ) {
        if( viewport_armed ) return;

        const viewport = PZ.ui && PZ.ui.viewport;
        const prototype = viewport && viewport.prototype;
        if( !prototype || typeof prototype.resize !== "function" ) return;

        const original = prototype.resize;

        prototype.resize = function() {
            const view = this;
            const parameters = arguments;

            if( !settings.sharp_preview || !view.sequence || !view.el ) {
                return original.apply( view, parameters );
            }

            let scale = 1;
            try {
                scale = preview_scale( view );
            } catch( error ) {
                scale = 1;
            }
            if( scale <= 1 ) return original.apply( view, parameters );

            const done = with_pixel_ratio( ( window.devicePixelRatio || 1 ) * scale,
                function() { return original.apply( view, parameters ); } );

            try {
                status.preview = view.canvas.width + "x" + view.canvas.height;
            } catch( error ) {}

            return done;
        };

        viewport_armed = true;
    }

    function patch_light( PZ ) {
        if( light_patched ) return;

        const holder = PZ.object3d;
        const original = holder && holder.light;
        if( typeof original !== "function" || original.__plus_wrapped ) {
            light_patched = Boolean( original && original.__plus_wrapped );
            return;
        }

        function scale_shadow( light ) {
            const three = light && light.threeObj;
            const shadow = three && three.shadow;
            const size = shadow && shadow.mapSize;
            if( !size || size.__plus_scaled ) return;
            if( !settings.better_shadows ) return;

            const cap = max_texture_size || 4096;
            shadow.bias = shadow_bias;
            shadow.radius = shadow_factor;
            size.width = Math.min( size.width * shadow_factor, cap );
            size.height = Math.min( size.height * shadow_factor, cap );

            status.shadows_scaled++;
            status.shadow_size = size.width;

            try {
                Object.defineProperty( size, "__plus_scaled", { value: true } );
            } catch( error ) {}
        }

        function patched_light( ...parameters ) {
            if( this instanceof patched_light ) {
                try {
                    original.apply( this, parameters );
                    scale_shadow( this );
                    return this;
                } catch( error ) {}
            }
            const instance = new original( ...parameters );
            scale_shadow( instance );
            return instance;
        }
        patched_light.prototype = original.prototype;
        patched_light.__plus_wrapped = true;
        Object.setPrototypeOf( patched_light, original );

        try {
            Object.defineProperty( patched_light, "name",
                { value: original.name, configurable: true } );
        } catch( error ) {}

        try {
            holder.light = patched_light;
            light_patched = true;
        } catch( error ) {}
    }

    function watch_for_pz() {
        let tries = 0;

        const tick = () => {
            const PZ = global_pz();
            if( PZ ) {
                patch_light( PZ );
                arm_viewport( PZ );
                arm_precision( PZ );
                mount( PZ );
            }

            const ready = light_patched && mounted && viewport_armed && precision_armed;
            if( ready || ++tries > 2400 ) return;
            setTimeout( tick, 25 );
        };

        tick();
    }

    try {
        watch_for_pz();
    } catch( error ) {}

    function serve_clipboard( text, run ) {
        const clipboard = navigator.clipboard;
        if( !clipboard ) return { served: false, reason: "this browser has no clipboard api" };

        const own = Object.getOwnPropertyDescriptor( clipboard, "readText" );
        let served = false;

        try {
            Object.defineProperty( clipboard, "readText", {
                configurable: true,
                writable: true,
                value: async() => {
                    served = true;
                    return text;
                },
            } );
        } catch( error ) {
            return { served: false, reason: "clipboard api is locked down" };
        }

        try {
            run();
        } finally {

            setTimeout( () => {
                try {
                    if( own ) Object.defineProperty( clipboard, "readText", own );
                    else delete clipboard.readText;
                } catch( error ) {}
            }, 0 );
        }

        return { served, reason: null };
    }

    function ctrl_v() {
        return new KeyboardEvent( "keydown", {
            key: "v", code: "KeyV", keyCode: 86, which: 86,
            ctrlKey: true, metaKey: false, shiftKey: false, altKey: false,
            bubbles: true, cancelable: true, composed: true,
        } );
    }

    function transfer( text ) {
        const target = document.activeElement;

        if( !target || target === document.body || target === document.documentElement ) {
            status.last_transfer = "nothing is focused in Clipmaker - click the panel to paste into";
            return false;
        }

        const tag = target.tagName;
        if( tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target.isContentEditable ) {
            status.last_transfer = "a text field has focus - click the panel to paste into";
            return false;
        }

        const result = serve_clipboard( text, () => target.dispatchEvent( ctrl_v() ) );

        if( result.reason ) {
            status.last_transfer = result.reason;
            return false;
        }
        status.last_transfer = result.served
            ? "pasted into " + describe( target )
            : describe( target ) + " did not handle ctrl+v - click the panel to paste into";
        return result.served;
    }

    function answer( variant, serial, payload ) {
        window.postMessage( Object.assign(
            { extension: marker, variant: variant + "_answer", serial }, payload ), "*" );
    }

    window.addEventListener( "message", ( event ) => {
        if( event.source !== window ) return;

        const message = event.data;
        if( !message || message.extension !== marker ) return;

        if( message.variant === "catalogue" ) {
            try {
                window.extension.catalogue.install( message.parts );
            } catch( error ) {}
            return;
        }

        if( message.variant === "settings" ) {
            settings = Object.assign( {}, defaults, message.settings || {} );
            repaint_fields();

            answer( "settings", message.serial, { applied: true } );
            return;
        }

        if( message.variant === "transfer" ) {
            let applied = false;
            let failure = null;

            try {
                applied = transfer( message.any );
            } catch( error ) {
                failure = error && error.message? error.message: String( error );
                status.last_transfer = "threw: " + failure;
            }

            answer( "transfer", message.serial,
                { applied, error: failure, detail: status.last_transfer } );
            return;
        }

        if( message.variant === "status" ) {
            answer( "status", message.serial, {
                status: Object.assign( {}, status, {
                    settings: Object.assign( {}, settings )
                } )
            } );
        }
    } );
} )();
