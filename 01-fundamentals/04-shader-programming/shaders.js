/**
 * Shader code definitions
 * This file contains all shader code as JavaScript strings to avoid CORS issues
 * while maintaining separation of shader code from application logic.
 */

// Basic shader program (for examples 1 and 2)
const BASIC_VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec3 a_color;
varying vec3 v_color;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}`;

const BASIC_FRAGMENT_SHADER = `
precision mediump float;
varying vec3 v_color;

void main() {
    gl_FragColor = vec4(v_color, 1.0);
}`;

// Uniform shader program (for example 3)
const UNIFORM_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_position = a_position;
}`;

const UNIFORM_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_position;
uniform vec3 u_colorMultiplier;
uniform float u_time;

void main() {
    // Generate color based on position and time
    vec3 color = vec3(
        v_position.x * 0.5 + 0.5, 
        v_position.y * 0.5 + 0.5,
        sin(u_time) * 0.5 + 0.5
    );
    
    // Apply uniform color multiplier
    gl_FragColor = vec4(color * u_colorMultiplier, 1.0);
}`;
