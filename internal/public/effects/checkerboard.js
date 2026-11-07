window.pz_effects.push( {
    id: "checkerboard",
    name: "Checkerboard",
    desc: "todo description",
    tab: pz_tabs.pattern,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 anchor;
uniform vec2 size;
uniform float feather;
uniform float force;
uniform vec3 tint;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    vec2 square_uv = vec2( vUv.x * aspect, vUv.y );
    vec2 square_anchor = vec2( anchor.x * aspect, anchor.y );

    vec2 cells = ( square_uv - square_anchor ) / max( size, vec2( c_epsilon ) );
    vec2 wave = abs( fract( cells * 0.5 ) - 0.5 ) * 2.0 - 0.5;

    float edge = max( feather, c_epsilon ) * 0.5;
    vec2 soft = smoothstep( -edge, edge, wave );
    float square = soft.x + soft.y - 2.0 * soft.x * soft.y;

    gl_FragColor = vec4( mix( color.xyz, tint, square * force ),
        max( color.w, square * force ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "anchor", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "size", type: "vec2", value: [ 0.05, 0.05 ], min: 0.002, max: 0.5 },
        { name: "feather", type: "number", value: 0.05, min: 0, max: 1 }
    ]
} );
