window.pz_effects.push( {
    id: "leave_color",
    name: "Leave color",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.212, 0.715, 0.072 );

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    float apart = distance( texel.xyz, tint );
    vec3 grey = vec3( dot( texel.xyz, c_luma ) );

    vec4 made = vec4( mix( texel.xyz, grey, smoothstep( 0.65, 0.5, apart ) ), texel.w );

    gl_FragColor = mix( texel, made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] }
    ]
} );
