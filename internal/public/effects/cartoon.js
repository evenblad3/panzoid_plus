window.pz_effects.push( {
    id: "cartoon",
    name: "Cartoon",
    desc: "todo description",
    tab: pz_tabs.stylize,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float thickness;
uniform float feather;
uniform float fetches;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_pi_double = 6.28318531;
const float c_epsilon = 1.0e-6;
const float c_edge_floor = 0.12;
const int c_fetches_max = 64;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float here = dot( texel.xyz, c_luma );
    float reach = thickness * 0.002;
    vec2 spread = reach * round_uv;

    float count = max( fetches, 1.0 );
    float turn = c_pi_double / count;
    float apart = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float angle = float( it ) * turn;
        vec4 near = texture2D( tDiffuse,
            vUv + vec2( cos( angle ), sin( angle ) ) * spread );

        apart = max( apart, abs( dot( near.xyz, c_luma ) - here ) );
        apart = max( apart, abs( near.w - texel.w ) );
    }

    float edge = max( 1.0 - clamp( force, 0.0, 1.0 ), c_edge_floor );
    float soft = max( feather, c_epsilon ) * edge;
    float contour = smoothstep( edge - soft, edge + soft, apart );

    gl_FragColor = vec4( mix( texel.xyz, tint, contour ), max( texel.w, contour ) );
}`,
    controls: [
        { name: "force", type: "number", value: 0.7, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "thickness", type: "number", value: 1, min: 0.25, max: 8 },
        { name: "feather", type: "number", value: 0.3, min: 0.01, max: 1 },
        { name: "fetches", type: "number", value: 64, min: 4, max: 64 }
    ]
} );
