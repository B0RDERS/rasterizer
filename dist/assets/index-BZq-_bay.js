(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function o(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(t){if(t.ep)return;t.ep=!0;const r=o(t);fetch(t.href,r)}})();const s=`@vertex
fn main(
  @builtin(vertex_index) VertexIndex : u32
) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2(0.0, 0.5),
    vec2(-0.5, -0.5),
    vec2(0.5, -0.5)
  );

  return vec4f(pos[VertexIndex], 0.0, 1.0);
}
`,d=`@fragment
fn main() -> @location(0) vec4f {
  return vec4(1.0, 0.0, 0.0, 1.0);
}`;async function u(e){if(!navigator.gpu)throw new Error("Not Support WebGPU");const n=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!n)throw new Error("No Adapter Found");const o=await n.requestDevice(),i=e.getContext("webgpu"),t=navigator.gpu.getPreferredCanvasFormat(),r=window.devicePixelRatio||1;e.width=e.clientWidth*r,e.height=e.clientHeight*r;const c={width:e.width,height:e.height};return i.configure({device:o,format:t,alphaMode:"opaque"}),{device:o,context:i,format:t,size:c}}async function l(e,n){const o={layout:"auto",vertex:{module:e.createShaderModule({code:s}),entryPoint:"main"},primitive:{topology:"triangle-list"},fragment:{module:e.createShaderModule({code:d}),entryPoint:"main",targets:[{format:n}]}};return await e.createRenderPipelineAsync(o)}function a(e,n,o){const i=e.createCommandEncoder(),r={colorAttachments:[{view:n.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]},c=i.beginRenderPass(r);c.setPipeline(o),c.draw(3),c.end(),e.queue.submit([i.finish()])}async function f(){const e=document.querySelector("canvas");if(!e)throw new Error("No Canvas");const{device:n,context:o,format:i}=await u(e),t=await l(n,i);a(n,o,t),window.addEventListener("resize",()=>{e.width=e.clientWidth*devicePixelRatio,e.height=e.clientHeight*devicePixelRatio,a(n,o,t)})}f();
