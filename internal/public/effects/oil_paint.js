window.pz_effects.push( {
    id: "oil_paint",
    name: "Oil Paint",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float radius;
uniform float fetches;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 64;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 reach = max( radius, 1.0 ) / resolution;

    float count = max( fetches, 4.0 );
    float count_inverse = 1.0 / count;

    vec3 best = color.xyz;
    float evenest = -1.0;

    for( int quadrant = 0; quadrant < 4; ++quadrant ) {
        vec2 corner = vec2( ( quadrant == 0 || quadrant == 3 ) ? -1.0 : 1.0,
            ( quadrant < 2 ) ? -1.0 : 1.0 );

        vec3 sum = vec3( 0.0 );
        vec3 sum_squared = vec3( 0.0 );
        float taken = 0.0;

        for( int it = 0; it < c_fetches_max; ++it ) {
            if( float( it ) >= count ) break;

            float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
            float spin = float( it ) * c_golden_angle;

            vec2 offset = abs( vec2( cos( spin ), sin( spin ) ) ) * along * corner;
            vec3 near = texture2D( tDiffuse, clamp( vUv + offset * reach, 0.0, 1.0 ) ).xyz;

            sum += near;
            sum_squared += near * near;
            taken += 1.0;
        }

        vec3 mean = sum / taken;
        vec3 spread = abs( sum_squared / taken - mean * mean );
        float evenness = dot( spread, c_luma );

        if( evenest < 0.0 || evenness < evenest ) {
            evenest = evenness;
            best = mean;
        }
    }

    gl_FragColor = vec4( clamp( mix( color.xyz, best, force ), 0.0, 1.0 ), color.w );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 8 },
        { name: "radius", type: "number", value: 8, min: 1, max: 32 },
        { name: "fetches", type: "number", value: 64, min: 4, max: 64 }
    ]
} );
