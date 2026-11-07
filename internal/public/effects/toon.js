window.pz_effects.push( {
    id: "toon",
    name: "Toon",
    desc: "todo description",
    tab: pz_tabs.stylize,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float saturation;
uniform float portion_size;
uniform float exposure;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_epsilon = 1.0e-6;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    float steps = max( portion_size, 1.0 );
    float bright = pow( clamp( dot( texel.xyz, c_luma ), 0.0, 1.0 ),
        max( exposure, c_epsilon ) );

    float stepped = clamp( floor( bright * steps ) / max( steps - 1.0, c_epsilon ),
        0.0, 1.0 );

    vec3 shade = mix( vec3( stepped ), texel.xyz * stepped / max( bright, c_epsilon ),
        clamp( saturation, 0.0, 1.0 ) );

    gl_FragColor = vec4( mix( texel.xyz, shade * tint, clamp( force, 0.0, 1.0 ) ), texel.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "saturation", type: "number", value: 1, min: 0, max: 1 },
        { name: "portion_size", type: "number", value: 4, min: 2, max: 16 },
        { name: "exposure", type: "number", value: 1, min: 0.2, max: 3 }
    ]
} );
