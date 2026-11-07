window.pz_effects.push( {
    id: "tint",
    name: "Tint",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec3 tint;
uniform float force;

varying vec2 vUv;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    gl_FragColor = vec4( mix( texel.xyz, texel.xyz * tint, force ), texel.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] }
    ]
} );
