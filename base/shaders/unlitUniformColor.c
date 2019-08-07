#BEGIN VERT
	attribute vec3 a_coords;
	uniform mat4 modelview;
	uniform mat4 projection; 

	void main() {
	    vec4 coords = vec4(a_coords, 1.0);
	    vec4 eyeCoords = modelview * coords;
	    gl_Position = projection * eyeCoords;
	} 
#END VERT


#BEGIN FRAG
	#ifdef GL_FRAGMENT_PRECISION_HIGH
	    precision highp float;
	#else
	    precision mediump float;
	#endif
	uniform vec3 color;

	void main() {
	    gl_FragColor = vec4(color, 1.0);
	}       
#END FRAG

<script type="x-shader/x-vertex" id="unlitUniformColor-vshader-source">
	attribute vec3 a_coords;
	uniform mat4 modelview;
	uniform mat4 projection; 

	void main() {
	    vec4 coords = vec4(a_coords, 1.0);
	    vec4 eyeCoords = modelview * coords;
	    gl_Position = projection * eyeCoords;
	} 
</script>

<script type="x-shader/x-fragment" id="unlitUniformColor-fshader-source">
	#ifdef GL_FRAGMENT_PRECISION_HIGH
	    precision highp float;
	#else
	    precision mediump float;
	#endif
	uniform vec3 color;

	void main() {
	    gl_FragColor = vec4(color, 1.0);
	}       
</script>