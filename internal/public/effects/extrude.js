window.pz_effects.push( {
    id: "extrude",
    name: "Extrude",
    desc: "todo description",
    tab: pz_tabs.outline,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float angle;
uniform float back;
uniform float front;
uniform float fetches;

varying vec2 vUv;
varying vec2 vUvScaled;

const float c_epsilon = 1.0e-6;
const int c_fetches_max = 256;

void main() {
    vec4 color = texture2D( tDiffuse, vUvScaled );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float turn = radians( angle );
    vec2 along = vec2( cos( turn ), sin( turn ) ) * round_uv;

    float start = back * 0.1;
    float finish = max( front * 0.1, start );

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    vec4 total = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float depth = float( it ) * count_inverse;
        vec2 at = vUvScaled + along * mix( start, finish, depth );

        if( at.x >= 0.0 && at.x <= 1.0 && at.y >= 0.0 && at.y <= 1.0 ) {
            vec4 texel = texture2D( tDiffuse, at );
            total = mix( total, texel, texel.w );
        }
    }

    total.xyz *= tint;

    gl_FragColor = mix( color, total, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "angle", type: "number", value: 135, min: 0, max: 360 },
        { name: "back", type: "number", value: -0.15, min: -1, max: 0 },
        { name: "front", type: "number", value: 0.2, min: 0, max: 1 },
        { name: "fetches", type: "number", value: 256, min: 16, max: 256 }
    ]
} );
