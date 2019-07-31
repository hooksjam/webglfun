#BEGIN VERT

attribute vec3 a_coords;
attribute vec3 a_color;
attribute float a_size;
varying vec3 v_color;
uniform mat4 modelview;
uniform mat4 projection; 
void main() {
	gl_PointSize = a_size; 
	vec4 coords = vec4(a_coords, 1.0);
	vec4 eyeCoords = modelview * coords;
	gl_Position = projection * eyeCoords;
	v_color = a_color;
} 

#END VERT


#BEGIN FRAG

#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif
varying vec3 v_color;
void main() {
	gl_FragColor = vec4(v_color, 1.0);
}     

#END FRAG