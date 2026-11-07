window.pz_effects.push( {
    id: "color_expansion",
    name: "Color expansion",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;

varying vec2 vUv;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    gl_FragColor = vec4( clamp( color.xyz * ( 1.0 + force ), 0.0, 1.0 ), color.w );
}`,
    controls: [
        { name: "force", type: "number", value: 0.2, min: 0, max: 2 }
    ]
} );
