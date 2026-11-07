window.pz_effects.push( {
    id: "satin",
    name: "Satin",
    desc: "todo description",
    tab: pz_tabs.shadow,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float shift;
uniform float feather;
uniform float fetches;

varying vec2 vUv;

const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;
    vec2 round_uv = vec2( 1.0 / aspect, 1.0 );
    vec2 spread = feather * round_uv;

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    vec2 away = vec2( shift, shift ) * round_uv;
    float ahead = 0.0;
    float behind = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;
        vec2 step_uv = vec2( cos( spin ), sin( spin ) ) * along * spread;

        ahead += texture2D( tDiffuse, vUv + away + step_uv ).w;
        behind += texture2D( tDiffuse, vUv - away + step_uv ).w;
    }

    ahead *= count_inverse;
    behind *= count_inverse;

    float sheen = clamp( abs( ahead - behind ) * force, 0.0, 1.0 ) * color.w;

    gl_FragColor = vec4( mix( color.xyz, tint, sheen ), color.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 3 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "shift", type: "number", value: 0.02, min: 0, max: 0.25 },
        { name: "feather", type: "number", value: 0.02, min: 0, max: 0.25 },
        { name: "fetches", type: "number", value: 128, min: 8, max: 128 }
    ]
} );
