# Ichigo-demo

This project consists of a frontend application and a backend setup using Docker.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- Docker
- Docker Compose
- NVIDIA Container Toolkit
- Node.js (version 18 or higher)

## Installation

### Frontend Setup

1. Navigate to the root project directory:
   ```
   cd /path/to/project
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Start the frontend:
   ```
   npm start
   ```

5. Update the `.env.local` file with the following configurations:
   ```
   OPENAI_BASE_URL=http://localhost:5000/v1/
   TOKENIZE_BASE_URL=http://localhost:3348
   TTS_BASE_URL=http://localhost:22311/v1/
   ```

### Backend Setup

1. Navigate to the Docker folder:
   ```
   cd docker
   ```

2. Build the Docker containers:
   ```
   docker-compose build
   ```

3. Download the latest Llama3s model in ExLlama2 format from:
   [Llama3-s-instruct-v0.3-checkpoint-7000-phase-3-exllama2](https://huggingface.co/janhq/llama3-s-instruct-v0.3-checkpoint-7000-phase-3-exllama2)

4. Edit the `docker/tabbyapi/config.yml` file:
   - Update the `model_name:` field with the folder path containing the Llama3s ExLlama2 model.

5. Update the Docker Compose configuration:
   In your `docker-compose.yml` file, ensure the `tabbyapi` service has the following configuration:

   ```yaml
   tabbyapi:
     container_name: tabbyapi
     build:
       context: ./tabbyAPI-personal-fork
       dockerfile: ./docker/Dockerfile
       args:
         DO_PULL: "true"
     ports:
       - "5000:5000"
     environment:
       NAME: TabbyAPI
       NVIDIA_VISIBLE_DEVICES: all
     volumes:
       - /path/to/parent/directory/of/llama3s/:/app/models
       - ./tabbyapi/config.yml:/app/config.yml
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: all
               capabilities: [ gpu ]
   ```

   Make sure to replace `/path/to/parent/directory/of/llama3s/` with the actual path to the parent directory containing your Llama3s model.

6. Start the Docker containers:
   ```
   docker-compose up
   ```

## Usage

Once everything is set up and running, you can access the demo page by opening your browser and navigating to:

```
http://localhost:3000
```

## Troubleshooting

If you encounter any issues during the setup or running of the project, please check the following:

1. Ensure all prerequisites are correctly installed.
2. Verify that all paths in the configuration files are correct.
3. Check the console output for any error messages.
4. Make sure the Llama3s model is in the correct location and properly mounted in the Docker container.
5. Verify that your GPU is properly set up and recognized by Docker.

If problems persist, please open an issue in this repository with detailed information about the error you're experiencing.

