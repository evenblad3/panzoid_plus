( function () {
    "use strict";

    if( window.plus_installed ) return;
    window.plus_installed = true;

    const marker = "panzoid+";

    const defaults = {
        anisotropy: true,
        correct_uv: true,
        mount_effects: true,
        precise_values: true,
        full_preview: false
    };

    const flat_enough = 0.5;
    const epsilon = 1e-12;

    let settings = defaults;
    try {
        const raw = localStorage.getItem( "panzoid_plus.settings" );
        if( raw ) settings = Object.assign( {}, defaults, JSON.parse( raw ) );
    } catch( error ) {}

    let texture_limit = 0;

    function renderer_wanted( parameters ) {
        const given = parameters[ 0 ] && typeof parameters[ 0 ] === "object"?
            parameters[ 0 ]: {};

        if( given.context ) return parameters;

        parameters[ 0 ] = Object.assign( {}, given, {
            antialias: true,
            powerPreference: "high-performance"
        } );

        return parameters;
    }

    function renderer_note( renderer ) {
        try {
            const context = renderer.context
                || ( typeof renderer.getContext === "function"? renderer.getContext(): null );
            if( !context ) return renderer;

            texture_limit = Math.max( texture_limit,
                context.getParameter( context.MAX_TEXTURE_SIZE ) || 0 );
        } catch( error ) {}

        return renderer;
    }

    function vector_minus( points, from, take ) {
        return [
            points[ from ] - points[ take ],
            points[ from + 1 ] - points[ take + 1 ],
            points[ from + 2 ] - points[ take + 2 ]
        ];
    }

    function vector_cross( one, two ) {
        return [
            one[ 1 ] * two[ 2 ] - one[ 2 ] * two[ 1 ],
            one[ 2 ] * two[ 0 ] - one[ 0 ] * two[ 2 ],
            one[ 0 ] * two[ 1 ] - one[ 1 ] * two[ 0 ]
        ];
    }

    function facing_camera( normal ) {
        const length = Math.hypot( normal[ 0 ], normal[ 1 ], normal[ 2 ] );

        if( length < epsilon ) return true;
        return Math.abs( normal[ 2 ] / length ) > flat_enough;
    }

    function geometry_fix( geometry ) {
        const position = geometry.attributes && geometry.attributes.position;
        const uv = geometry.attributes && geometry.attributes.uv;

        if( !position || !uv ) return;
        if( position.count !== uv.count || position.count % 3 !== 0 ) return;

        const points = position.array;
        const coordinates = uv.array;
        let touched = 0;

        for( let it = 0; it < position.count; it += 3 ) {
            const first = it * 3;

            const edge_a = vector_minus( points, first + 3, first );
            const edge_b = vector_minus( points, first + 6, first );

            if( facing_camera( vector_cross( edge_a, edge_b ) ) ) continue;

            const along_x = Math.max( Math.abs( edge_a[ 0 ] ), Math.abs( edge_b[ 0 ] ) )
                >= Math.max( Math.abs( edge_a[ 1 ] ), Math.abs( edge_b[ 1 ] ) );

            for( let corner = 0; corner < 3; corner++ ) {
                const at = first + corner * 3;
                coordinates[ ( it + corner ) * 2 ] = along_x? points[ at ]: points[ at + 1 ];
            }

            touched++;
        }

        if( touched ) uv.needsUpdate = true;
    }

    function geometry_fix_legacy( geometry ) {
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
            if( !face.normal ) continue;
            if( facing_camera( [ face.normal.x, face.normal.y, face.normal.z ] ) ) continue;

            const along_x = Math.max( Math.abs( corners[ 1 ].x - corners[ 0 ].x ),
                Math.abs( corners[ 2 ].x - corners[ 0 ].x ) )
                >= Math.max( Math.abs( corners[ 1 ].y - corners[ 0 ].y ),
                    Math.abs( corners[ 2 ].y - corners[ 0 ].y ) );

            for( let corner = 0; corner < 3; corner++ ) {
                row[ corner ].x = along_x? corners[ corner ].x: corners[ corner ].y;
            }

            touched++;
        }

        if( touched ) geometry.uvsNeedUpdate = true;
    }

    function geometry_any( geometry ) {
        if( !settings.correct_uv || !geometry || geometry.plus_uv_fixed ) return geometry;
        geometry.plus_uv_fixed = true;

        try {
            if( geometry.attributes ) geometry_fix( geometry );
            else if( geometry.faces ) geometry_fix_legacy( geometry );
        } catch( error ) {}

        return geometry;
    }

    function anisotropy_arm( THREE ) {
        const prototype = THREE.Texture && THREE.Texture.prototype;
        if( !prototype ) return;
        if( Object.prototype.hasOwnProperty.call( prototype, "anisotropy" ) ) return;

        Object.defineProperty( prototype, "anisotropy", {
            configurable: true,
            get() {
                return this.plus_anisotropy === undefined? 1: this.plus_anisotropy;
            },
            set( any ) {
                Object.defineProperty( this, "plus_anisotropy", {
                    value: settings.anisotropy? Math.max( any, 8 ): any,
                    writable: true,
                    configurable: true
                } );
            }
        } );
    }

    const classes = {
        TextGeometry: { after: geometry_any },
        TextBufferGeometry: { after: geometry_any },
        ExtrudeGeometry: { after: geometry_any },
        ExtrudeBufferGeometry: { after: geometry_any },
        WebGLRenderer: { before: renderer_wanted, after: renderer_note }
    };

    function class_wrap( name, original ) {
        if( typeof original !== "function" || original.plus_wrapped ) return original;
        const rules = classes[ name ] || {};

        function patched( ...parameters ) {
            const ready = rules.before? rules.before( parameters ): parameters;

            if( this instanceof patched ) {
                original.apply( this, ready );
                if( rules.after ) rules.after( this );

                return this;
            }

            const instance = new original( ...ready );
            if( rules.after ) rules.after( instance );

            return instance;
        }

        patched.prototype = original.prototype;
        patched.plus_wrapped = true;
        Object.setPrototypeOf( patched, original );

        try {
            Object.defineProperty( patched, "name", { value: name, configurable: true } );
        } catch( error ) {}

        return patched;
    }

    function three_arm( THREE ) {
        if( !THREE || typeof THREE !== "object" || THREE.plus_hooked ) return;

        try {
            Object.defineProperty( THREE, "plus_hooked", { value: true, enumerable: false } );
        } catch( error ) {}

        Object.keys( classes ).forEach( function ( name ) {
            let held = class_wrap( name, THREE[ name ] );

            try {
                Object.defineProperty( THREE, name, {
                    configurable: true,
                    enumerable: true,
                    get() { return held; },
                    set( next ) { held = class_wrap( name, next ); }
                } );
            } catch( error ) {}
        } );

        anisotropy_arm( THREE );
    }

    function three_watch() {
        let held = window.THREE;

        if( held ) {
            three_arm( held );
            return;
        }

        try {
            Object.defineProperty( window, "THREE", {
                configurable: true,
                get() { return held; },
                set( any ) {
                    held = any;
                    three_arm( any );
                }
            } );
        } catch( error ) {}
    }

    three_watch();

    function site_pz() {
        try {
            if( typeof PZ !== "undefined" && PZ ) return PZ;
        } catch( error ) {}

        return window.PZ || null;
    }

    function site_reach( root, path ) {
        let held = root;

        for( const step of path.split( "." ) ) {
            if( !held ) return null;
            held = held[ step ];
        }

        return held || null;
    }

    function list_fill( list ) {
        if( !Array.isArray( list ) || !settings.mount_effects ) return list;
        if( list.some( ( entry ) => entry && entry.plus_mounted ) ) return list;

        const api = window.extension;
        const effects = api && api.effects;
        const build = api && api.effect;

        if( !Array.isArray( effects ) || !effects.length || !build ) return list;

        list.push( { name: "Panzoid+", category: true, plus_mounted: true } );

        for( const effect of effects ) {
            const any = build.build_any( effect );

            list.push( {
                name: effect.name,
                desc: effect.description,
                type: any.type,
                data: any,
                plus_mounted: true
            } );
        }

        return list;
    }

    function effects_mount( PZ ) {
        const types = PZ.ui && PZ.ui.objectTypes;
        if( !types || typeof types.get !== "function" ) return;
        if( types.get.plus_wrapped ) return;

        const read = types.get.bind( types );

        function patched( key ) {
            const list = read( key );
            return key === PZ.effect? list_fill( list ): list;
        }

        patched.plus_wrapped = true;
        types.get = patched;

        list_fill( PZ.effect && read( PZ.effect ) );
    }

    const live_fields = new Set();
    const field_crowd = 512;

    function fields_prune() {
        live_fields.forEach( function ( field ) {
            if( !field.el || !field.el.isConnected ) live_fields.delete( field );
        } );
    }

    function fields_repaint() {
        fields_prune();

        live_fields.forEach( function ( field ) {
            if( typeof field.value !== "number" ) return;

            try {
                field.update( field.value );
            } catch( error ) {}
        } );
    }

    function precision_arm( PZ ) {
        const input = PZ.ui && PZ.ui.input;
        const prototype = input && input.prototype;

        if( !prototype || typeof prototype.update !== "function" ) return;
        if( prototype.update.plus_wrapped ) return;

        try {
            Object.defineProperty( prototype, "decimals", {
                configurable: true,
                get() {
                    return settings.precise_values? 3: this.plus_decimals;
                },
                set( any ) {
                    Object.defineProperty( this, "plus_decimals", {
                        value: any, writable: true, configurable: true
                    } );
                }
            } );
        } catch( error ) {
            return;
        }

        const original = prototype.update;

        function patched( any, forced ) {
            if( live_fields.size >= field_crowd ) fields_prune();

            live_fields.add( this );
            return original.call( this, any, forced );
        }

        patched.plus_wrapped = true;
        prototype.update = patched;
    }

    function ratio_during( ratio, body ) {
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

        const cap = texture_limit || 4096;
        const scale = Math.min(
            project_width / natural_width,
            project_height / natural_height,
            cap / natural_width,
            cap / natural_height );

        return scale > 1? Math.min( scale, 8 ): 1;
    }

    function preview_arm( PZ ) {
        const viewport = PZ.ui && PZ.ui.viewport;
        const prototype = viewport && viewport.prototype;

        if( !prototype || typeof prototype.resize !== "function" ) return;
        if( prototype.resize.plus_wrapped ) return;

        const original = prototype.resize;

        function patched() {
            const view = this;
            const parameters = arguments;

            if( !settings.full_preview || !view.sequence || !view.el ) {
                return original.apply( view, parameters );
            }

            let scale = 1;
            try {
                scale = preview_scale( view );
            } catch( error ) {
                scale = 1;
            }

            if( scale <= 1 ) return original.apply( view, parameters );

            return ratio_during( ( window.devicePixelRatio || 1 ) * scale,
                function () { return original.apply( view, parameters ); } );
        }

        patched.plus_wrapped = true;
        prototype.resize = patched;
    }

    const hooks = [
        { path: "ui.viewport.prototype.resize", arm: preview_arm },
        { path: "ui.input.prototype.update", arm: precision_arm },
        { path: "ui.objectTypes.get", arm: effects_mount }
    ];

    function site_watch() {
        let ticks = 0;

        const tick = function () {
            const PZ = site_pz();
            let armed = 0;

            for( const hook of hooks ) {
                if( PZ ) {
                    try {
                        hook.arm( PZ );
                    } catch( error ) {}
                }

                const held = site_reach( PZ, hook.path );
                if( held && held.plus_wrapped ) armed++;
            }

            ticks++;
            setTimeout( tick, ( armed === hooks.length || ticks > 2400 )? 2000: 25 );
        };

        tick();
    }

    try {
        site_watch();
    } catch( error ) {}

    function clipboard_serve( text, run ) {
        const clipboard = navigator.clipboard;
        if( !clipboard ) return false;

        const own = Object.getOwnPropertyDescriptor( clipboard, "readText" );
        let served = false;

        try {
            Object.defineProperty( clipboard, "readText", {
                configurable: true,
                writable: true,
                value: async () => {
                    served = true;
                    return text;
                }
            } );
        } catch( error ) {
            return false;
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

        return served;
    }

    function clip_transfer( text ) {
        const target = document.activeElement;

        if( !target || target === document.body || target === document.documentElement ) {
            return false;
        }

        const tag = target.tagName;
        if( tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" ) return false;
        if( target.isContentEditable ) return false;

        const press = new KeyboardEvent( "keydown", {
            key: "v", code: "KeyV", keyCode: 86, which: 86,
            ctrlKey: true, metaKey: false, shiftKey: false, altKey: false,
            bubbles: true, cancelable: true, composed: true
        } );

        return clipboard_serve( text, () => target.dispatchEvent( press ) );
    }

    function page_answer( variant, serial, payload ) {
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
            fields_repaint();

            page_answer( "settings", message.serial, { applied: true } );
            return;
        }

        if( message.variant === "transfer" ) {
            let applied = false;

            try {
                applied = clip_transfer( message.any );
            } catch( error ) {}

            page_answer( "transfer", message.serial, { applied } );
        }
    } );
} )();
