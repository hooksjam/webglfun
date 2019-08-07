var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var a_size_loc;
var a_size_buffer;
var a_color_loc;
var a_color_buffer;

var u_modelview;
var u_projection;

var projection = mat4.create();    // projection matrix
var modelview;                     // modelview matrix; value comes from rotator
var rotator;  // A TrackballRotator to implement rotation by mouse.

var points = []
var coords = new Float32Array()
var colors = new Float32Array()
var size = new Float32Array()

var nextQueue = [{prev:null, point:vec2.fromValues(0,0)}]
var visited = {}
var chance = 1
var len = 0
var totalLimit = 1000000

var dt = 1000/60
var rate = 2000


//var scale = 0.075
var scale = 0.015
var maxDist = 400
var spinTime = 100
var spinCount = 0.5 
var resetTime = 6000
var resetTimeout

var updateList = []

var time = 0

var colorCounter = 0
// change every x points
var colorChange = 10000
var prevColor
var color
function newColor() {
	prevColor = color
	color = vec3.fromValues(
		Math.pow(Math.random(), Math.random()), 
		Math.pow(Math.random(), Math.random()), 
		Math.pow(Math.random(), Math.random()))
}
newColor()
newColor()

function genTriangles(limit = -1) {
	i = 0
	while(nextQueue.length > 0) {
		i += 1
		if(i > limit || len >= totalLimit)
			break

		var obj = nextQueue.shift()
		if(obj == null)
		{
			console.log("STACK OBJECT EMPTY!!!!")
			continue
		}
		var prev = obj.prev
		var point = obj.point
		var x = point[0]
		var y = point[1]
		var visitString = x + "," + y

		// Don't loop
		if(visitString in visited)
			continue

		// Add tris
		colorCounter += 1
		if(colorCounter > colorChange)
		{
			newColor()
			colorCounter = 0
		}

		var f = colorCounter/colorChange
		var calcColor = vec3.fromValues(
			lerp(prevColor[0], color[0], f),
			lerp(prevColor[1], color[1], f),
			lerp(prevColor[2], color[2], f))

		// Tree maintenance
		var node = {
			next:[],
			point:point,
			life:spinTime+dt*(i/limit),
			i:len,
			color:calcColor
		}
		if(prev)
			prev.next.push(visitString)

		visited[x + "," + y] = node
		updateList.push(node)

		len += 1

		// Direction we travel depends on whether we're flipped up or down, this is determined by the grid offset
		// yes = (0,0) (2,0), (1,1)
		// no = (1,0) (3,0)
		var dir = (Math.abs(point[0])+Math.abs(point[1]))%2

		var next
		if(dir == 0)
			next = [0, 2, 3]
		else
			next = [0, 1, 2]

		shuffle(next)
		next.pop()

		for(let j = 0; j < next.length; j++)
		{
			//if(Math.random() < Math.pow(chance*Math.max(0,(limit-i)/limit), 0.5))
			var c = 0.5
			if(Math.random() < lerp(0.5, 0.96, Math.pow(Math.max(0, (totalLimit-len)/totalLimit), c))) {
				switch (next[j]) {
					case 0:
						nextQueue.push({prev:node, point: vec3.fromValues(x+1, y,0)})
						break
					case 1:
						nextQueue.push({prev:node, point:vec3.fromValues(x, y+1,0)})
						break
					case 2:
						nextQueue.push({prev:node, point:vec3.fromValues(x-1, y,0)})
						break
					case 3:
						nextQueue.push({prev:node, point:vec3.fromValues(x, y-1,0)})
						break
				}
			}
		}
	}
}

function drawTriangles() {

	traverseStack = []
	// Traverse
	traverseStack.push(visited["0,0"])

	var offsetX = 1
	var offsetY = 1 
	for(let i = 0; i < updateList.length; i++) {
		var node = updateList[i]
		var position = node.point
		// var position = vec3.fromValues(node.point[0]*offsetX, node.pointpoint[1]*offsetY, 0) 
		if(node.life > 0) {
			node.life = Math.max(node.life - dt, 0)
		} else {
			updateList.splice(i, 1)
			i--
		}

		var f = Math.pow((spinTime-Math.min(node.life,spinTime))/spinTime, 2);
		size[node.i] = scale*84;

		var of = node.i*3
		coords[of + 0] = position[0]
		coords[of + 1] = position[1]
		coords[of + 2] = position[2]

		colors[of + 0] = lerp(0.2, node.color[0], f)
		colors[of + 1] = lerp(0.2, node.color[1], f)
		colors[of + 2] = lerp(0.2, node.color[2], f)
	}	
}

function loop() {
    draw()

	genTriangles(rate)

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

    // Uniforms
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection ); 

    // Main coordinates
    drawTriangles()

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
    gl.drawArrays(gl.POINTS, 0, len); 
}

/* Initialize the WebGL context.  Called from init() */
function init() {
	console.log("Init")
	glInit(() => {
	    var prog = createProgram(gl,"basic-vshader-source","basic-fshader-source");
	    gl.useProgram(prog);
	    gl.enable(gl.DEPTH_TEST);

	    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
	    a_coords_buffer = gl.createBuffer();
	    a_color_loc =  gl.getAttribLocation(prog, "a_color");
	    a_color_buffer = gl.createBuffer();
	    a_size_loc =  gl.getAttribLocation(prog, "a_size"); 
	    a_size_buffer = gl.createBuffer(); 
	    console.log("SIZE" + a_size_loc)
	    console.log("CORD" + a_coords_loc)
	    console.log("COLOR" + a_color_loc)

	    index_buffer = gl.createBuffer();

	    u_modelview = gl.getUniformLocation(prog, "modelview");
	    u_projection = gl.getUniformLocation(prog, "projection");    
	    u_shift = gl.getUniformLocation(prog, "shift")

    	rotator = new TrackballRotator(canvas, draw, 15);

		coords = new Float32Array(totalLimit*3)
		colors = new Float32Array(totalLimit*3)
		size = new Float32Array(totalLimit)

		reset()
	    loop()
	})

	document.body.onkeyup = function(e){
	    if(e.keyCode == 32){
	    	reset()
	    }
	}	
}

function reset() {
    len = 0
    time = 0
	nextQueue = [{prev:null, point:vec3.fromValues(0,0,0)}]
	visited = {}
	loopTimout = null

	if(resetTimeout)
		clearTimeout(resetTimeout)
	resetTimeout = setTimeout(reset, resetTime)
}
