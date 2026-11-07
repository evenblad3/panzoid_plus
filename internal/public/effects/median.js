window.pz_effects.push( {
    id: "median",
    name: "Median",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float radius;
uniform float alpha_too;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.2126, 0.7152, 0.0722 );
const float c_golden_angle = 2.39996323;
const float c_epsilon = 1.0e-6;
const int c_fetches = 49;

vec2 spot( int it ) {
    float along = sqrt( ( float( it ) + 0.5 ) / float( c_fetches ) );
    float angle = float( it ) * c_golden_angle;
    return vec2( cos( angle ), sin( angle ) ) * along;
}

void main() {
    vec4 keep = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    vec2 reach = max( radius, 1.0 ) / resolution;

    float brightness[ c_fetches ];

    for( int it = 0; it < c_fetches; ++it ) {
        brightness[ it ] = dot( texture2D( tDiffuse, vUv + spot( it ) * reach ).xyz, c_luma );
    }

    int middle = 0;
    int closest = c_fetches;

    for( int it = 0; it < c_fetches; ++it ) {
        int below = 0;

        for( int other = 0; other < c_fetches; ++other ) {
            if( brightness[ other ] < brightness[ it ] ) below += 1;
        }

        int gap = below - c_fetches / 2;
        if( gap < 0 ) gap = -gap;

        if( gap < closest ) {
            closest = gap;
            middle = it;
        }
    }

    vec4 picked = texture2D( tDiffuse, vUv + spot( middle ) * reach );

    vec4 made = vec4( picked.xyz, mix( keep.w, picked.w, clamp( alpha_too, 0.0, 1.0 ) ) );

    gl_FragColor = mix( keep, made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "radius", type: "number", value: 9, min: 1, max: 64 },
        { name: "alpha_too", type: "number", value: 0, min: 0, max: 1 }
    ]
} );
