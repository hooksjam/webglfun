var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var a_normal_loc;       // Location of a_normal attribute.
var a_normal_buffer;    // Buffer for a_normal.
var index_buffer;       // Buffer to hold vetex indices from model.
var a_color_loc;
var a_color_buffer;

var u_modelview;
var u_projection;
var u_normalMatrix;    
var u_shift;

var projection = mat4.create();    // projection matrix
var modelview;                     // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();  // matrix, derived from modelview matrix, for transforming normal vectors
var rotator;  // A TrackballRotator to implement rotation by mouse.

var points = []
var coords = new Float32Array()
var colors = new Float32Array()
var normals = new Float32Array()

var nextQueue = [{prev:null, point:vec2.fromValues(0,0)}]
var visited = {}
var chance = 1
var len = 0
var totalLimit = 50000//10000
var rate = 1000
//var scale = 0.075
var scale = 0.04
var maxDist = 300
var spinTime = 100
var spinCount = 0.5 
var resetTime = 4000
var resetTimeout

var time = 0
var dt = 1000/60

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

		// Tree maintenance
		var node = {
			next:[],
			point:point,
			transform: mat4.create(),
			life:spinTime+dt*(i/limit)
		}
		if(prev)
			prev.next.push(visitString)

		visited[x + "," + y] = node
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
			if(Math.random() < lerp(0.5, 0.98, Math.pow(Math.max(0, (totalLimit-len)/totalLimit), c))) {
				switch (next[j]) {
					case 0:
						nextQueue.push({prev:node, point: vec2.fromValues(x+1, y)})
						break
					case 1:
						nextQueue.push({prev:node, point:vec2.fromValues(x, y+1)})
						break
					case 2:
						nextQueue.push({prev:node, point:vec2.fromValues(x-1, y)})
						break
					case 3:
						nextQueue.push({prev:node, point:vec2.fromValues(x, y-1)})
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
	i = 0

	var offsetX = 0.57736720554
	var offsetY = 0.5
	while(traverseStack.length > 0) {
		var node = traverseStack.pop()
		if(node == null) {
			console.log("Traversal obj empty")
			continue
		}
		var point = node.point
		var transform = mat4.create()//node.transform
		// pushTransform(transform)

		var f = Math.pow((spinTime-Math.min(node.life,spinTime))/spinTime, 2);
		// mat4.rotateY(transform, transform, Math.PI/2 + (Math.PI*0.5)*f)
		// mat4.multiplyScalar(transform, transform, 10)
		mat4.scale(transform, transform, vec3.fromValues(f,f,f))

		// Make triangle with this point
		var position = vec3.fromValues(point[0]*offsetX, point[1]*offsetY*2, 0) 
		// Modify to fit triangle ratio
		var dist = (Math.abs(point[0])+Math.abs(point[1]))
		var dir = dist%2
		var of = i*9
		var a,b,c

		if(node.life > 0)
		{
			node.life = Math.max(node.life - dt, 0)
		}

		if(dir == 0) {
			a = vec3.fromValues(-offsetX, -offsetY, 0)
			a = vec3.transformMat4(a, a, transform)
			a = vec3.add(a, a, position)	

			b = vec3.fromValues(offsetX, -offsetY, 0)
			b = vec3.transformMat4(b, b, transform)
			b = vec3.add(b, b, position)	

			c = vec3.fromValues(0, offsetY, 0)
			c = vec3.transformMat4(c, c, transform)
			c = vec3.add(c, c, position)	
		} else {
			a = vec3.fromValues(-offsetX, offsetY, 0)
			a = vec3.transformMat4(a, a, transform)
			a = vec3.add(a, a, position)
			
			b = vec3.fromValues(0, -offsetY, 0)
			b = vec3.transformMat4(b, b, transform)
			b = vec3.add(b, b, position)

			c = vec3.fromValues(offsetX, offsetY, 0)
			c = vec3.transformMat4(c, c, transform)
			c = vec3.add(c, c, position)	
		}

		// transform = popTransform()

		coords[of] = a[0]
		coords[of+1] = a[1]
		coords[of+2] = a[2]
		coords[of+3] = b[0]
		coords[of+4] = b[1]
		coords[of+5] = b[2]
		coords[of+6] = c[0]
		coords[of+7] = c[1]
		coords[of+8] = c[2]	

		var r = lerp(0.8, 0.2, Math.min(dist/maxDist, 1))
		var g = r
		var b = r

		colors[of + 0] = r
		colors[of + 1] = g
		colors[of + 2] = b
		colors[of + 3] = r
		colors[of + 4] = g
		colors[of + 5] = b
		colors[of + 6] = r
		colors[of + 7] = g
		colors[of + 8] = b

		normals[of + 0] = 0
		normals[of + 1] = 0
		normals[of + 2] = 1
		normals[of + 3] = 0
		normals[of + 4] = 0
		normals[of + 5] = 1
		normals[of + 6] = 0
		normals[of + 7] = 0
		normals[of + 8] = 1

		i += 1

		for(let j = 0; j < node.next.length; j++) {
			var next = node.next[j]
			var nextString = next//next[0].toString()+","+next[1].toString()
			if(nextString in visited)
				traverseStack.push(visited[nextString])
			else
				console.log("ERROR " + nextString + " not in visited")
		}
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
    gl.uniform1f(u_shift, 0); 

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

    gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STREAM_DRAW);
    gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_normal_loc); 

    // Draw the triangles. 
    gl.drawArrays(gl.TRIANGLES, 0, len*3); 
}

/* Initialize the WebGL context.  Called from init() */
function init() {
	console.log("Init")
	glInit((canvas) => {
	    var prog = createProgram(gl,"basic-vshader-source","basic-fshader-source");
	    gl.useProgram(prog);
	    gl.enable(gl.DEPTH_TEST);

	    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
	    a_coords_buffer = gl.createBuffer();
	    a_color_loc =  gl.getAttribLocation(prog, "a_color");
	    a_color_buffer = gl.createBuffer();

	    a_normal_loc =  gl.getAttribLocation(prog, "a_normal"); 
	    console.log("NORMAL" + a_normal_loc)
	    console.log("CORD" + a_coords_loc)
	    console.log("COLOR" + a_color_loc)
	    a_normal_buffer = gl.createBuffer(); 

	    index_buffer = gl.createBuffer();

	    u_modelview = gl.getUniformLocation(prog, "modelview");
	    u_projection = gl.getUniformLocation(prog, "projection");    
	    u_shift = gl.getUniformLocation(prog, "shift")

    	rotator = new TrackballRotator(canvas, draw, 15);

		coords = new Float32Array(totalLimit*9)
		colors = new Float32Array(totalLimit*9)
		normals = new Float32Array(totalLimit*9)



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
	nextQueue = [{prev:null, point:vec2.fromValues(0,0)}]
	visited = {}

	if(resetTimeout)
		clearTimeout(resetTimeout)
	resetTimeout = setTimeout(reset, resetTime)
}
