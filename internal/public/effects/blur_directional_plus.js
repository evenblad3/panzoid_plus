window.pz_effects.push( {
    id: "blur_directional_plus",
    name: "Blur Directional+",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 direction;
uniform float force;
uniform float gain;
uniform float fetches;

varying vec2 vUv;

const float c_reach = 0.05;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float count = max( fetches, 2.0 );
    float count_inverse = 1.0 / count;
    float span_inverse = 1.0 / ( count - 1.0 );

    vec4 total = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = float( it ) * span_inverse - 0.5;
        total += texture2D( tDiffuse, vUv + direction * along * force * c_reach * round_uv );
    }

    gl_FragColor = total * count_inverse * gain;
}`,
    controls: [
        { name: "force", type: "number", value: 2, min: 0, max: 8 },
        { name: "direction", type: "vec2", value: [ 0, 0.5 ], min: -1, max: 1 },
        { name: "gain", type: "number", value: 1, min: 0.1, max: 2 },
        { name: "fetches", type: "number", value: 128, min: 4, max: 128 }
    ]
} );
