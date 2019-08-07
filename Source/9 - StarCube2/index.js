var projection = mat4.create()  // projection matrix
var modelview = mat4.create()   // modelview matrix; value comes from rotator
var normalMatrix = mat3.create()    // matrix, derived from modelview matrix, for transforming normal vectors

var scale = 1
var dt = 1000/60
var time = 0

var fieldSize = 100000
var seeds 
var freqMin = 0.1 
var freqMax = 4
var sizeMin = 0.1
var sizeMax = 2
var frequencies = []

var sampleColors = [
    0.349, 0.453, 0.651,
    0.761, 0.592, 0.353,
    0.235, 0.159, 0.159,
    0.110, 0.110, 0.141,
    0.816, 0.816, 0.899,
    0.827, 0.69, 0.384, 
    0.592, 0.701, 0.773]

var texture
var framebuffer

var field = null
var cube = null

//'5976a6', 'c2975a', '3c2d2a', '1c1c24', 'd0cee5', 'd3b062', '97b3c5']
/* Initialize the WebGL context.  Called from init() */
function init() {
    glInit(() => {

        rotator = new TrackballRotator(canvas, draw, 15)
        zoomer = new Zoomer(canvas) 

        reset()
    })

    document.body.onkeyup = function(e){
        if(e.keyCode == 32){
            reset()
        }
    }   
}

function loop() {
    draw()

    // setTimeout(loop, dt)

    time += dt
}

function reset() {
    frequencies = [
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        lerp(freqMin, freqMax, Math.random()),
        4]

    seeds = [Math.random(), Math.random(), Math.random(), Math.random()]

    gl.viewport(0,0, canvas.width, canvas.height)
    /* Create Objects */
    field = initObject({
        shader:"unlitPoint",
        elements:fieldSize,
        drawMode: gl.POINTS
    })
    generateField()

    var color = defaultColors[0]
    color.push(1)
    var mat = initMaterial("phongTexture", {
        "specularColor": [1, 0, 0],
        "diffuseColor": color,
        "specularExponent": 1,
        "lightPosition": defaultLights[1]
    })

    cube = initObject({
        mat:mat,
        modelName:"cube"
    })

    /* Start draw field */
    texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 
    	0, gl.RGBA, gl.UNSIGNED_BYTE, null)

    gl.viewport(0,0,512, 512)

    framebuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    drawField()

    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // Draw mains stuff
    gl.viewport(0,0,canvas.width, canvas.height)
    draw()

    /* End draw field */

    /* Start test texture *
    var texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,255,255]))

    var image = new Image();
    image.src = './space.jpg'
    image.crossOrigin = "anonymous"; 
    image.addEventListener('load', function() {
        console.log("LOADED!")
        console.log(image)
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);

        // Draw cube now
        initBasicTexture()
        // installModelWithTexture(objects[0])
        // currentModelNumber = 0

        draw()
    });
    /* End Test Texture */

    //draw()
}

function draw() { 
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw flat field as background
    mat4.ortho(projection, -1.0, 1.0, -1.0, 1.0, 0.1, 100); 
    // modelview = rotator.getViewMatrix()//mat4.create()
    modelview = mat4.create()
 
    gl.disable(gl.DEPTH_TEST)

    if(field) {
        field.dirtyAttributes()
        field.draw(modelview, projection, null)
    }

    gl.enable(gl.DEPTH_TEST) 

    // Draw perspective object
    mat4.perspective(projection, Math.PI/5, 1, 10, 20);
    modelview = rotator.getViewMatrix();

    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    if(zoomer) {
	    var zoom = zoomer.getZoomScale()
	    mat4.scale(modelview, modelview, vec3.fromValues(zoom,zoom,zoom))
	}
    mat3.normalFromMat4(normalMatrix, modelview);

    if(cube)
        cube.draw(modelview, projection, normalMatrix)
}

function drawField() {
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

    // Draw flat field as background
    mat4.ortho(projection, -1.0, 1.0, -1.0, 1.0, 0.1, 100); 
    modelview = mat4.create()
 
    if(field) {
        field.dirtyAttributes()
        field.draw(modelview, projection, null)
    }
}

function getNoise(x, y, i) {
    noise.seed(seeds[i])
    return 0.5 + noise.simplex2(x*frequencies[i], y*frequencies[i])/2;
}

function generateField() {
    var width = 1;
    var height = 1;
    points = []
    for(let i = 0; i < fieldSize; i++) {
        // Add random point to canvas
        var randX =  Math.random()
        var randY =  Math.random()
        var randZ = -4

        var vec = vec3.fromValues(randX, randY, randZ)
        points.push(vec)
    }


    // Update coords from points
    var s = 0
    var c = 0
    var c2 = 0
    var c3 = 0

    var r = 0 
    var g = 0
    var b = 0

    var r2 = 0
    var g2 = 0
    var b2 = 0

    var p = 10
    var p2 = 1 
    var p3 = 3
    var p4 = 1
    var p5 = 5

    var f = 0.1
    var f2 = 1.5
    var f3 = 0

    var freq = 10
    var min = 1
    var max = 0
    for(let i = 0; i < fieldSize; i++) {
        s = lerp(sizeMin, sizeMax, Math.random())
        // c = Math.pow(lerp(Math.random(), getNoise(points[i][0], points[i][1], 3), Math.random()), p)
        c = Math.pow(Math.random(), p)*f
        c2 = Math.pow(getNoise(points[i][0], points[i][1], 3), p2)*f
        /*if(c2 < min)
            min = c2
        if(c2 > max)
            max = c2*/
        r = g = b = lerp(c, c2, Math.pow(Math.random(), p3))


        //r2 = Math.pow(getNoise(points[i][0], points[i][1], 0), p3)
        //g2 = Math.pow(getNoise(points[i][0], points[i][1], 1), p3)
        //b2 = Math.pow(getNoise(points[i][0], points[i][1], 2), p3)



        if(Math.pow(Math.random(), p5) > 0.8)
        {
            var variety = 0
            var test = Math.random()
            if(test > 0.8)
                variety = 2
            else if(test > 0.6)
                variety = 1

            var noise = Math.pow(getNoise(points[i][0], points[i][1], variety), p4);
            switch(variety) {
                case 0:
                    r2 = 0.349*noise
                    g2 = 0.453*noise
                    b2 = 0.651*noise
                break;
                case 1:
                    r2 = 0.761*noise
                    g2 = 0.592*noise
                    b2 = 0.353*noise
                break;
                case 2:
                    r2 = 0.592*noise
                    g2 = 0.701*noise
                    b2 = 0.773*noise 
                break
            }

            f3 = 1
        }
        else 
            f3 = 0

        //0.349, 0.453, 0.651       
        //0.761, 0.592, 0.353
        //0.592, 0.701, 0.773

        // Random
        if(Math.pow(Math.random(), 6) > 0.98) {
            var index = Math.floor(Math.random()*(sampleColors.length/3))
            r = Math.max(sampleColors[index*3+0], 0)*f2
            g = Math.max(sampleColors[index*3+1], 0)*f2
            b = Math.max(sampleColors[index*3+2], 0)*f2
            s += 0.3
            /*r = sma
            g = Math.random()
            b = Math.random()*/
        }

        field.setValue("coords", i*3 + 0, -1 + 2*points[i][0])
        field.setValue("coords", i*3 + 1, -1 + 2*points[i][1])
        field.setValue("coords", i*3 + 2, 2*points[i][2])

        field.setValue("color", i*3 + 0, Math.min(clearVal + lerp(r, r2, f3)*(1-clearVal), 1))
        field.setValue("color", i*3 + 1, Math.min(clearVal + lerp(g, g2, f3)*(1-clearVal), 1))
        field.setValue("color", i*3 + 2, Math.min(clearVal + lerp(b, b2, f3)*(1-clearVal), 1))

        field.setValue("size", i, s)
        // field.setValue("color", i*3 + 0, 1)
        // field.setValue("color", i*3 + 1, 1)
        // field.setValue("color", i*3 + 2, 1)
        // field.setValue("size", i, 1)
    }

    field.dirtyAttributes()

    //console.log("Min: " + min + " Max: " + max)
}