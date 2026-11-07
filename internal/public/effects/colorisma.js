window.pz_effects.push( {
    id: "colorisma",
    name: "Colorisma",
    desc: "todo description",
    tab: pz_tabs.color,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float saturation;
uniform float exposure;
uniform float contrast;
uniform float temperature;
uniform float magenta;
uniform float lift;
uniform float gamma;
uniform float gain;
uniform vec3 shadow_tint;
uniform vec3 light_tint;
uniform float toning;
uniform float hue;

varying vec2 vUvScaled;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const vec3 c_warm = vec3( 1.0, 0.45, -0.9 );
const vec3 c_green = vec3( -0.5, 1.0, -0.5 );
const float c_grey = 0.18;
const float c_epsilon = 1.0e-6;

void main() {
    vec4 texel = texture2D( tDiffuse, vUvScaled );
    vec3 graded = max( texel.xyz, 0.0 );

    graded *= exp2( exposure );
    graded *= tint;
    graded += c_warm * temperature * 0.1 + c_green * magenta * 0.1;
    graded = max( graded, 0.0 );

    graded = graded * gain + lift * ( 1.0 - graded );
    graded = pow( max( graded, c_epsilon ), vec3( 1.0 / max( gamma, 0.1 ) ) );

    graded = max( ( graded - c_grey ) * contrast + c_grey, 0.0 );

    float bright = dot( graded, c_luma );
    graded = mix( vec3( bright ), graded, saturation );

    vec3 warm_dark = mix( vec3( 1.0 ), shadow_tint, 1.0 - smoothstep( 0.0, 0.5, bright ) );
    vec3 warm_light = mix( vec3( 1.0 ), light_tint, smoothstep( 0.5, 1.0, bright ) );
    graded = mix( graded, graded * warm_dark * warm_light, clamp( toning, 0.0, 1.0 ) );

    float spin = hue * 6.28318531;
    float cosine = cos( spin );
    float sine = sin( spin );

    vec3 turned = vec3(
        dot( graded, vec3( 0.299 + 0.701 * cosine + 0.168 * sine,
            0.587 - 0.587 * cosine + 0.330 * sine,
            0.114 - 0.114 * cosine - 0.497 * sine ) ),
        dot( graded, vec3( 0.299 - 0.299 * cosine - 0.328 * sine,
            0.587 + 0.413 * cosine + 0.035 * sine,
            0.114 - 0.114 * cosine + 0.292 * sine ) ),
        dot( graded, vec3( 0.299 - 0.300 * cosine + 1.250 * sine,
            0.587 - 0.588 * cosine - 1.050 * sine,
            0.114 + 0.886 * cosine - 0.203 * sine ) )
    );

    gl_FragColor = vec4( mix( texel.xyz, clamp( turned, 0.0, 1.0 ),
        clamp( force, 0.0, 1.0 ) ), texel.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "saturation", type: "number", value: 1, min: 0, max: 3 },
        { name: "exposure", type: "number", value: 0, min: -4, max: 4 },
        { name: "contrast", type: "number", value: 1, min: 0, max: 3 },
        { name: "temperature", type: "number", value: 0, min: -1, max: 1 },
        { name: "magenta", type: "number", value: 0, min: -1, max: 1 },
        { name: "lift", type: "number", value: 0, min: -0.5, max: 0.5 },
        { name: "gamma", type: "number", value: 1, min: 0.1, max: 3 },
        { name: "gain", type: "number", value: 1, min: 0, max: 3 },
        { name: "shadow_tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "light_tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "toning", type: "number", value: 0, min: 0, max: 1 },
        { name: "hue", type: "number", value: 0, min: -1, max: 1 }
    ]
} );
