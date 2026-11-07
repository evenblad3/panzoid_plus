window.pz_effects.push( {
    id: "ascii",
    name: "Ascii",
    desc: "todo description",
    tab: pz_tabs.stylize,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform float force;
uniform float scale;

varying vec2 vUv;

const vec3 c_luma = vec3( 0.3, 0.59, 0.11 );

void main() {
    vec2 texel_size = vUv / gl_FragCoord.xy;
    vec2 pixel = gl_FragCoord.xy;

    float cell = 8.0 * scale;
    vec3 color = texture2D( tDiffuse, floor( pixel / cell ) * cell * texel_size ).xyz;

    float grey = dot( color, c_luma );

    float bits = 4096.0;
    if( grey > 0.05 ) bits = 215.0;
    if( grey > 0.1 ) bits = 899.0;
    if( grey > 0.15 ) bits = 2523.0;
    if( grey > 0.2 ) bits = 65600.0;
    if( grey > 0.25 ) bits = 163153.0;
    if( grey > 0.3 ) bits = 321476.0;
    if( grey > 0.35 ) bits = 669792.0;
    if( grey > 0.4 ) bits = 15255086.0;
    if( grey > 0.45 ) bits = 46204812.0;
    if( grey > 0.5 ) bits = 13121101.0;
    if( grey > 0.55 ) bits = 31759849.0;
    if( grey > 0.6 ) bits = 15252014.0;
    if( grey > 0.65 ) bits = 26098780.0;
    if( grey > 0.7 ) bits = 13195790.0;
    if( grey > 0.75 ) bits = 18146145.0;
    if( grey > 0.8 ) bits = 11512810.0;
    if( grey > 0.85 ) bits = 24086588.0;
    if( grey > 0.9 ) bits = 33550336.0;
    if( grey > 0.95 ) bits = 50331647.0;

    vec2 spot = floor( ( mod( pixel / ( 4.0 * scale ), 2.0 ) - 1.0 ) * vec2( -4.0, 4.0 ) + 2.5 );

    float lit = 0.0;
    if( clamp( spot.x, 0.0, 4.0 ) == spot.x && clamp( spot.y, 0.0, 4.0 ) == spot.y ) {
        lit = ( mod( floor( bits / pow( 2.0, spot.x + spot.y * 5.0 ) ), 2.0 ) == 1.0 ) ? 1.0 : 0.0;
    }

    vec4 made = vec4( color * lit, 1.0 );

    gl_FragColor = mix( texture2D( tDiffuse, vUv ), made, clamp( force, 0.0, 1.0 ) );
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 1 },
        { name: "scale", type: "number", value: 1, min: 1, max: 8 }
    ]
} );
