window.pz_effects.push( {
    id: "chromatic_aberration",
    name: "Chromatic aberration",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float red;
uniform float green;
uniform float blue;
uniform float fetches;

varying vec2 vUv;

const float c_shift_scale = 0.025;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 64;

void main() {
    vec2 centered = vUv - vec2( 0.5 );
    float reach = force * length( centered );

    float count = max( fetches, 2.0 );
    float span_inverse = 1.0 / ( count - 1.0 );

    vec3 total = vec3( 0.0 );
    vec3 weight_total = vec3( 0.0 );
    float alpha = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = float( it ) * span_inverse;

        float channel = ( along < 0.5 )
            ? mix( red, green, along * 2.0 )
            : mix( green, blue, along * 2.0 - 1.0 );

        vec4 texel = texture2D( tDiffuse, vUv + centered * channel * c_shift_scale * reach );

        vec3 weight = vec3(
            smoothstep( 0.5, 0.0, along ),
            1.0 - abs( along * 2.0 - 1.0 ),
            smoothstep( 0.5, 1.0, along )
        );

        total += texel.xyz * weight;
        weight_total += weight;
        alpha += texel.w;
    }

    gl_FragColor = vec4( total / max( weight_total, vec3( c_epsilon ) ), alpha / count );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 8 },
        { name: "red", type: "number", value: -0.5, min: -1, max: 1 },
        { name: "green", type: "number", value: 0, min: -1, max: 1 },
        { name: "blue", type: "number", value: -0.5, min: -1, max: 1 },
        { name: "fetches", type: "number", value: 64, min: 3, max: 64 }
    ]
} );
