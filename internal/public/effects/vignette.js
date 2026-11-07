window.pz_effects.push( {
    id: "vignette",
    name: "Vignette",
    desc: "todo description",
    tab: pz_tabs.light,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform vec2 center;
uniform float size;
uniform float feather;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.x / resolution.y, 1.0 );

    float radius = max( size, c_epsilon ) * length( round_uv );
    float soft = max( feather, c_epsilon ) * radius;
    float to_center = length( ( vUv - center ) * round_uv );

    float fade = smoothstep( radius - soft, radius + soft, to_center )
        * clamp( force, 0.0, 1.0 );

    gl_FragColor = vec4( mix( color.xyz, tint, fade ), color.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 0, 0, 0 ] },
        { name: "center", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "size", type: "number", value: 0.5, min: 0.05, max: 1.5 },
        { name: "feather", type: "number", value: 0.5, min: 0.01, max: 2 }
    ]
} );
