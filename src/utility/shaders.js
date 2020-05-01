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

    float random (in vec2 st) { 
        return fract(sin(dot(st.xy,vec2(12.9898,78.233)))
            * 43758.5453123);
    }

    float n( in vec2 p )
    {
        vec2 i = floor( p );
        vec2 f = fract( p );
        
        vec2 u = f*f*(3.0-2.0*f);

        return mix( mix( random( i + vec2(0.0,0.0) ), 
                        random( i + vec2(1.0,0.0) ), u.x),
                    mix( random( i + vec2(0.0,1.0) ), 
                        random( i + vec2(1.0,1.0) ), u.x), u.y);
    }

    void main( void ) {
        float t = u_time;
        
        vec2 p = vUv - 0.5;
        p.x=dot(p,p*2.0);
        vec2 q = vec2(n(p));
        #define d p = vec2( n(vec2(p.x+cos(n(p+t)), p.y+sin(n(p+t)))) );
        #define d2 p = abs(p+q/p-q) / dot(p, p)-n(q+t);
        d;
        d2;
        
        
        float c1 = float(pow(p-q, q/p));
        
        float c = length(c1);
        gl_FragColor = 0.9 * vec4(my_r, my_g, my_b, c);

    }
`;

export { vertexShader, fragmentShader };
