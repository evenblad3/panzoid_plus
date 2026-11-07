window.pz_effects.push( {
    id: "blur_edge",
    name: "Blur Edge",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec2 center;
uniform float size;
uniform float feather;
uniform float fetches;

varying vec2 vUv;

const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 256;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float away = length( vUv - center );
    float edge = max( size, c_epsilon );
    float soft = max( feather, c_epsilon ) * edge;
    float radius = smoothstep( edge - soft, edge + soft, away ) * force * 0.05;
    vec2 spread = radius * round_uv;

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    vec4 total = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;

        total += texture2D( tDiffuse,
            vUv + vec2( cos( spin ), sin( spin ) ) * along * spread );
    }

    gl_FragColor = total * count_inverse;
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 4 },
        { name: "center", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "size", type: "number", value: 0.25, min: 0, max: 1 },
        { name: "feather", type: "number", value: 0.5, min: 0, max: 2 },
        { name: "fetches", type: "number", value: 256, min: 8, max: 256 }
    ]
} );
