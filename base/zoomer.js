
function Zoomer(canvas) {
    canvas.addEventListener("DOMMouseScroll", mousewheel, false);
    canvas.addEventListener("mousewheel", mousewheel, false);

    var vec = [1,1,1]

    var delta = 0
    var velocity = 0
    var scale = 1

    function mousewheel( e)
    {
        var amount = 100; // parameter

        // get wheel direction 
        delta = ((typeof e.wheelDelta != "undefined")?(-e.wheelDelta):e.detail);

        velocity -= delta*0.0005

        // do calculations, I'm not using any three.js internal methods here, maybe there is a better way of doing this
        // applies movement in the direction of (0,0,0), assuming this is where the camera is pointing
        /*var cPos = camera.position;
        var r = cPos.x*cPos.x + cPos.y*cPos.y;
        var sqr = Math.sqrt(r);
        var sqrZ = Math.sqrt(cPos.z*cPos.z + r);

        var nx = cPos.x + ((r==0)?0:(d * cPos.x/sqr));
        var ny = cPos.y + ((r==0)?0:(d * cPos.y/sqr));
        var nz = cPos.z + ((sqrZ==0)?0:(d * cPos.z/sqrZ));

        // verify we're applying valid numbers
        if (isNaN(nx) || isNaN(ny) || isNaN(nz))
          return;

        vec = [1+nx, 1+ny, 1+nz]*/
    } 

    this.getZoomScale = function() {
        scale = Math.max(scale+velocity,0)
        velocity = velocity*(1-0.05)
        return Math.pow(scale, 2)
        // return vec

    }
    var unitx = new Array(3);
    var unity = new Array(3);
    var unitz = new Array(3);
    var viewZ;  // view distance; z-coord in eye coordinates;
    var center; // center of view; rotation is about this point; default is [0,0,0] 
    this.setView = function( viewDistance, viewpointDirection, viewUp ) {
        unitz = (viewpointDirection === undefined)? [0,0,10] : viewpointDirection;
        viewUp = (viewUp === undefined)? [0,1,0] : viewUp;
        viewZ = viewDistance;
        normalize(unitz, unitz);
        copy(unity,unitz);
        scale(unity, unity, dot(unitz,viewUp));
        subtract(unity,viewUp,unity);
        normalize(unity,unity);
        cross(unitx,unity,unitz);
    }
    this.getZoomMatrix = function() {
        var mat = [ unitx[0], unity[0], unitz[0], 0,
                unitx[1], unity[1], unitz[1], 0, 
                unitx[2], unity[2], unitz[2], 0,
                0, 0, 0, 1 ];
        if (center !== undefined) {  // multiply on left by translation by rotationCenter, on right by translation by -rotationCenter
            var t0 = center[0] - mat[0]*center[0] - mat[4]*center[1] - mat[8]*center[2];
            var t1 = center[1] - mat[1]*center[0] - mat[5]*center[1] - mat[9]*center[2];
            var t2 = center[2] - mat[2]*center[0] - mat[6]*center[1] - mat[10]*center[2];
            mat[12] = t0;
            mat[13] = t1;
            mat[14] = t2;
        }
        if (viewZ !== undefined) {
            mat[14] -= viewZ;
        }
        return mat;
    }
    function dot(v,w) {
        return v[0]*w[0] + v[1]*w[1] + v[2]*w[2];
    }
    function length(v) {
        return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    }
    function normalize(v,w) {
        var d = length(w);
        v[0] = w[0]/d;
        v[1] = w[1]/d;
        v[2] = w[2]/d;
    }
    function copy(v,w) {
        v[0] = w[0];
        v[1] = w[1];
        v[2] = w[2];
    }
    function add(sum,v,w) {
        sum[0] = v[0] + w[0];
        sum[1] = v[1] + w[1];
        sum[2] = v[2] + w[2];
    }
    function subtract(dif,v,w) {
        dif[0] = v[0] - w[0];
        dif[1] = v[1] - w[1];
        dif[2] = v[2] - w[2];
    }
    function scale(ans,v,num) {
        ans[0] = v[0] * num;
        ans[1] = v[1] * num;
        ans[2] = v[2] * num;
    }
    function cross(c,v,w) {
        var x = v[1]*w[2] - v[2]*w[1];
        var y = v[2]*w[0] - v[0]*w[2];
        var z = v[0]*w[1] - v[1]*w[0];
        c[0] = x;
        c[1] = y;
        c[2] = z;
    }
}


