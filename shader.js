const fragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

const float FOV = 1.000;
const int RAY_MAX_STEPS = 256;
const float RAY_MAX_DISTANCE = 500.000;
const float EPSILON = 0.01;


// Some useful functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }



float snoise(vec2 v) {

    // Precompute values for skewed triangular grid
    const vec4 C = vec4(0.211324865405187,
                        // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,
                        // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,
                        // -1.0 + 2.0 * C.x
                        0.024390243902439);
                        // 1.0 / 41.0

    // First corner (x0)
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other two corners (x1, x2)
    vec2 i1 = vec2(0.0);
    i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    // Do some permutations to avoid
    // truncation effects in permutation
    i = mod289(i);
    vec3 p = permute(
            permute( i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(
                        dot(x0,x0),
                        dot(x1,x1),
                        dot(x2,x2)
                        ), 0.0);

    m = m*m ;
    m = m*m ;

    // Gradients:
    //  41 pts uniformly over a line, mapped onto a diamond
    //  The ring size 17*17 = 289 is close to a multiple
    //      of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt(a0*a0 + h*h);
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

    // Compute final noise value at P
    vec3 g = vec3(0.0);
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
    return 130.0 * dot(m, g);
}



float noiseSdSphere(vec3 p, float s) {
    return length(p)- s + snoise(vec2(sin(2. * p.x + u_time), cos(2. * p.y + u_time))) / 20.312;
}


vec2 map(vec3 p) {    
    float sphereDist = noiseSdSphere(p - vec3(0., 0., -1.5), 0.5);
    vec2 sphere = vec2(sphereDist, 1.0);

    return sphere;;
}



vec3 getNormal(vec3 p) {
    vec2 e = vec2(EPSILON, 0.);
     vec3 n = vec3(map(p).x) - vec3(map(p - e.xyy).x, map(p - e.yxy).x, map(p - e.yyx).x);
    return normalize(n);
}

vec2 rayMarch(vec3 rayOut, vec3 rayDirection) {
    vec2 hit, object;
    for(int i = 0; i < RAY_MAX_STEPS; i++) {
        vec3 p = rayOut + object.x * rayDirection;
        hit = map(p);
        object.x += hit.x;
        object.y = hit.y;
        if(object.x > RAY_MAX_DISTANCE || abs(hit.x) < EPSILON ) break;
    }

    return object;
}

vec3 getLight(vec3 p, vec3 rayDirection, vec3 color) {
    vec3 lightPos = vec3(10.0, 55.0, -20.0);
    vec3 L = normalize(lightPos - p);
    vec3 N = getNormal(p);
    vec3 V = -rayDirection;
    vec3 R = reflect(-L, N);

    vec3 specColor = vec3(0.5);
    vec3 specular = specColor * pow(clamp(dot(R, V), 0.0, 1.0), 10.0);
    vec3 diffuse = color * clamp(dot(L, N), 0.0, 1.0);
    vec3 ambient = color * 0.05;
    vec3 fresnel = 0.25 * color * pow(1.0 + dot(rayDirection, N), 3.0);

    float d = rayMarch(p + N * 0.02, normalize(lightPos)).x;
    if (d < length(lightPos - p)) return ambient + fresnel;

    return diffuse + ambient + specular + fresnel;
}


void render(inout vec3 color, in vec2 uv) {
    vec3 rayOut = vec3(0.0, 0.0, -3.0);
    vec3 rayDirection = normalize(vec3(uv, FOV));

    vec2 object = rayMarch(rayOut, rayDirection);

    if(object.x < RAY_MAX_DISTANCE){
        vec3 p = rayOut + object.x * rayDirection;
            color += getLight(p, rayDirection, vec3(1));

    }
}

void main() {
    vec2 uv = (gl_FragColor.xy - u_resolution.xy) / u_resolution.y;
    vec2 st = gl_FragCoord.xy/u_resolution.xy - 0.5;

    vec3 color;
    render(color, st);

    gl_FragColor = vec4(color,1.0);
}
`