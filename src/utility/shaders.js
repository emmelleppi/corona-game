const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0) ;
    }
`;

const fragmentShader = `
    #ifdef GL_ES
    precision mediump float;
    #endif
    
    #extension GL_OES_standard_derivatives : enable

    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float my_r;
    uniform float my_g;
    uniform float my_b;
    varying vec2 vUv;

    float circle(in vec2 _st, in float _radius, in float t){
        vec2 dist = _st - vec2(0.5 * sin(t), 0.5 * cos(t));
        return 1. - smoothstep(_radius - (_radius * 0.858),
                             _radius + (_radius * 0.01),
                             dot(dist, dist) * 4.0);
    }

    void main( void ) {
        float t = u_time;
        
        vec2 p = 2.0 * (vUv - 0.5);
        float color = circle(p, 0.01 + (sin(t * 10.0) + 1.0) * 0.2, t * 9.);
        color += circle(p, 0.01 + (cos(t * 5.0) + 1.0) * 0.2, t * 6.);
        color += circle(p, 0.01 + (sin(t * 2.0) + 1.0) * 0.2, t * 3.);
        gl_FragColor = 1.0 * vec4(my_r, my_g, my_b, color);
    }
`;

export { vertexShader, fragmentShader };
