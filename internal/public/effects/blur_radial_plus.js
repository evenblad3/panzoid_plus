window.pz_effects.push( {
    id: "blur_radial_plus",
    name: "Blur Radial+",
    desc: "todo description",
    tab: pz_tabs.blur,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 center;
uniform float force;
uniform float thickness;
uniform float fetches;

varying vec2 vUv;

const int c_fetches_max = 128;

void main() {
    float count = max( fetches, 1.0 );
    float count_inverse = 1.0 / count;

    vec4 total = vec4( 0.0 );

    for( int it = 0; it < c_fetches_max; ++it ) {
        if( float( it ) >= count ) break;

        float along = float( it ) * count_inverse;
        total += texture2D( tDiffuse, vUv + ( center - vUv ) * along * along * force );
    }

    gl_FragColor = total * thickness * count_inverse;
}`,
    controls: [
        { name: "force", type: "number", value: 0.4, min: 0, max: 1 },
        { name: "center", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "thickness", type: "number", value: 1, min: 0.1, max: 2 },
        { name: "fetches", type: "number", value: 128, min: 8, max: 128 }
    ]
} );
