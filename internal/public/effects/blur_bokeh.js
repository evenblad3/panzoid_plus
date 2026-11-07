window.pz_effects.push( {
    id: "blur_bokeh",
    name: "Blur Bokeh",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float fetches;

varying vec2 vUv;
varying vec2 vUvScaled;

const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 512;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;
    float radius = force * 0.01;
    vec2 spread = radius * round_uv;

    vec4 total = vec4( 0.0 );
    float weight_total = 0.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float angle = float( it ) * c_golden_angle;

        vec2 offset = vec2( cos( angle ), sin( angle ) ) * along * spread;

        vec4 texel = texture2D( tDiffuse, vUvScaled + offset );
        float weight = length( texel.xyz );

        total += texel * weight;
        weight_total += weight;
    }

    gl_FragColor = ( weight_total > 0.0 ) ? total / weight_total : texture2D( tDiffuse, vUvScaled );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 32 },
        { name: "fetches", type: "number", value: 512, min: 8, max: 512 }
    ]
} );
