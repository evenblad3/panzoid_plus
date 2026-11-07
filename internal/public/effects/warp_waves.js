window.pz_effects.push( {
    id: "warp_waves",
    name: "Warp waves",
    desc: "todo description",
    tab: pz_tabs.distort,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float twist;
uniform float time;

varying vec2 vUv;

void main() {
    vec2 wave = vec2( sin( vUv.y * twist + time ), sin( vUv.x * twist + time ) );

    vec2 at = vUv + wave * force * 0.2;

    gl_FragColor = texture2D( tDiffuse, 1.0 - abs( mod( at, 2.0 ) - 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 0.2, min: 0, max: 1 },
        { name: "twist", type: "number", value: 1.2, min: 0.25, max: 3 },
        { name: "time", type: "number", value: 0, min: 0 }
    ]
} );
