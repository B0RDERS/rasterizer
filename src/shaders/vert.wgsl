@group(1) @binding(0) var<storage> mMat : array<mat4x4f>;
@group(1) @binding(1) var<storage> colors : array<vec4f>;
@group(2) @binding(0) var<uniform> vpMat : mat4x4f;

struct VertexOutput {
    @builtin(position) Position : vec4f,
    @location(0) fragPosition : vec3f,
    @location(1) fragNormal : vec3f,
    @location(2) fragColor: vec4f
};

@vertex
fn main(
    @builtin(instance_index) index : u32,
    @location(0) position : vec3f,
    @location(1) normal : vec3f
) -> VertexOutput {
    let mvp = vpMat * mMat[index];
    let pos = vec4f(position, 1.0);

    var output : VertexOutput;
    output.Position = mvp * pos;
    output.fragPosition = (mMat[index] * pos).xyz;
    // it should use transpose(inverse(modelview)) if consider non-uniform scale
    // hint: inverse() is not available in wgsl, better do in JS or CS
    output.fragNormal =  (mMat[index] * vec4f(normal, 0.0)).xyz;
    output.fragColor = colors[index];
    return output;
}
