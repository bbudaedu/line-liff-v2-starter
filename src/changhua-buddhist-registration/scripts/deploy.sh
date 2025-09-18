#!/bin/bash

# Deployment Script for Changhua Buddhist Registration System
# This script handles the deployment process for both frontend and backend

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_BRANCH="main"
BACKEND_BRANCH="main"
HEROKU_APP_NAME="changhua-buddhist-api"
NETLIFY_SITE_ID="your-netlify-site-id"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v git >/dev/null 2>&1 || { log_error "git is required but not installed."; exit 1; }
    command -v heroku >/dev/null 2>&1 || { log_error "heroku CLI is required but not installed."; exit 1; }
    command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }
    
    # Check if logged into Heroku
    heroku auth:whoami >/dev/null 2>&1 || { log_error "Please login to Heroku first: heroku login"; exit 1; }
    
    log_info "Prerequisites check passed"
}

run_tests() {
    log_info "Running tests..."
    
    # Run frontend tests
    npm test -- --watchAll=false --coverage=false
    
    if [ $? -ne 0 ]; then
        log_error "Tests failed. Deployment aborted."
        exit 1
    fi
    
    log_info "All tests passed"
}

build_frontend() {
    log_info "Building frontend..."
    
    # Install dependencies
    npm ci
    
    # Build the application
    npm run build
    
    if [ $? -ne 0 ]; then
        log_error "Frontend build failed"
        exit 1
    fi
    
    log_info "Frontend build completed"
}

deploy_backend() {
    log_info "Deploying backend to Heroku..."
    
    # Check if Heroku app exists
    heroku apps:info $HEROKU_APP_NAME >/dev/null 2>&1 || {
        log_error "Heroku app $HEROKU_APP_NAME not found"
        exit 1
    }
    
    # Deploy to Heroku
    git push heroku $BACKEND_BRANCH:main
    
    if [ $? -ne 0 ]; then
        log_error "Backend deployment failed"
        exit 1
    fi
    
    # Run database migrations if needed
    log_info "Running database migrations..."
    heroku run npm run db:migrate --app $HEROKU_APP_NAME
    
    log_info "Backend deployment completed"
}

deploy_frontend() {
    log_info "Deploying frontend to Netlify..."
    
    # Netlify deployment is handled automatically via Git integration
    # This section would trigger a manual deployment if needed
    
    log_info "Frontend deployment triggered (automatic via Git)"
}

health_check() {
    log_info "Performing health checks..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Check backend health
    BACKEND_URL="https://$HEROKU_APP_NAME.herokuapp.com"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        log_info "Backend health check passed"
    else
        log_error "Backend health check failed (HTTP $HTTP_STATUS)"
        exit 1
    fi
    
    # Check frontend (would need to be updated with actual frontend URL)
    # FRONTEND_URL="https://your-site.netlify.app"
    # HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    
    log_info "Health checks completed"
}

rollback() {
    log_warn "Rolling back deployment..."
    
    # Rollback Heroku deployment
    PREVIOUS_RELEASE=$(heroku releases --app $HEROKU_APP_NAME --json | jq -r '.[1].version')
    heroku rollback $PREVIOUS_RELEASE --app $HEROKU_APP_NAME
    
    log_info "Rollback completed"
}

cleanup() {
    log_info "Cleaning up..."
    
    # Clean up temporary files
    rm -rf .tmp
    
    log_info "Cleanup completed"
}

# Main deployment process
main() {
    log_info "Starting deployment process..."
    
    # Parse command line arguments
    ENVIRONMENT=${1:-production}
    SKIP_TESTS=${2:-false}
    
    log_info "Deploying to environment: $ENVIRONMENT"
    
    # Set environment-specific variables
    case $ENVIRONMENT in
        "staging")
            HEROKU_APP_NAME="changhua-buddhist-api-staging"
            ;;
        "production")
            HEROKU_APP_NAME="changhua-buddhist-api"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Trap to handle errors and cleanup
    trap 'log_error "Deployment failed"; cleanup; exit 1' ERR
    trap 'cleanup' EXIT
    
    # Execute deployment steps
    check_prerequisites
    
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    fi
    
    build_frontend
    deploy_backend
    deploy_frontend
    health_check
    
    log_info "Deployment completed successfully!"
    
    # Display deployment information
    echo ""
    echo "=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Backend URL: https://$HEROKU_APP_NAME.herokuapp.com"
    echo "Frontend URL: https://changhua-buddhist.netlify.app"
    echo "Deployed at: $(date)"
    echo ""
    
    # Display next steps
    echo "=== Next Steps ==="
    echo "1. Monitor application logs: heroku logs --tail --app $HEROKU_APP_NAME"
    echo "2. Check monitoring dashboard: https://$HEROKU_APP_NAME.herokuapp.com/api/monitoring/status"
    echo "3. Verify key functionality manually"
    echo ""
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [skip_tests]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (staging|production) [default: production]"
    echo "  skip_tests     Skip running tests (true|false) [default: false]"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy to production with tests"
    echo "  $0 staging                  # Deploy to staging with tests"
    echo "  $0 production true          # Deploy to production without tests"
    echo ""
}

# Handle help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"