const canvas = document.getElementById('webgl-canvas');
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl2');

// Just set a solid background color
gl.clearColor(0.2, 0.0, 0.4, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Draw a single triangle with a solid color
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(
    vertexShader,
    `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`
);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(
    fragmentShader,
    `
  precision mediump float;
  void main() {
    gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
  }
`
);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Just a simple triangle
const positions = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.drawArrays(gl.TRIANGLES, 0, 3);
