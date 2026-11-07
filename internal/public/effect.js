window.pz_tabs = {
    blur: "Blur",
    stylize: "Stylize",
    pattern: "Pattern",
    color: "Color",
    light: "Light",
    shadow: "Shadow",
    outline: "Outline",
    distort: "Distort",

    shakes: "Shakes"
};

window.pz_effect = {
    types: {
        number: 0,
        vec2: 1,
        vec3: 2,
        vec4: 3,
        color: 4,
        image: 8
    },

    color_names: [ "x", "y", "z" ],
    axis_names: [ "x", "y", "z", "w" ],

    limit( limit, it ) {
        return Array.isArray( limit )? limit[ it ]: it;
    },

    control( control ) {
        const kind = window.pz_effect.types[ control.type ];

        if( kind === 8 ) {
            return {
                type: { custom: true, type: 8, assetType: 0, accept: "image/*", value: null },
                properties: { name: control.name },
                value: null
            };
        }

        const entry = {
            type: { custom: true, dynamic: true, type: kind },
            properties: { name: control.name }
        };

        if( kind === 0 ) {
            if( control.min !== undefined ) entry.type.min = control.min;
            if( control.max !== undefined ) entry.type.max = control.max;
            entry.keyframes = [ { value: control.value } ];
            return entry;
        }

        if( control.min !== undefined || control.max !== undefined ) {
            const count = kind === 4 ? 3 : kind + 1;
            const names = kind === 4 ? window.pz_effect.color_names : window.pz_effect.axis_names;

            entry.type.group = true;
            entry.type.objects = [];

            for( let index = 0; index < count; index++ ) {
                const component = {
                    dynamic: true,
                    name: names[ index ],
                    type: 0,
                    value: control.value[ index ]
                };

                if( control.min !== undefined ) {
                    component.min = window.pz_effect.limit( control.min, index );
                }
                if( control.max !== undefined ) {
                    component.max = window.pz_effect.limit( control.max, index );
                }

                entry.type.objects.push( component );
            }
        }

        entry.keyframes = [ { value: control.value.slice() } ];
        return entry;
    },

    squeeze( shader ) {
        return String( shader )
            .replace( /\s+/g, " " )
            .replace( /\s*([(){}\[\];,=<>!?:])\s*/g, "$1" )
            .replace( /([-+*\/])\s+/g, "$1" )
            .replace( /\s+([-+*\/])/g, "$1" )
            .trim();
    },

    data( effect ) {
        if( effect.shake ) {
            return { type: "shake", properties: effect.shake };
        }

        const data = {
            type: 1,
            properties: {
                name: effect.name,
                fragShader: window.pz_effect.squeeze( effect.shader )
            }
        };

        if( effect.controls && effect.controls.length ) {
            data.customProperties = effect.controls.map( window.pz_effect.control );
        }

        return data;
    },

    clip( effect ) {
        const clip = { data: [ window.pz_effect.data( effect ) ], baseType: "effect" };
        if( effect.shake ) clip.assets = [];
        return [ clip ];
    },

    json( effect ) {
        return JSON.stringify( window.pz_effect.clip( effect ) );
    },

    find( id ) {
        return window.pz_effects.find( function ( effect ) { return effect.id === id; } );
    }
};
