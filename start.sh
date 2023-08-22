#!/bin/bash
echo "Starting GCP Log Manager..."
# Set executable permissions for scripts
cd scripts
chmod +x ./startDataflow.sh ./cancelDataflow.sh
cd ../

# Build the Docker image
echo "Building the Docker image..."
currTime=$(date +%Y%m%d%H%M%S)
docker build -t gcp-log-manager-${currTime} .
# Run startDataflow.sh in the background
cd scripts
./startDataflow.sh &
cd ../

# Start the application container
echo "Starting the application container..."
container_id=$(docker run -d -p 8080:8080 gcp-log-manager-${currTime})

sleep 20

# Wait for user input to trigger cancelDataflow.sh
read -p "Enter 'exit' to stop GCP Log Manager:" input
if [ "$input" == "exit" ]; then
  cd scripts
  echo "Executing cancelDataflow.sh..."
  ./cancelDataflow.sh
  cd ../
  echo "Removing the container..."
  docker rm -f $container_id
  echo "Removing the image..."
  docker rmi gcp-log-manager-${currTime}
fi