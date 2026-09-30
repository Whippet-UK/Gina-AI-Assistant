import { GpuRendererConfig } from './aida64GpuRendererConfig';

export interface GpuPassState { value:number; time:number; width:number; height:number; }

const VERT=`#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const FRAG=`#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_scene;
uniform float u_value;
uniform float u_time;
uniform float u_exposure;
uniform float u_glass;
uniform float u_metal;
uniform float u_crt;
uniform float u_fluid;

vec3 aces(vec3 x){
  x*=u_exposure;
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);
}
void main(){
  vec2 uv=v_uv;
  float r=length(uv-.5)*1.4142;
  if(u_crt>0.0){
    float bend=(uv.y-.5)*(uv.y-.5)*0.08*u_crt;
    uv.x += (uv.x-.5)*bend;
    uv.y += (uv.y-.5)*(uv.x-.5)*(uv.x-.5)*0.08*u_crt;
  }
  vec2 refr=uv-.5;
  float edge=smoothstep(.2,.72,length(refr));
  uv += refr*edge*0.018*u_glass;
  vec3 c=texture(u_scene,clamp(uv,0.001,0.999)).rgb;
  if(u_glass>0.0){
    float fres=pow(clamp(1.0-edge,0.0,1.0),2.0);
    c=mix(c,c+vec3(.08,.12,.18)*fres,u_glass*.35);
  }
  if(u_metal>0.0){
    float bands=0.5+0.5*sin((uv.y*700.0+uv.x*80.0)*3.14159);
    c+=vec3(.025)*bands*u_metal;
  }
  if(u_fluid>0.0){
    float surface=0.5+0.5*sin(uv.x*90.0+u_time*.003);
    float mask=smoothstep(.48,.52,uv.y);
    c+=vec3(.02,.07,.12)*surface*mask*u_fluid;
  }
  if(u_crt>0.0){
    float scan=0.94+0.06*sin(uv.y*900.0);
    c*=scan;
    c+=vec3(.015)*sin(u_time*.04)*u_crt;
    c*=1.0-smoothstep(.65,1.0,r)*.18*u_crt;
  }
  outColor=vec4(aces(c),1.0);
}`;

export class Aida64GpuRenderer {
 private gl:WebGL2RenderingContext|null=null;
 private program:WebGLProgram|null=null;
 private texture:WebGLTexture|null=null;
 private canvas:HTMLCanvasElement;
 private fallback:CanvasRenderingContext2D|null=null;
 constructor(canvas:HTMLCanvasElement){this.canvas=canvas;this.init();}
 private compile(type:number,src:string){const gl=this.gl!;const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');return s;}
 private init(){
   this.gl=this.canvas.getContext('webgl2',{antialias:true,alpha:true});
   if(!this.gl){this.fallback=this.canvas.getContext('2d');return;}
   const gl=this.gl,vs=this.compile(gl.VERTEX_SHADER,VERT),fs=this.compile(gl.FRAGMENT_SHADER,FRAG);
   const p=gl.createProgram()!;gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Program link failed');
   this.program=p;this.texture=gl.createTexture();
 }
 render(source:CanvasImageSource,state:GpuPassState,cfg:GpuRendererConfig){
   if(!this.gl||!this.program||!this.texture){this.fallback?.drawImage(source,0,0,state.width,state.height);return;}
   const gl=this.gl;gl.viewport(0,0,state.width,state.height);gl.useProgram(this.program);
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source as TexImageSource);
   const b=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(this.program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   const u=(n:string)=>gl.getUniformLocation(this.program!,n);
   gl.uniform1f(u('u_value'),state.value/100);gl.uniform1f(u('u_time'),state.time);gl.uniform1f(u('u_exposure'),cfg.exposure);
   gl.uniform1f(u('u_glass'),cfg.glassQuality==='high'?1:cfg.glassQuality==='basic'?.5:0);
   gl.uniform1f(u('u_metal'),cfg.materialQuality==='high'?1:cfg.materialQuality==='basic'?.5:0);
   gl.uniform1f(u('u_crt'),cfg.crtQuality==='high'?1:cfg.crtQuality==='basic'?.5:0);
   gl.uniform1f(u('u_fluid'),cfg.fluidQuality==='high'?1:cfg.fluidQuality==='basic'?.5:0);
   gl.drawArrays(gl.TRIANGLES,0,6);
   gl.deleteBuffer(b);
 }
}
