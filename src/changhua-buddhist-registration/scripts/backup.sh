#!/bin/bash

# Backup Script for Changhua Buddhist Registration System
# This script handles database backups and file backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HEROKU_APP_NAME="${HEROKU_APP_NAME:-changhua-buddhist-api}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
S3_BUCKET="${S3_BUCKET:-changhua-buddhist-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

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
    command -v heroku >/dev/null 2>&1 || { log_error "heroku CLI is required but not installed."; exit 1; }
    
    # Check if logged into Heroku
    heroku auth:whoami >/dev/null 2>&1 || { log_error "Please login to Heroku first: heroku login"; exit 1; }
    
    # Check if app exists
    heroku apps:info $HEROKU_APP_NAME >/dev/null 2>&1 || { log_error "Heroku app $HEROKU_APP_NAME not found"; exit 1; }
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    log_info "Prerequisites check passed"
}

create_database_backup() {
    log_info "Creating database backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="db_backup_${timestamp}"
    
    # Create Heroku backup
    log_info "Creating Heroku PostgreSQL backup..."
    heroku pg:backups:capture --app $HEROKU_APP_NAME
    
    # Get the latest backup ID
    local backup_id=$(heroku pg:backups --app $HEROKU_APP_NAME | head -n 1 | awk '{print $1}')
    
    if [ -z "$backup_id" ]; then
        log_error "Failed to create backup"
        return 1
    fi
    
    log_info "Backup created with ID: $backup_id"
    
    # Download the backup
    local backup_file="$BACKUP_DIR/${backup_name}.dump"
    log_info "Downloading backup to $backup_file..."
    
    heroku pg:backups:download $backup_id --output "$backup_file" --app $HEROKU_APP_NAME
    
    if [ -f "$backup_file" ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup downloaded successfully (Size: $file_size)"
        
        # Compress the backup
        log_info "Compressing backup..."
        gzip "$backup_file"
        backup_file="${backup_file}.gz"
        
        local compressed_size=$(du -h "$backup_file" | cut -f1)
        log_info "Backup compressed (Size: $compressed_size)"
        
        echo "$backup_file"
    else
        log_error "Failed to download backup"
        return 1
    fi
}

create_config_backup() {
    log_info "Creating configuration backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local config_file="$BACKUP_DIR/config_backup_${timestamp}.json"
    
    # Export Heroku config vars (excluding sensitive data)
    heroku config --json --app $HEROKU_APP_NAME | jq 'with_entries(
        if (.key | test("TOKEN|SECRET|KEY|PASSWORD")) then 
            .value = "[REDACTED]" 
        else 
            . 
        end
    )' > "$config_file"
    
    if [ -f "$config_file" ]; then
        log_info "Configuration backup created: $config_file"
        echo "$config_file"
    else
        log_error "Failed to create configuration backup"
        return 1
    fi
}

create_code_backup() {
    log_info "Creating code backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local code_file="$BACKUP_DIR/code_backup_${timestamp}.tar.gz"
    
    # Create tar archive of the current codebase
    tar -czf "$code_file" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='backups' \
        --exclude='*.log' \
        .
    
    if [ -f "$code_file" ]; then
        local file_size=$(du -h "$code_file" | cut -f1)
        log_info "Code backup created: $code_file (Size: $file_size)"
        echo "$code_file"
    else
        log_error "Failed to create code backup"
        return 1
    fi
}

upload_to_s3() {
    local file_path="$1"
    local s3_key="$2"
    
    if command -v aws >/dev/null 2>&1; then
        log_info "Uploading $file_path to S3..."
        
        aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" --storage-class STANDARD_IA
        
        if [ $? -eq 0 ]; then
            log_info "Successfully uploaded to S3: s3://$S3_BUCKET/$s3_key"
        else
            log_warn "Failed to upload to S3"
        fi
    else
        log_warn "AWS CLI not installed, skipping S3 upload"
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Clean up local backups older than retention period
    find "$BACKUP_DIR" -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.json" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    log_info "Local cleanup completed"
    
    # Clean up S3 backups if AWS CLI is available
    if command -v aws >/dev/null 2>&1; then
        log_info "Cleaning up old S3 backups..."
        
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3api list-objects-v2 --bucket "$S3_BUCKET" --query "Contents[?LastModified<='$cutoff_date'].Key" --output text | \
        while read -r key; do
            if [ -n "$key" ] && [ "$key" != "None" ]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
                log_info "Deleted old S3 backup: $key"
            fi
        done
    fi
}

verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity..."
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if the file is a valid gzip file
    if gzip -t "$backup_file" 2>/dev/null; then
        log_info "Backup file integrity verified"
        
        # Get file size and creation time
        local file_size=$(du -h "$backup_file" | cut -f1)
        local creation_time=$(stat -c %y "$backup_file")
        
        log_info "Backup details:"
        log_info "  File: $backup_file"
        log_info "  Size: $file_size"
        log_info "  Created: $creation_time"
        
        return 0
    else
        log_error "Backup file is corrupted or invalid"
        return 1
    fi
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # This function would send notifications via email, Slack, etc.
    # For now, just log the notification
    
    if [ "$status" = "success" ]; then
        log_info "NOTIFICATION: Backup completed successfully - $message"
    else
        log_error "NOTIFICATION: Backup failed - $message"
    fi
    
    # Example: Send to Slack webhook
    # if [ -n "$SLACK_WEBHOOK_URL" ]; then
    #     curl -X POST -H 'Content-type: application/json' \
    #         --data "{\"text\":\"Backup $status: $message\"}" \
    #         "$SLACK_WEBHOOK_URL"
    # fi
}

# Main backup function
main() {
    local backup_type="${1:-full}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    log_info "Starting backup process (Type: $backup_type)..."
    log_info "Timestamp: $(date)"
    log_info "App: $HEROKU_APP_NAME"
    log_info "Backup Directory: $BACKUP_DIR"
    
    check_prerequisites
    
    local backup_files=()
    local failed=false
    
    case $backup_type in
        "database"|"db")
            log_info "Performing database backup only..."
            if db_backup=$(create_database_backup); then
                backup_files+=("$db_backup")
                verify_backup "$db_backup"
            else
                failed=true
            fi
            ;;
        "config")
            log_info "Performing configuration backup only..."
            if config_backup=$(create_config_backup); then
                backup_files+=("$config_backup")
            else
                failed=true
            fi
            ;;
        "code")
            log_info "Performing code backup only..."
            if code_backup=$(create_code_backup); then
                backup_files+=("$code_backup")
            else
                failed=true
            fi
            ;;
        "full"|*)
            log_info "Performing full backup..."
            
            # Database backup
            if db_backup=$(create_database_backup); then
                backup_files+=("$db_backup")
                verify_backup "$db_backup"
            else
                failed=true
            fi
            
            # Configuration backup
            if config_backup=$(create_config_backup); then
                backup_files+=("$config_backup")
            else
                failed=true
            fi
            
            # Code backup
            if code_backup=$(create_code_backup); then
                backup_files+=("$code_backup")
            else
                failed=true
            fi
            ;;
    esac
    
    # Upload to S3 if configured
    if [ ${#backup_files[@]} -gt 0 ]; then
        for backup_file in "${backup_files[@]}"; do
            local filename=$(basename "$backup_file")
            upload_to_s3 "$backup_file" "backups/$timestamp/$filename"
        done
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Send notification
    if [ "$failed" = false ]; then
        local total_files=${#backup_files[@]}
        send_notification "success" "Created $total_files backup files"
        log_info "Backup process completed successfully!"
        
        # Display summary
        echo ""
        echo "=== Backup Summary ==="
        echo "Type: $backup_type"
        echo "Timestamp: $timestamp"
        echo "Files created: $total_files"
        for backup_file in "${backup_files[@]}"; do
            echo "  - $(basename "$backup_file")"
        done
        echo ""
        
        exit 0
    else
        send_notification "failed" "Some backup operations failed"
        log_error "Backup process completed with errors!"
        exit 1
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [backup_type]"
    echo ""
    echo "Backup Types:"
    echo "  full       Complete backup (database + config + code) [default]"
    echo "  database   Database backup only"
    echo "  config     Configuration backup only"
    echo "  code       Code backup only"
    echo ""
    echo "Environment Variables:"
    echo "  HEROKU_APP_NAME    Heroku app name (default: changhua-buddhist-api)"
    echo "  BACKUP_DIR         Local backup directory (default: ./backups)"
    echo "  S3_BUCKET          S3 bucket for remote backups (optional)"
    echo "  RETENTION_DAYS     Days to keep backups (default: 30)"
    echo ""
    echo "Examples:"
    echo "  $0                 # Full backup"
    echo "  $0 database        # Database only"
    echo "  HEROKU_APP_NAME=my-app $0 full"
    echo ""
}

# Handle help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"