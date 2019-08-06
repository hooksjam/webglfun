var projection = mat4.create()  // projection matrix
var modelview = mat4.create()   // modelview matrix; value comes from rotator
var normalMatrix = mat3.create()    // matrix, derived from modelview matrix, for transforming normal vectors

var scale = 1
var dt = 1000/60
var time = 0
var loopTimeout
var G = 10 

var framebuffer

var numBodies = 30
var balls = []
var ballMesh
var ballMat
var gridSize = 0.2 
var base
var baseMat
var baseSize = 8

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

function createBall(radius, color, position, velocity) {
    if(color.length == 3)
        color.push(1)
    // console.log("Create ball")
    // console.log("radius: " + radius)
    // console.log("color: " + color)
    // console.log("position: " + position)
    // console.log("velocity: " + velocity)

    var id = balls.length

    balls.push({
        id:id,
        position:position,
        velocity:velocity,
        radius:radius
    })
}

function reset() {
    var color = [0.1, 0.1, 0.1, 1]

    // createBall(
    //     0.5, 
    //     // defaultColors[Math.floor(Math.random()*defaultColors.length)],
    //     color,
    //     vec3.fromValues(-2,0,0), 
    //     vec3.fromValues(1,0,0)) 

    // createBall(
    //     0.5, 
    //     // defaultColors[Math.floor(Math.random()*defaultColors.length)],
    //     color,
    //     vec3.fromValues(2,0,0), 
    //     vec3.fromValues(-1,0,0)) 

    // Create 3 balls in a vertical line
    numBodies = 15
    ballMat = initMaterial("unlitUniformColor", {color: color, name: "ballMat"})
    ballMesh = initObject({
        mat:ballMat,
        model:uvSphere(0.5)
    }) 
    for(let i = 0; i < numBodies; i++) {
        createBall(
            0.5, 
            color,
            // defaultColors[Math.floor(Math.random()*defaultColors.length)],
            vec3.fromValues(Math.random()*0.1, 1 + i*1.5, Math.random()*0.1), 
            vec3.fromValues(0,0,0))
    }

    // Plan
    baseMat = initMaterial("unlitUniformColor", {color: [0.1, 0.1, 0.3, 1], name: "baseMat"})
    base = initObject({
        mat:baseMat,
        model:plane(baseSize)
    }) 

    if(loopTimeout != null)
        clearTimeout(loopTimeout)
    loop()
}

function projectUonV(u, v, scale = 1) {
    var dotA = vec3.dot(u, v)
    var dotB = vec3.dot(v, v)
    var ret = vec3.create()
    vec3.scale(ret, v, scale*dotA/dotB)
    return ret
}

function checkCollision(ballA, ballB) {
    var distance = vec3.distance(ballA.position, ballB.position)
    var overlap = ballA.radius + ballB.radius - distance
    // Collision!
    if(overlap > 0) {
        // First move both balls away from each other by 1/2 the overlap
        // Thenoroject the velocity of ballA onto the normal, add that by -2
        var difference = vec3.create()
        vec3.sub(difference, ballA.position, ballB.position)
        vec3.normalize(difference, difference)
        vec3.scale(difference, difference, overlap/2)

        // Ball a
        vec3.add(ballA.position, ballA.position, difference)
        vec3.add(ballA.velocity, ballA.velocity, projectUonV(ballA.velocity, difference, -2))

        // Ball b
        vec3.scale(difference, difference, -1)
        vec3.add(ballB.position, ballB.position, difference)
        vec3.add(ballB.velocity, ballB.velocity, projectUonV(ballB.velocity, difference, -2))
    }
}

function loop() {
    var dv = vec3.fromValues(0,-G*dt/1000, 0)
    var dx = vec3.create()

    var zones = {}

    var addIdToZone = (id, xPos, yPos) => {
        // Add to quadrants that the bounding box intersect with
        var x = Math.floor(xPos/gridSize)
        var y = Math.floor(yPos/gridSize)
        var z = Math.floor(yPos/gridSize)
        var key = x + "-" + y + "-" + z
        if(!(key in zones)) {
            zones[key] = {}
        }
        zones[key][id] = 1
    }

    // Step 1, everything moves
    var bounds = baseSize/2 
    for(let i = 0; i < balls.length; i++) {
        // Acceleration of body
        var body = balls[i]
        var radius = balls[i].radius

        vec3.add(body.velocity, body.velocity, dv)
        vec3.scale(dx, body.velocity, dt/1000)
        vec3.add(body.position, body.position, dx)

        // Add to quadrants that the bounding box intersect with
        addIdToZone(balls[i].id, body.position.x-radius, body.position.y-radius, body.position.z-radius)
        addIdToZone(balls[i].id, body.position.x+radius, body.position.y-radius, body.position.z-radius)
        addIdToZone(balls[i].id, body.position.x+radius, body.position.y-radius, body.position.z+radius)
        addIdToZone(balls[i].id, body.position.x-radius, body.position.y-radius, body.position.z+radius)

        addIdToZone(balls[i].id, body.position.x-radius, body.position.y+radius, body.position.z-radius)
        addIdToZone(balls[i].id, body.position.x+radius, body.position.y+radius, body.position.z-radius)
        addIdToZone(balls[i].id, body.position.x+radius, body.position.y+radius, body.position.z+radius)
        addIdToZone(balls[i].id, body.position.x-radius, body.position.y+radius, body.position.z+radius)


        // Ground collision
        if(balls[i].velocity[1] < 0 && balls[i].position[1] < -bounds)
            balls[i].velocity[1] *= -1

        // Check wall collisions - x
        if((balls[i].velocity[0] < 0 && balls[i].position[0] < -bounds) || 
            (balls[i].velocity[0] > 0 && balls[i].position[0] > bounds))
            balls[i].velocity[0] *= -1

        // Check wall collisions - z
        if((balls[i].velocity[2] < 0 && balls[i].position[2] < -bounds) || 
            (balls[i].velocity[2] > 0 && balls[i].position[2] > bounds))
            balls[i].velocity[2] *= -1
    }

    // Step 2 Collision checking
    for(var key in zones) {
        // Check collision of each object in zone to object in zone
        for(var idA in zones[key]) {
            for(var idB in zones[key]) {
                if(idA == idB)
                    continue

                var ballA = balls[parseInt(idA)]
                var ballB = balls[parseInt(idB)]
                checkCollision(ballA, ballB)
            }
        }
    }

    draw()

    loopTimeout = setTimeout(loop, dt)

    time += dt
}

function draw() { 
    gl.clearColor(clearVal, clearVal, clearVal, 1);  // specify the color to be used for clearing
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
    gl.enable(gl.DEPTH_TEST) 

    // Draw perspective object
    mat4.perspective(projection, Math.PI/5, 1, 10, 30);
    modelview = rotator.getViewMatrix();

    mat4.scale(modelview, modelview, vec3.fromValues(scale, scale, scale))
    if(zoomer) {
        // var zoom = zoomer.getZoomScale()
        // mat4.scale(modelview, modelview, vec3.fromValues(zoom,zoom,zoom))
    }
    mat3.normalFromMat4(normalMatrix, modelview);

    for(let i = 0; i < balls.length; i++) {
        pushTransform(modelview)
        var bScale = balls[i].radius/0.5
        mat4.translate(modelview, modelview, balls[i].position);
        mat4.scale(modelview, modelview, vec3.fromValues(bScale, bScale, bScale))
        // console.log(balls[i].position)
        ballMesh.draw(modelview, projection)
        popTransform(modelview) 
    }

    pushTransform(modelview)
    mat4.translate(modelview, modelview, vec3.fromValues(0, -baseSize/2, 0))
    base.draw(modelview, projection)
    popTransform(modelview)
}