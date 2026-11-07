window.pz_effects.push( {
    id: "griddler",
    name: "Griddler",
    desc: "todo description",
    tab: pz_tabs.pattern,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec4 stretch;
uniform float scale;
uniform vec2 rotation;

varying vec2 vUv;

const float c_pi_double = 6.28318531;
const float c_epsilon = 1.0e-6;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    float cell_size = max( scale, 0.001 );
    vec2 square_uv = vec2( vUv.x * aspect, vUv.y );

    vec2 cell = floor( square_uv / cell_size );
    vec2 inside = fract( square_uv / cell_size ) - 0.5;

    float odd = mod( cell.x + cell.y, 2.0 );
    float turn = mix( rotation.x, rotation.y, odd ) * c_pi_double;

    float cosine = cos( turn );
    float sine = sin( turn );
    inside = vec2( inside.x * cosine - inside.y * sine, inside.x * sine + inside.y * cosine );
    inside /= max( mix( stretch.xy, stretch.zw, odd ), vec2( 0.001 ) );

    vec2 at = ( cell + inside + 0.5 ) * cell_size;
    at.x /= aspect;

    vec4 made = ( at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0 )
        ? vec4( 0.0 )
        : texture2D( tDiffuse, at );

    gl_FragColor = mix( texture2D( tDiffuse, vUv ), made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "stretch", type: "vec4", value: [ 1, 1, 1, 1 ], min: 0.1, max: 4 },
        { name: "scale", type: "number", value: 0.1, min: 0.01, max: 1 },
        { name: "rotation", type: "vec2", value: [ 0, 0 ], min: -1, max: 1 }
    ]
} );
