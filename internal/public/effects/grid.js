window.pz_effects.push( {
    id: "grid",
    name: "Grid",
    desc: "todo description",
    tab: pz_tabs.pattern,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 anchor;
uniform vec2 size;
uniform float border;
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

    vec2 cell = max( size, vec2( c_epsilon ) );
    vec2 inside = abs( fract( ( square_uv - square_anchor ) / cell ) - 0.5 ) * cell;

    float thickness = border * 0.5;
    float edge = max( feather, c_epsilon ) * 0.5;

    vec2 line = smoothstep( thickness + edge, thickness - edge, inside );
    float ink = max( line.x, line.y );

    gl_FragColor = vec4( mix( color.xyz, tint, ink * force ),
        max( color.w, ink * force ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "anchor", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "size", type: "vec2", value: [ 0.08, 0.08 ], min: 0.002, max: 0.5 },
        { name: "border", type: "number", value: 0.004, min: 0.001, max: 0.1 },
        { name: "feather", type: "number", value: 0.002, min: 0, max: 0.05 }
    ]
} );
