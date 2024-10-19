### Setting Up the WebGPU Rasterizer

1. **Clone the Repository**
   Open your terminal and run the following command to clone the repository:

   ```bash
   git clone https://github.com/B0RDERS/webgpu-rasterizer.git rasterizer
   ```

2. **Navigate to the Project Directory**
   Change into the newly created `rasterizer` directory:

   ```bash
   cd rasterizer
   ```

3. **Install Dependencies**
   Use npm to install the project's dependencies:

   ```bash
   npm ci
   ```

4. **Run the Development Server**
   Start the development server with the following command:

   ```bash
   npm run dev
   ```

5. **Open Chrome with WebGPU Support**
   To view the project, you need to launch Chrome with specific flags to enable WebGPU and Vulkan features. Use the following command in your terminal:

   ```bash
   chrome --enable-webgpu-developer-features --enable-features=Vulkan localhost:3000
   ```

   Make sure Chrome is installed and in your system's PATH. If you're using a different OS or installation method, you may need to adjust the command accordingly.

### Summary
After following these steps, you should have the WebGPU rasterizer running locally on your machine. Open Chrome to the specified localhost address to interact with the application. Enjoy exploring the capabilities of WebGPU!