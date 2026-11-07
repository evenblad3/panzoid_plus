window.pz_effects.push( {
    id: "mirror_plus",
    name: "Mirror+",
    desc: "todo description",
    tab: pz_tabs.distort,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float segments;
uniform float rotation;
uniform float twist;
uniform vec2 offset;
uniform vec2 scale;

varying vec2 vUv;

const float c_pi_double = 6.28318531;
const float c_epsilon = 1.0e-6;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    vec2 centered = vUv - 0.5;
    centered.x *= aspect;

    float radius = length( centered );
    float angle = atan( centered.y, centered.x ) + twist * radius * c_pi_double;

    float wedge = c_pi_double / max( segments, 1.0 );
    float folded = abs( mod( angle, wedge ) - wedge * 0.5 );

    vec2 spot = vec2( cos( folded ), sin( folded ) ) * radius;

    float turn = rotation * c_pi_double;
    float cosine = cos( turn );
    float sine = sin( turn );

    spot = mat2( cosine, -sine, sine, cosine ) * spot;
    spot.x /= aspect;
    spot = spot / max( scale, vec2( c_epsilon ) ) + offset + 0.5;

    vec4 made = texture2D( tDiffuse, 1.0 - abs( mod( spot, 2.0 ) - 1.0 ) );

    gl_FragColor = mix( texture2D( tDiffuse, vUv ), made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "segments", type: "number", value: 6, min: 1, max: 16 },
        { name: "rotation", type: "number", value: 0, min: 0, max: 1 },
        { name: "twist", type: "number", value: 0, min: -1, max: 1 },
        { name: "offset", type: "vec2", value: [ 0, 0 ], min: -1, max: 1 },
        { name: "scale", type: "vec2", value: [ 1, 1 ], min: 0.1, max: 5 }
    ]
} );
