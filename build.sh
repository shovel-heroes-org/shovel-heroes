#!/bin/bash

# Build script for Shovel Heroes Docker images
# Usage: ./build.sh [OPTIONS]
#
# Options:
#   -t, --tag TAG       Image tag (default: latest)
#   -e, --env ENV       Environment (dev|staging|prod, default: dev)
#   -b, --backend-only  Build backend only
#   -f, --frontend-only Build frontend only
#   -p, --push          Push to ECR after build
#   --ecr-registry URL  ECR registry URL
#   -h, --help          Show this help message

set -e

# Default values
TAG="latest"
ENV="dev"
BUILD_BACKEND=true
BUILD_FRONTEND=true
PUSH=false
ECR_REGISTRY=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -e|--env)
      ENV="$2"
      shift 2
      ;;
    -b|--backend-only)
      BUILD_FRONTEND=false
      shift
      ;;
    -f|--frontend-only)
      BUILD_BACKEND=false
      shift
      ;;
    -p|--push)
      PUSH=true
      shift
      ;;
    --ecr-registry)
      ECR_REGISTRY="$2"
      shift 2
      ;;
    -h|--help)
      echo "Build script for Shovel Heroes Docker images"
      echo ""
      echo "Usage: ./build.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -t, --tag TAG       Image tag (default: latest)"
      echo "  -e, --env ENV       Environment (dev|staging|prod, default: dev)"
      echo "  -b, --backend-only  Build backend only"
      echo "  -f, --frontend-only Build frontend only"
      echo "  -p, --push          Push to ECR after build"
      echo "  --ecr-registry URL  ECR registry URL"
      echo "  -h, --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./build.sh                                    # Build both images with tag 'latest'"
      echo "  ./build.sh -t v1.0.0 -e staging              # Build with tag 'staging-v1.0.0'"
      echo "  ./build.sh -b -t dev-test                    # Build backend only with tag 'dev-test'"
      echo "  ./build.sh -p --ecr-registry 123.ecr.aws...  # Build and push to ECR"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

# Determine image names
if [ -n "$ECR_REGISTRY" ]; then
  BACKEND_IMAGE="${ECR_REGISTRY}/shovel-heroes-backend"
  FRONTEND_IMAGE="${ECR_REGISTRY}/shovel-heroes-frontend"
else
  BACKEND_IMAGE="shovel-heroes-backend"
  FRONTEND_IMAGE="shovel-heroes-frontend"
fi

# Add environment prefix to tag
FULL_TAG="${ENV}-${TAG}"

echo -e "${GREEN}🚀 Building Shovel Heroes Docker images${NC}"
echo -e "Environment: ${YELLOW}${ENV}${NC}"
echo -e "Tag: ${YELLOW}${FULL_TAG}${NC}"
echo ""

# Build backend
if [ "$BUILD_BACKEND" = true ]; then
  echo -e "${GREEN}📦 Building backend image...${NC}"
  docker build \
    -f Dockerfile.backend \
    -t ${BACKEND_IMAGE}:${FULL_TAG} \
    -t ${BACKEND_IMAGE}:${ENV}-latest \
    .
  echo -e "${GREEN}✓ Backend image built successfully${NC}"
  echo -e "  - ${BACKEND_IMAGE}:${FULL_TAG}"
  echo -e "  - ${BACKEND_IMAGE}:${ENV}-latest"
  echo ""
fi

# Build frontend
if [ "$BUILD_FRONTEND" = true ]; then
  echo -e "${GREEN}📦 Building frontend image...${NC}"

  # Set API base URL based on environment
  case $ENV in
    prod|production)
      VITE_API_BASE="https://api.shovel-heroes.cc"
      ;;
    staging)
      VITE_API_BASE="https://api.shovel-heroes.cc"
      ;;
    dev|development)
      VITE_API_BASE="http://localhost:8787"
      ;;
    *)
      VITE_API_BASE="https://api.shovel-heroes.cc"
      ;;
  esac

  docker build \
    -f Dockerfile.frontend \
    --build-arg VITE_API_BASE=${VITE_API_BASE} \
    -t ${FRONTEND_IMAGE}:${FULL_TAG} \
    -t ${FRONTEND_IMAGE}:${ENV}-latest \
    .
  echo -e "${GREEN}✓ Frontend image built successfully${NC}"
  echo -e "  - ${FRONTEND_IMAGE}:${FULL_TAG}"
  echo -e "  - ${FRONTEND_IMAGE}:${ENV}-latest}"
  echo -e "  - API Base: ${YELLOW}${VITE_API_BASE}${NC}"
  echo ""
fi

# Push to ECR if requested
if [ "$PUSH" = true ]; then
  if [ -z "$ECR_REGISTRY" ]; then
    echo -e "${RED}Error: --ecr-registry is required when using --push${NC}"
    exit 1
  fi

  echo -e "${GREEN}📤 Pushing images to ECR...${NC}"

  if [ "$BUILD_BACKEND" = true ]; then
    docker push ${BACKEND_IMAGE}:${FULL_TAG}
    docker push ${BACKEND_IMAGE}:${ENV}-latest
    echo -e "${GREEN}✓ Backend images pushed${NC}"
  fi

  if [ "$BUILD_FRONTEND" = true ]; then
    docker push ${FRONTEND_IMAGE}:${FULL_TAG}
    docker push ${FRONTEND_IMAGE}:${ENV}-latest
    echo -e "${GREEN}✓ Frontend images pushed${NC}"
  fi
  echo ""
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "To run locally:"
if [ "$BUILD_BACKEND" = true ]; then
  echo -e "  ${YELLOW}docker run -p 8787:8787 ${BACKEND_IMAGE}:${FULL_TAG}${NC}"
fi
if [ "$BUILD_FRONTEND" = true ]; then
  echo -e "  ${YELLOW}docker run -p 80:80 ${FRONTEND_IMAGE}:${FULL_TAG}${NC}"
fi
