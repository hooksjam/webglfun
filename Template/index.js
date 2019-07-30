var a_coords_loc       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer    // Buffer to hold the values for a_coords.
var a_size_loc
var a_size_buffer
var a_color_loc
var a_color_buffer

var u_diffuseColor     // Locations of uniform variables in the shader program
var u_specularColor
var u_specularExponent
var u_lightPosition
var u_modelview
var u_projection
var u_normalMatrix   

var projection = mat4.create()    // projection matrix
var modelview                    // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();  // matrix, derived from modelview matrix, for transforming normal vectors
var rotator  // A TrackballRotator to implement rotation by mouse.
var zoomer
var colors = [  // RGB color arrays for diffuse and specular color values, selected by popup menu
    [1,1,1], [1,0,0], [0,1,0], [0,0,1], [0,1,1], [1,0,1], [1,1,0], [0,0,0], [0.5,0.5,0.5]
];
var lightPositions = [  // values for light position, selected by popup menu
    [0,0,0,1], [0,0,1,0], [0,1,0,0], [0,0,-10,1], [2,3,5,0]
];
var objects = [  // Objects for display, selected by popup menu
    cube(5),
    uvTorus(3,1,64,32),
    uvCylinder(1.5,5.5),
    uvCone(2.5,5.5),
    uvSphere(3),
    uvSphere(3,12,6)
];
var currentModelNumber;  // contains data for the current object

var points = []
var coords = new Float32Array()
var colors = new Float32Array()
var normals = new Float32Array()

var scale = 1
var dt = 1000/60
var time = 0
var resetTimeout

function installModel(modelData) {
     gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_coords_loc);
     gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_normal_loc);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}


function loop() {
    draw()

    setTimeout(loop, dt)

    time += dt
}

function draw() { 
    // Multi Triangle
    gl.clearColor(0.2,0.2,0.2,1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(projection,Math.PI/5,1,10,20);
    modelview = rotator.getViewMatrix();

    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    var zoom = zoomer.getZoomScale()
    mat4.scale(modelview, modelview, vec3.fromValues(zoom,zoom,zoom))

    // Uniforms
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection ); 

    drawModel()
}

function drawModel() {
    mat3.normalFromMat4(normalMatrix, modelview);
    
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection );
    
    /* Draw the model.  The data for the model was set up in installModel() */
   
    gl.drawElements(gl.TRIANGLES, objects[currentModelNumber].indices.length, gl.UNSIGNED_SHORT, 0); 
}

function drawTris() {

    // Set up values for the "coords" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc); 
   
    // Set up values for the "color" attribute 
    gl.bindBuffer(gl.ARRAY_BUFFER, a_color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_color_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_color_loc); 

    gl.bindBuffer(gl.ARRAY_BUFFER, a_size_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, size, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_size_loc, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_size_loc); 

    // Draw the triangles. 
    gl.drawArrays(gl.POINTS, 0, points.length*3);
}

/* Initialize the WebGL context.  Called from init() */
function init() {
	console.log("Init")
	glInit((canvas) => {
		console.log(canvas)
		initPhong(canvas)
		// initBasic(canvas)

		rotator = new TrackballRotator(canvas, draw, 15)
		zoomer = new Zoomer(canvas)


		reset()
	    loop()
	})

	document.body.onkeyup = function(e){
	    if(e.keyCode == 32){
	    	reset()
	    }
	}	
}

function initBasic(canvas) {
    var prog = createProgram(gl,"basic-vshader-source","basic-fshader-source");
    gl.useProgram(prog);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_color_loc =  gl.getAttribLocation(prog, "a_color");
    a_color_buffer = gl.createBuffer();
    a_size_loc =  gl.getAttribLocation(prog, "a_size"); 
    a_size_buffer = gl.createBuffer(); 

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");    
    u_shift = gl.getUniformLocation(prog, "shift")

    gl.enable(gl.DEPTH_TEST);
}

function initPhong(canvas) {
    var prog = createProgram(gl,"phong-vshader-source","phong-fshader-source");
    gl.useProgram(prog);

    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_coords_buffer = gl.createBuffer();
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    a_normal_buffer = gl.createBuffer();

    index_buffer = gl.createBuffer();

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");

    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform4f(u_lightPosition, 0, 0, 0, 1);	

    installModel(objects[1]);
    currentModelNumber = 1; 
}

function reset() {
	if(resetTimeout)
		clearTimeout(resetTimeout)
	resetTimeout = setTimeout(reset, 1000)
}
