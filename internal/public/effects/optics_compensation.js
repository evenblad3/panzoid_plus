window.pz_effects.push( {
    id: "optics_compensation",
    name: "Optics compensation",
    desc: "todo description",
    tab: pz_tabs.distort,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float angle;
uniform vec2 view_center;
uniform float reverse;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    float half_view = radians( clamp( angle, 0.0, 179.0 ) ) * 0.5;
    float bend = tan( half_view );

    vec2 from_center = vUv - view_center;
    from_center.x *= aspect;

    float radius = length( from_center );
    vec2 way = ( radius > c_epsilon ) ? from_center / radius : vec2( 0.0 );

    float pulled = ( bend > c_epsilon )
        ? ( ( reverse > 0.5 ) ? tan( radius * half_view ) / bend : atan( radius * bend ) / half_view )
        : radius;

    vec2 at = way * pulled;
    at.x /= aspect;
    at += view_center;

    vec4 made = ( at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0 )
        ? vec4( 0.0 )
        : texture2D( tDiffuse, at );

    gl_FragColor = mix( texture2D( tDiffuse, vUv ), made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "angle", type: "number", value: 60, min: 0, max: 179 },
        { name: "view_center", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "reverse", type: "number", value: 0, min: 0, max: 1 }
    ]
} );
