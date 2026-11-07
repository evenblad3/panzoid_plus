window.pz_effects.push( {
    id: "turbulent_displace",
    name: "Turbulent displace",
    desc: "todo description",
    tab: pz_tabs.distort,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float size;
uniform vec2 offset;
uniform float complexity;
uniform float evolution;
uniform float smoother;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;
const int c_octaves_max = 8;

float hash( vec2 spot ) {
    vec3 scatter = fract( spot.xyx * 0.1031 );
    scatter += dot( scatter, scatter.yzx + 33.33 );
    return fract( ( scatter.x + scatter.y ) * scatter.z );
}

float wave( vec2 spot ) {
    vec2 cell = floor( spot );
    vec2 inside = fract( spot );
    vec2 fade = inside * inside * ( 3.0 - 2.0 * inside );

    float corner_a = hash( cell );
    float corner_b = hash( cell + vec2( 1.0, 0.0 ) );
    float corner_c = hash( cell + vec2( 0.0, 1.0 ) );
    float corner_d = hash( cell + vec2( 1.0, 1.0 ) );

    return mix( mix( corner_a, corner_b, fade.x ), mix( corner_c, corner_d, fade.x ), fade.y );
}

float fractal( vec2 spot ) {
    float total = 0.0;
    float weight = 0.5;
    float reach = 1.0;
    float weight_total = 0.0;

    for( int it = 0; it < c_octaves_max; ++it ) {
        if( float( it ) >= complexity ) break;

        float one = wave( spot * reach ) * 2.0 - 1.0;
        total += mix( abs( one ), one, clamp( smoother, 0.0, 1.0 ) ) * weight;

        weight_total += weight;
        reach *= 2.0;
        weight *= 0.5;
    }

    return total / max( weight_total, c_epsilon );
}

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.x / resolution.y, 1.0 );

    vec2 spot = vUv * round_uv * ( 100.0 / max( size, 1.0 ) ) + offset + evolution;

    vec2 push = vec2( fractal( spot ), fractal( spot + vec2( 37.4, 11.7 ) ) );
    vec2 at = vUv + push * force * 0.002 / round_uv;

    gl_FragColor = texture2D( tDiffuse, 1.0 - abs( mod( at, 2.0 ) - 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 50, min: 0, max: 400 },
        { name: "size", type: "number", value: 100, min: 2, max: 400 },
        { name: "offset", type: "vec2", value: [ 0, 0 ], min: -10, max: 10 },
        { name: "complexity", type: "number", value: 3, min: 1, max: 8 },
        { name: "evolution", type: "number", value: 0, min: 0 },
        { name: "smoother", type: "number", value: 0, min: 0, max: 1 }
    ]
} );
