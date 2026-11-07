window.pz_effects.push( {
    id: "venetian_blinds",
    name: "Venetian blinds",
    desc: "todo description",
    tab: pz_tabs.pattern,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float width;
uniform float angle;
uniform float margin;
uniform float feather;

varying vec2 vUv;
varying vec2 vUvScaled;

const float c_pi = 3.14159265;
const float c_epsilon = 1.0e-6;

void main() {
    vec4 texel = texture2D( tDiffuse, vUvScaled );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    float turn = angle * c_pi;
    float cosine = cos( turn );
    float sine = sin( turn );

    vec2 centered = ( vUvScaled - vec2( 0.5 ) ) * vec2( aspect, 1.0 );
    vec2 rotated = vec2( centered.x * cosine - centered.y * sine,
        centered.x * sine + centered.y * cosine );

    float slat = max( width, c_epsilon );
    float across = mod( rotated.x + rotated.y, slat );
    float edge = margin * slat * 0.5;
    float soft = max( feather, c_epsilon ) * slat * 0.5;

    float opening = smoothstep( edge - soft, edge + soft, across )
        * smoothstep( slat - edge + soft, slat - edge - soft, across );

    vec4 made = texel * opening;

    gl_FragColor = mix( texel, made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "width", type: "number", value: 0.02, min: 0.002, max: 1 },
        { name: "angle", type: "number", value: 0, min: 0, max: 1 },
        { name: "margin", type: "number", value: 0.5, min: 0, max: 0.9 },
        { name: "feather", type: "number", value: 0.05, min: 0, max: 1 }
    ]
} );
