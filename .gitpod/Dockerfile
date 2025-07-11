FROM gitpod/workspace-full

# Install Git LFS if not already present
RUN sudo apt-get update && \
    sudo apt-get install -y git-lfs && \
    sudo rm -rf /var/lib/apt/lists/*

# Install specific Node.js version
RUN bash -c ". .nvm/nvm.sh && nvm install 22.16.0 && nvm use 22.16.0 && nvm alias default 22.16.0"

# Install pnpm globally
RUN bash -c ". .nvm/nvm.sh && nvm use 22.16.0 && npm install -g pnpm@latest"

# Install Python and conda setup (if needed)
RUN conda install python=3.12 -y || echo "Conda already configured"

# Configure Git LFS globally
RUN git lfs install --system 