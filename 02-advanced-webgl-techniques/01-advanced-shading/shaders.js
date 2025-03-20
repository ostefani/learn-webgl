// GLSL Shader Code

// Basic Phong Shading
const basicVertexShader = `#version 300 es
precision highp float;

// Attributes (per-vertex inputs)
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Uniforms (global per-shader variables)
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

// Varyings (outputs to fragment shader)
out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    // Transform vertex position to world space
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vPosition = worldPosition.xyz;
    
    // Transform normal to world space
    vNormal = mat3(uNormalMatrix) * aNormal;
    
    // Pass through texture coordinates
    vTexCoord = aTexCoord;
    
    // Calculate clip space position
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
`;

const basicFragmentShader = `#version 300 es
precision highp float;

// Varyings (inputs from vertex shader)
in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;

// Uniforms
uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform sampler2D uDiffuseMap;

// Output
out vec4 fragColor;

void main() {
    // Material properties
    vec3 diffuseColor = texture(uDiffuseMap, vTexCoord).rgb;
    vec3 ambientColor = diffuseColor * 0.2;
    vec3 specularColor = vec3(1.0);
    float shininess = 32.0;
    
    // Normalize vectors
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vPosition);
    vec3 viewDir = normalize(uCameraPosition - vPosition);
    vec3 reflectDir = reflect(-lightDir, normal);
    
    // Calculate light attenuation
    float distance = length(uLightPosition - vPosition);
    float attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);
    
    // Calculate lighting components
    // Ambient
    vec3 ambient = ambientColor;
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * diffuseColor * uLightColor;
    
    // Specular (Blinn-Phong)
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
    vec3 specular = spec * specularColor * uLightColor;
    
    // Combine components
    vec3 result = ambient + (diffuse + specular) * attenuation;
    
    fragColor = vec4(result, 1.0);
}
`;

// Normal Mapping Shaders
const normalMapVertexShader = `#version 300 es
precision highp float;

// Attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;
in vec3 aTangent;

// Uniforms
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

// Varyings
out vec3 vPosition;
out vec2 vTexCoord;
out mat3 vTBN;  // Tangent-Bitangent-Normal matrix

void main() {
    // Transform vertex position to world space
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vPosition = worldPosition.xyz;
    
    // Pass through texture coordinates
    vTexCoord = aTexCoord;
    
    // Calculate TBN matrix for normal mapping
    vec3 N = normalize(mat3(uNormalMatrix) * aNormal);
    vec3 T = normalize(mat3(uNormalMatrix) * aTangent);
    // Re-orthogonalize T with respect to N
    T = normalize(T - dot(T, N) * N);
    // Calculate bitangent
    vec3 B = cross(N, T);
    
    // Create TBN matrix
    vTBN = mat3(T, B, N);
    
    // Calculate clip space position
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
`;

const normalMapFragmentShader = `#version 300 es
precision highp float;

// Varyings (inputs from vertex shader)
in vec3 vPosition;
in vec2 vTexCoord;
in mat3 vTBN;

// Uniforms
uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;

// Output
out vec4 fragColor;

void main() {
    // Sample textures
    vec3 diffuseColor = texture(uDiffuseMap, vTexCoord).rgb;
    vec3 ambientColor = diffuseColor * 0.2;
    vec3 specularColor = vec3(1.0);
    float shininess = 32.0;
    
    // Sample normal map and transform to [-1, 1]
    vec3 normalMap = texture(uNormalMap, vTexCoord).rgb * 2.0 - 1.0;
    
    // Transform normal from tangent space to world space using TBN matrix
    vec3 normal = normalize(vTBN * normalMap);
    
    // Calculate lighting vectors
    vec3 lightDir = normalize(uLightPosition - vPosition);
    vec3 viewDir = normalize(uCameraPosition - vPosition);
    
    // Calculate light attenuation
    float distance = length(uLightPosition - vPosition);
    float attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);
    
    // Calculate lighting components
    // Ambient
    vec3 ambient = ambientColor;
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * diffuseColor * uLightColor;
    
    // Specular (Blinn-Phong)
    vec3 halfwayDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
    vec3 specular = spec * specularColor * uLightColor;
    
    // Combine components
    vec3 result = ambient + (diffuse + specular) * attenuation;
    
    fragColor = vec4(result, 1.0);
}
`;

// PBR Shading
const pbrVertexShader = `#version 300 es
precision highp float;

// Attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;

// Uniforms
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

// Varyings
out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {
    // Transform vertex position to world space
    vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
    vPosition = worldPosition.xyz;
    
    // Transform normal to world space
    vNormal = mat3(uNormalMatrix) * aNormal;
    
    // Pass through texture coordinates
    vTexCoord = aTexCoord;
    
    // Calculate clip space position
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
`;

const pbrFragmentShader = `#version 300 es
precision highp float;

// Varyings (inputs from vertex shader)
in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;

// Uniforms
uniform vec3 uCameraPosition;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform sampler2D uAlbedoMap;
uniform sampler2D uMetallicMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uAoMap;

// Output
out vec4 fragColor;

const float PI = 3.14159265359;

// PBR functions
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    
    float numerator = a2;
    float denominator = (NdotH2 * (a2 - 1.0) + 1.0);
    denominator = PI * denominator * denominator;
    
    return numerator / max(denominator, 0.0000001);
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    
    float numerator = NdotV;
    float denominator = NdotV * (1.0 - k) + k;
    
    return numerator / max(denominator, 0.0000001);
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx1 = GeometrySchlickGGX(NdotV, roughness);
    float ggx2 = GeometrySchlickGGX(NdotL, roughness);
    
    return ggx1 * ggx2;
}

vec3 FresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(max(1.0 - cosTheta, 0.0), 5.0);
}

void main() {
    // Material properties from textures
    vec3 albedo = texture(uAlbedoMap, vTexCoord).rgb;
    float metallic = texture(uMetallicMap, vTexCoord).r;
    float roughness = texture(uRoughnessMap, vTexCoord).r;
    float ao = texture(uAoMap, vTexCoord).r;
    
    // Normalize vectors
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPosition - vPosition);
    
    // Calculate reflectance at normal incidence (F0)
    // For metals, F0 is the albedo color
    // For dielectrics, F0 is 0.04
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo, metallic);
    
    // Initialize lighting output
    vec3 Lo = vec3(0.0);
    
    // Calculate per-light radiance
    vec3 L = normalize(uLightPosition - vPosition);
    vec3 H = normalize(V + L);
    float distance = length(uLightPosition - vPosition);
    float attenuation = 1.0 / (distance * distance);
    vec3 radiance = uLightColor * attenuation;
    
    // Cook-Torrance BRDF
    float NDF = DistributionGGX(N, H, roughness);
    float G = GeometrySmith(N, V, L, roughness);
    vec3 F = FresnelSchlick(max(dot(H, V), 0.0), F0);
    
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
    vec3 specular = numerator / max(denominator, 0.0000001);
    
    // Add to outgoing radiance Lo
    float NdotL = max(dot(N, L), 0.0);
    Lo += (kD * albedo / PI + specular) * radiance * NdotL;
    
    // Add ambient lighting
    vec3 ambient = vec3(0.03) * albedo * ao;
    
    // Final color
    vec3 color = ambient + Lo;
    
    // Tone mapping (HDR to LDR)
    color = color / (color + vec3(1.0));
    
    // Gamma correction
    color = pow(color, vec3(1.0/2.2));
    
    fragColor = vec4(color, 1.0);
}
`;
