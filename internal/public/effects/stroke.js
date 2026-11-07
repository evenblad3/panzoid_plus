window.pz_effects.push( {
    id: "stroke",
    name: "Stroke",
    desc: "todo description",
    tab: pz_tabs.outline,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform vec3 tint;
uniform float width;
uniform float feather;
uniform float fetches;

varying vec2 vUv;
varying vec2 vUvScaled;

const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches_max = 512;

void main() {
    vec4 texel = texture2D( tDiffuse, vUvScaled );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 round_uv = vec2( resolution.y / resolution.x, 1.0 );
    vec2 spread = width * 0.01 * round_uv;

    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    float nearest = 1.0;

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = sqrt( ( float( it ) + 0.5 ) * count_inverse );
        float spin = float( it ) * c_golden_angle;
        vec2 offset = vec2( cos( spin ), sin( spin ) ) * along * spread;

        if( texture2D( tDiffuse, vUvScaled + offset ).w > 0.5 ) {
            nearest = min( nearest, along );
        }
    }

    float soft = max( clamp( feather, 0.0, 1.0 ), c_epsilon );
    float ink = ( 1.0 - smoothstep( 1.0 - soft, 1.0, nearest ) )
        * ( 1.0 - texel.w ) * clamp( force, 0.0, 1.0 );

    float alpha = texel.w + ink;

    gl_FragColor = ( alpha > 0.0 )
        ? vec4( ( texel.xyz * texel.w + tint * ink ) / alpha, alpha )
        : texel;
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "width", type: "number", value: 2, min: 0, max: 8 },
        { name: "feather", type: "number", value: 0.2, min: 0, max: 1 },
        { name: "fetches", type: "number", value: 256, min: 8, max: 512 }
    ]
} );
