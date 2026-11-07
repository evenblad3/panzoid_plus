window.pz_effects.push( {
    id: "blur_vector",
    name: "Blur Vector",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float angle;
uniform float ridge;
uniform float softness;
uniform float fetches;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );
    vec2 step_uv = max( softness, 1.0 ) / resolution;

    float left = dot( texture2D( tDiffuse, vUv - vec2( step_uv.x, 0.0 ) ).xyz, c_luma );
    float right = dot( texture2D( tDiffuse, vUv + vec2( step_uv.x, 0.0 ) ).xyz, c_luma );
    float down = dot( texture2D( tDiffuse, vUv - vec2( 0.0, step_uv.y ) ).xyz, c_luma );
    float up = dot( texture2D( tDiffuse, vUv + vec2( 0.0, step_uv.y ) ).xyz, c_luma );

    vec2 slope = vec2( right - left, up - down );
    float steep = length( slope );

    float turn = radians( angle );
    float cosine = cos( turn );
    float sine = sin( turn );

    vec2 way = ( steep > c_epsilon ) ? slope / steep : vec2( 0.0 );
    way = vec2( way.x * cosine - way.y * sine, way.x * sine + way.y * cosine );

    float carry = mix( 1.0, smoothstep( 0.0, 0.25, steep ), clamp( ridge, 0.0, 1.0 ) );
    vec2 spread = way * carry * force * 0.01 * round_uv;

    float count = max( fetches, 2.0 );
    float count_inverse = 1.0 / count;
    float span_inverse = 1.0 / ( count - 1.0 );

    vec4 total = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = float( it ) * span_inverse - 0.5;
        total += texture2D( tDiffuse, vUv + spread * along );
    }

    gl_FragColor = total * count_inverse;
}`,
    controls: [
        { name: "force", type: "number", value: 26, min: 0, max: 200 },
        { name: "angle", type: "number", value: 0, min: 0, max: 360 },
        { name: "ridge", type: "number", value: 1, min: 0, max: 1 },
        { name: "softness", type: "number", value: 15, min: 1, max: 64 },
        { name: "fetches", type: "number", value: 128, min: 4, max: 128 }
    ]
} );
