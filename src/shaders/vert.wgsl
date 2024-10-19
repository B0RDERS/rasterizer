@group(0) @binding(0) var<storage> mMat : array<mat4x4<f32>>;
@group(0) @binding(1) var<storage> colors : array<vec4<f32>>;
@group(1) @binding(0) var<uniform> vpMat : mat4x4<f32>;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragPosition : vec3<f32>,
    @location(1) fragNormal : vec3<f32>,
    @location(2) fragColor: vec4<f32>
};

@vertex
fn main(
    @builtin(instance_index) index : u32,
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>
) -> VertexOutput {
    let mvp = vpMat * mMat[index];
    let pos = vec4<f32>(position, 1.0);

    var output : VertexOutput;
    output.Position = mvp * pos;
    output.fragPosition = (mMat[index] * pos).xyz;
    // it should use transpose(inverse(modelview)) if consider non-uniform scale
    // hint: inverse() is not available in wgsl, better do in JS or CS
    output.fragNormal =  (mMat[index] * vec4<f32>(normal, 0.0)).xyz;
    output.fragColor = colors[index];
    return output;
}
