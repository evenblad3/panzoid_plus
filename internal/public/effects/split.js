window.pz_effects.push( {
    id: "split",
    name: "Split",
    desc: "todo description",
    tab: pz_tabs.distort,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec2 point_a;
uniform vec2 point_b;
uniform float split_a;
uniform float split_b;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec2 along = point_b - point_a;
    float span = max( length( along ), c_epsilon );
    vec2 forward = along / span;
    vec2 sideways = vec2( -forward.y, forward.x );

    vec2 from_a = vUv - point_a;
    float across = dot( from_a, sideways );
    float travelled = clamp( dot( from_a, forward ) / span, 0.0, 1.0 );

    float push = mix( split_a, split_b, travelled ) * 0.5;
    vec2 at = vUv - sideways * ( ( across >= 0.0 ) ? push : -push );

    vec4 made = ( at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0 )
        ? vec4( 0.0 )
        : texture2D( tDiffuse, at );

    gl_FragColor = mix( texture2D( tDiffuse, vUv ), made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "point_a", type: "vec2", value: [ 0.25, 0.5 ], min: -1, max: 2 },
        { name: "point_b", type: "vec2", value: [ 0.75, 0.5 ], min: -1, max: 2 },
        { name: "split_a", type: "number", value: 0.04, min: -1, max: 1 },
        { name: "split_b", type: "number", value: 0.06, min: -1, max: 1 }
    ]
} );
