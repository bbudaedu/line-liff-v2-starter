#!/bin/bash

# Health Check Script for Changhua Buddhist Registration System
# This script performs comprehensive health checks on all system components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${BACKEND_URL:-https://changhua-buddhist-api.herokuapp.com}"
FRONTEND_URL="${FRONTEND_URL:-https://changhua-buddhist.netlify.app}"
TIMEOUT=10

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

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

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

increment_total() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

increment_passed() {
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "${GREEN}✓${NC} $1"
}

increment_failed() {
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "${RED}✗${NC} $1"
}

# Health check functions
check_backend_health() {
    log_check "Checking backend health endpoint..."
    increment_total
    
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/api/health" -o /tmp/health_response.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" -eq 200 ]; then
        local status=$(cat /tmp/health_response.json | jq -r '.status // "unknown"')
        if [ "$status" = "ok" ]; then
            increment_passed "Backend health check"
            
            # Display additional health info
            local uptime=$(cat /tmp/health_response.json | jq -r '.uptime // 0')
            local memory_percentage=$(cat /tmp/health_response.json | jq -r '.memory.percentage // 0')
            echo "  Uptime: ${uptime}s, Memory: ${memory_percentage}%"
        else
            increment_failed "Backend health check - Status: $status"
        fi
    else
        increment_failed "Backend health check - HTTP $http_code"
    fi
    
    rm -f /tmp/health_response.json
}

check_backend_metrics() {
    log_check "Checking backend metrics endpoint..."
    increment_total
    
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/api/monitoring/metrics" -o /tmp/metrics_response.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" -eq 200 ]; then
        increment_passed "Backend metrics endpoint"
        
        # Display key metrics
        local cpu_usage=$(cat /tmp/metrics_response.json | jq -r '.system.cpu.usage // 0')
        local memory_used=$(cat /tmp/metrics_response.json | jq -r '.system.memory.heapUsed // 0')
        echo "  CPU: ${cpu_usage}%, Memory: ${memory_used}MB"
    else
        increment_failed "Backend metrics endpoint - HTTP $http_code"
    fi
    
    rm -f /tmp/metrics_response.json
}

check_database_connectivity() {
    log_check "Checking database connectivity..."
    increment_total
    
    # This would typically be done through the backend API
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$BACKEND_URL/api/health" -o /tmp/db_check.json)
    local http_code="${response: -3}"
    
    if [ "$http_code" -eq 200 ]; then
        local db_status=$(cat /tmp/db_check.json | jq -r '.services.database // "unknown"')
        if [ "$db_status" = "ok" ]; then
            increment_passed "Database connectivity"
        else
            increment_failed "Database connectivity - Status: $db_status"
        fi
    else
        increment_failed "Database connectivity check failed"
    fi
    
    rm -f /tmp/db_check.json
}

check_external_services() {
    log_check "Checking external service connectivity..."
    
    # Check LINE API
    increment_total
    local line_response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "https://api.line.me/v2/bot/info" -H "Authorization: Bearer dummy" -o /dev/null)
    local line_code="${line_response: -3}"
    
    if [ "$line_code" -eq 401 ]; then
        # 401 is expected with dummy token, means API is reachable
        increment_passed "LINE API connectivity"
    else
        increment_failed "LINE API connectivity - HTTP $line_code"
    fi
    
    # Check Pretix API (if configured)
    if [ -n "$PRETIX_API_URL" ]; then
        increment_total
        local pretix_response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$PRETIX_API_URL" -o /dev/null)
        local pretix_code="${pretix_response: -3}"
        
        if [ "$pretix_code" -eq 200 ] || [ "$pretix_code" -eq 401 ]; then
            increment_passed "Pretix API connectivity"
        else
            increment_failed "Pretix API connectivity - HTTP $pretix_code"
        fi
    fi
}

check_frontend_availability() {
    log_check "Checking frontend availability..."
    increment_total
    
    local response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$FRONTEND_URL" -o /dev/null)
    local http_code="${response: -3}"
    
    if [ "$http_code" -eq 200 ]; then
        increment_passed "Frontend availability"
    else
        increment_failed "Frontend availability - HTTP $http_code"
    fi
}

check_ssl_certificates() {
    log_check "Checking SSL certificates..."
    
    # Check backend SSL
    increment_total
    local backend_domain=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|/.*||')
    local backend_ssl_info=$(echo | openssl s_client -servername "$backend_domain" -connect "$backend_domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local expiry_date=$(echo "$backend_ssl_info" | grep "notAfter" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            increment_passed "Backend SSL certificate (expires in $days_until_expiry days)"
        elif [ "$days_until_expiry" -gt 0 ]; then
            increment_failed "Backend SSL certificate expires soon ($days_until_expiry days)"
        else
            increment_failed "Backend SSL certificate expired"
        fi
    else
        increment_failed "Backend SSL certificate check"
    fi
    
    # Check frontend SSL
    increment_total
    local frontend_domain=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
    local frontend_ssl_info=$(echo | openssl s_client -servername "$frontend_domain" -connect "$frontend_domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local expiry_date=$(echo "$frontend_ssl_info" | grep "notAfter" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            increment_passed "Frontend SSL certificate (expires in $days_until_expiry days)"
        elif [ "$days_until_expiry" -gt 0 ]; then
            increment_failed "Frontend SSL certificate expires soon ($days_until_expiry days)"
        else
            increment_failed "Frontend SSL certificate expired"
        fi
    else
        increment_failed "Frontend SSL certificate check"
    fi
}

check_response_times() {
    log_check "Checking response times..."
    
    # Backend response time
    increment_total
    local start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "$BACKEND_URL/api/health" -o /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$response_time" -lt 2000 ]; then
        increment_passed "Backend response time (${response_time}ms)"
    elif [ "$response_time" -lt 5000 ]; then
        increment_failed "Backend response time slow (${response_time}ms)"
    else
        increment_failed "Backend response time too slow (${response_time}ms)"
    fi
    
    # Frontend response time
    increment_total
    local start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "$FRONTEND_URL" -o /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ "$response_time" -lt 3000 ]; then
        increment_passed "Frontend response time (${response_time}ms)"
    elif [ "$response_time" -lt 8000 ]; then
        increment_failed "Frontend response time slow (${response_time}ms)"
    else
        increment_failed "Frontend response time too slow (${response_time}ms)"
    fi
}

check_heroku_status() {
    if command -v heroku >/dev/null 2>&1; then
        log_check "Checking Heroku app status..."
        increment_total
        
        local app_name=$(echo "$BACKEND_URL" | sed 's|https://||' | sed 's|\.herokuapp\.com.*||')
        local dyno_status=$(heroku ps --app "$app_name" 2>/dev/null | grep "web.1" | awk '{print $2}' || echo "unknown")
        
        if [ "$dyno_status" = "up" ]; then
            increment_passed "Heroku dyno status"
        else
            increment_failed "Heroku dyno status: $dyno_status"
        fi
    fi
}

generate_report() {
    echo ""
    echo "=================================="
    echo "     HEALTH CHECK SUMMARY"
    echo "=================================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo ""
    
    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    echo "Success Rate: $success_rate%"
    
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}All health checks passed!${NC}"
        return 0
    else
        echo -e "${RED}Some health checks failed. Please investigate.${NC}"
        return 1
    fi
}

# Main function
main() {
    echo "=================================="
    echo "  CHANGHUA BUDDHIST REGISTRATION"
    echo "      SYSTEM HEALTH CHECK"
    echo "=================================="
    echo "Timestamp: $(date)"
    echo "Backend URL: $BACKEND_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo ""
    
    # Run all health checks
    check_backend_health
    check_backend_metrics
    check_database_connectivity
    check_external_services
    check_frontend_availability
    check_ssl_certificates
    check_response_times
    check_heroku_status
    
    # Generate final report
    generate_report
}

# Script usage
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -b, --backend URL     Backend URL (default: https://changhua-buddhist-api.herokuapp.com)"
    echo "  -f, --frontend URL    Frontend URL (default: https://changhua-buddhist.netlify.app)"
    echo "  -t, --timeout SECONDS Timeout for requests (default: 10)"
    echo "  -h, --help           Show this help message"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backend)
            BACKEND_URL="$2"
            shift 2
            ;;
        -f|--frontend)
            FRONTEND_URL="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check prerequisites
command -v curl >/dev/null 2>&1 || { log_error "curl is required but not installed."; exit 1; }
command -v jq >/dev/null 2>&1 || { log_error "jq is required but not installed."; exit 1; }

# Run main function
main