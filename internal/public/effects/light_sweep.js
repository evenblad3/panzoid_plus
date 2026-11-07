window.pz_effects.push( {
    id: "light_sweep",
    name: "Light sweep",
    desc: "todo description",
    tab: pz_tabs.light,
    shader: `precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 position;
uniform float angle;
uniform float width;
uniform float feather;
uniform float force;
uniform vec3 tint;

varying vec2 vUv;

const float c_epsilon = 1.0e-6;

void main() {
    vec4 texel = texture2D( tDiffuse, vUv );

    vec2 resolution = gl_FragCoord.xy / max( vUv, vec2( c_epsilon ) );
    float aspect = resolution.x / resolution.y;

    float turn = radians( angle );
    float cosine = cos( turn );
    float sine = sin( turn );

    vec2 from_position = ( vUv - position ) * vec2( aspect, 1.0 );
    float across = dot( from_position, vec2( -sine, cosine ) );

    float half_feather = max( feather, c_epsilon ) * 0.5;
    float band = smoothstep( half_feather, -half_feather, abs( across ) - width * 0.025 );

    gl_FragColor = texel + vec4( tint, 1.0 ) * band * force * texel.w;
}`,
    controls: [
        { name: "force", type: "number", value: 1, min: 0, max: 6 },
        { name: "tint", type: "color", value: [ 1, 1, 1 ] },
        { name: "position", type: "vec2", value: [ 0.5, 0.5 ], min: -1, max: 2 },
        { name: "width", type: "number", value: 0.5, min: 0, max: 6 },
        { name: "angle", type: "number", value: 110, min: 0, max: 360 },
        { name: "feather", type: "number", value: 0.2, min: 0, max: 1 }
    ]
} );
