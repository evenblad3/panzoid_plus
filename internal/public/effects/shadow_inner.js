window.pz_effects.push( {
    id: "shadow_inner",
    name: "Shadow inner",
    desc: "todo description",
    tab: pz_tabs.shadow,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float angle;
uniform float shift;
uniform float feather;
uniform float grain;
uniform float fetches;

varying vec2 vUv;

const float c_golden_angle = 2.39996323;
const float c_noise_scale = 1024.0;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;
    vec2 round_uv = vec2( 1.0 / aspect, 1.0 );
    vec2 spread = feather * round_uv;

    float turn = radians( angle );
    vec2 offset = vec2( cos( turn ), -sin( turn ) ) * shift * round_uv;
    vec2 at = vUv - offset;

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;
    float outside = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;
        vec2 step_uv = vec2( cos( spin ), sin( spin ) ) * along * spread;

        outside += 1.0 - texture2D( tDiffuse, at + step_uv ).w;
    }

    float shade = clamp( outside * count_inverse * force, 0.0, 1.0 );

    vec3 scatter = fract( ( vUv * c_noise_scale ).xyx * 0.1031 );
    scatter += dot( scatter, scatter.yzx + 33.33 );
    float grain_value = fract( ( scatter.x + scatter.y ) * scatter.z );

    shade *= 1.0 + ( grain_value - 0.5 ) * grain;
    shade = clamp( shade, 0.0, 1.0 ) * color.w;

    gl_FragColor = vec4( mix( color.xyz, tint, shade ), color.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 2 },
        { name: "tint", type: "color", value: [ 0, 0, 0 ] },
        { name: "angle", type: "number", value: 135, min: 0, max: 360 },
        { name: "shift", type: "number", value: 0.01, min: 0, max: 0.25 },
        { name: "feather", type: "number", value: 0.015, min: 0, max: 0.25 },
        { name: "grain", type: "number", value: 0, min: 0, max: 1 },
        { name: "fetches", type: "number", value: 128, min: 8, max: 128 }
    ]
} );
