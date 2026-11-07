window.pz_effects.push( {
    id: "ghost",
    name: "Ghost",
    desc: "todo description",
    tab: pz_tabs.light,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform vec2 position;
uniform float shrink;
uniform float feather;
uniform float fetches;

varying vec2 vUv;

const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 128;

void main() {
    vec4 color = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );
    vec2 spread = feather * round_uv;

    vec2 pulled = position + ( vUv - position ) * max( 1.0 - shrink, c_epsilon );

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    vec4 copy = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;
        vec2 at = pulled + vec2( cos( spin ), sin( spin ) ) * along * spread;

        copy += ( at.x < 0.0 || at.x > 1.0 || at.y < 0.0 || at.y > 1.0 )
            ? vec4( 0.0 )
            : texture2D( tDiffuse, at );
    }

    copy *= count_inverse;

    float shade = copy.w * clamp( force, 0.0, 1.0 );
    float alpha = shade + color.w * ( 1.0 - shade );

    gl_FragColor = ( alpha > 0.0 )
        ? vec4( ( copy.xyz * tint * shade + color.xyz * color.w * ( 1.0 - shade ) ) / alpha,
            alpha )
        : color;
}`,
    controls: [
        { name: "force", type: "number", value: 0.6, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "position", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "shrink", type: "number", value: 0.4, min: -1, max: 0.9 },
        { name: "feather", type: "number", value: 0.01, min: 0, max: 0.25 },
        { name: "fetches", type: "number", value: 128, min: 1, max: 128 }
    ]
} );
