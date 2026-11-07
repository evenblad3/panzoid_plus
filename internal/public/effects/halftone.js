window.pz_effects.push( {
    id: "halftone",
    name: "Halftone",
    desc: "todo description",
    tab: pz_tabs.stylize,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float scale;
uniform float feather;
uniform vec3 tint;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    float cell_size = max( scale, 0.001 ) * 0.01;
    vec2 cells = vec2( vUv.x * aspect, vUv.y ) / cell_size;

    vec2 cell = floor( cells );
    vec2 inside = fract( cells ) - 0.5;

    vec2 at = vec2( ( cell.x + 0.5 ) * cell_size / aspect, ( cell.y + 0.5 ) * cell_size );
    vec4 texel = texture2D( tDiffuse, at );

    float radius = force * 0.5;
    float edge = max( feather, c_epsilon ) * radius;
    float dot_mask = smoothstep( radius + edge, radius - edge, length( inside ) );

    gl_FragColor = vec4( texel.xyz * tint, texel.w ) * dot_mask;
}`,
    controls: [
        { name: "force", type: "number", value: 0.7, min: 0.05, max: 0.8 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "scale", type: "number", value: 1, min: 0.05, max: 4 },
        { name: "feather", type: "number", value: 0.1, min: 0, max: 1 }
    ]
} );
