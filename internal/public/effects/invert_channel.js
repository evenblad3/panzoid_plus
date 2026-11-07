window.pz_effects.push( {
    id: "invert_channel",
    name: "Invert channel",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;

varying vec2 vUv;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    float apart = distance( texel.xyz, tint );
    float reach = smoothstep( force, force - 0.5, apart );

    gl_FragColor = vec4( mix( texel.xyz, 1.0 - texel.xyz, reach ), texel.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] }
    ]
} );
