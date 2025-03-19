/**
 * ShaderSources Module - Contains all shader source code
 */
const ShaderSources = (function () {
    // Basic shaders
    const basicVertexShader = `#version 300 es
in vec4 a_position;

void main() {
// Required: Transform vertex position to clip space
gl_Position = a_position;
}`;

    const basicFragmentShader = `#version 300 es
precision mediump float;

// Output variable - required in WebGL 2
out vec4 fragColor;

void main() {
// Set the fragment color
fragColor = vec4(1.0, 0.5, 0.2, 1.0); // Orange color
}`;

    // Varying variable shaders
    const varyingVertexShader = `#version 300 es
in vec4 a_position;
in vec4 a_color;

// Declare output to pass color to fragment shader
out vec4 v_color;

void main() {
// Required: Position transformation
gl_Position = a_position;

// Pass the color attribute to the fragment shader
v_color = a_color;
}`;

    const varyingFragmentShader = `#version 300 es
precision mediump float;

// Receive the varying from vertex shader
in vec4 v_color;

// Output variable
out vec4 fragColor;

void main() {
// Use the interpolated color
fragColor = v_color;
}`;

    // Uniform parameter shaders
    const uniformVertexShader = `#version 300 es
in vec4 a_position;

// Transformation matrix as uniform
uniform mat4 u_modelView;
uniform mat4 u_projection;

void main() {
// Transform position using matrices
gl_Position = u_projection * u_modelView * a_position;
}`;

    const uniformFragmentShader = `#version 300 es
precision mediump float;

// Color and time as uniform parameters
uniform vec4 u_color;
uniform float u_time;

// Output variable
out vec4 fragColor;

void main() {
// Apply pulsing effect using time
float pulse = 0.5 + 0.5 * sin(u_time * 3.0);

// Combine base color with pulse effect
fragColor = vec4(u_color.rgb * pulse, u_color.a);
}`;

    // Lighting shaders
    const lightingVertexShader = `#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelView;
uniform mat4 u_projection;
uniform mat3 u_normalMatrix;

// Pass normal and position to fragment shader
out vec3 v_normal;
out vec3 v_position;

void main() {
// Transform position
vec4 position = u_modelView * a_position;
gl_Position = u_projection * position;

// Transform normal and pass to fragment shader
v_normal = u_normalMatrix * a_normal;

// Pass position in view space to fragment shader
v_position = position.xyz;
}`;

    const lightingFragmentShader = `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_position;

uniform vec3 u_lightPosition;
uniform vec3 u_diffuseColor;
uniform vec3 u_ambientColor;

// Output variable
out vec4 fragColor;

void main() {
// Normalize the normal vector
vec3 normal = normalize(v_normal);

// Calculate light direction
vec3 lightDirection = normalize(u_lightPosition - v_position);

// Calculate diffuse lighting
float diffuseFactor = max(dot(normal, lightDirection), 0.0);

// Calculate final color with ambient and diffuse components
vec3 color = u_ambientColor + u_diffuseColor * diffuseFactor;

fragColor = vec4(color, 1.0);
}`;

    // Texture mapping shaders
    const textureVertexShader = `#version 300 es
in vec4 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
gl_Position = a_position;

// Pass texture coordinates to fragment shader
v_texCoord = a_texCoord;
}`;

    const textureFragmentShader = `#version 300 es
precision mediump float;

in vec2 v_texCoord;

uniform sampler2D u_texture;
uniform float u_time;

// Output variable
out vec4 fragColor;

void main() {
// Optional: Create a subtle animation effect
vec2 texCoord = v_texCoord;

// Sample the texture at the interpolated coordinates
// Note: texture2D() is replaced with texture() in WebGL 2
fragColor = texture(u_texture, texCoord);
}`;

    // Return shader sources
    return {
        basic: {
            vertex: basicVertexShader,
            fragment: basicFragmentShader,
        },
        varying: {
            vertex: varyingVertexShader,
            fragment: varyingFragmentShader,
        },
        uniform: {
            vertex: uniformVertexShader,
            fragment: uniformFragmentShader,
        },
        lighting: {
            vertex: lightingVertexShader,
            fragment: lightingFragmentShader,
        },
        texture: {
            vertex: textureVertexShader,
            fragment: textureFragmentShader,
        },
    };
})();
