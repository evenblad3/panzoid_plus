window.pz_effects.push( {
    id: "ambient_occlusion",
    name: "Ambient occlusion",
    desc: "todo description",
    tab: pz_tabs.shadow,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float radius;
uniform float fetches;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;
    float reach = radius * 0.005;

    float around = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;

        around += dot( texture2D( tDiffuse,
            vUv + vec2( cos( spin ), sin( spin ) ) * along * reach * round_uv ).xyz, c_luma );
    }

    float shade = clamp( around * count_inverse * force, 0.0, 1.0 );

    gl_FragColor = vec4( mix( texel.xyz, tint, shade ), texel.w );
}`,
    controls: [
        { name: "force", type: "number", value: 0.5, min: 0, max: 2 },
        { name: "tint", type: "color", value: [ 0, 0, 0 ] },
        { name: "radius", type: "number", value: 2, min: 0, max: 6 },
        { name: "fetches", type: "number", value: 128, min: 8, max: 128 }
    ]
} );
