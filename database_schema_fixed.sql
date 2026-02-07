-- =====================================================
-- TROLLEY TRACKING SYSTEM - COMPLETE DATABASE SCHEMA
-- Fixed Version with State Management & Process Flow
-- =====================================================

DROP DATABASE IF EXISTS trolley_tracking;
CREATE DATABASE trolley_tracking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trolley_tracking;

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TROLLEY BARCODES TABLE (Reusable Containers)
-- State-based: EMPTY, FULL
-- =====================================================
CREATE TABLE trolley_barcodes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    state ENUM('EMPTY', 'FULL') DEFAULT 'EMPTY',
    
    -- Data fields (filled when FULL, NULL when EMPTY)
    customer_name VARCHAR(255) NULL,
    lot_number VARCHAR(255) NULL,
    design_name VARCHAR(255) NULL,
    design_number VARCHAR(255) NULL,
    grey_width VARCHAR(100) NULL,
    finish_width VARCHAR(100) NULL,
    fabric_quality VARCHAR(255) NULL,
    total_trolley INT NULL,
    meters VARCHAR(100) NULL,
    matching VARCHAR(100) NULL,
    order_receive_date DATE NULL,
    grey_receive_date DATE NULL,
    remarks TEXT NULL,
    pack_instructions TEXT NULL,
    
    -- Timestamps with timezone support
    attached_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_barcode (barcode),
    INDEX idx_state (state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- PROCESS BARCODES TABLE (Process Input/Output)
-- State-based: EMPTY, IN_PROCESS, COMPLETED
-- Auto-mirroring: input → output
-- =====================================================
CREATE TABLE process_barcodes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    barcode VARCHAR(255) UNIQUE NOT NULL,
    process_type ENUM('input', 'output') NOT NULL,
    state ENUM('EMPTY', 'IN_PROCESS', 'COMPLETED') DEFAULT 'EMPTY',
    process_name VARCHAR(255) NULL,
    
    -- Link to paired process barcode (for auto-mirroring)
    paired_barcode VARCHAR(255) NULL,
    
    -- Original trolley that provided the data
    source_trolley_barcode VARCHAR(255) NULL,
    
    -- Data fields (copied from trolley)
    customer_name VARCHAR(255) NULL,
    lot_number VARCHAR(255) NULL,
    design_name VARCHAR(255) NULL,
    design_number VARCHAR(255) NULL,
    grey_width VARCHAR(100) NULL,
    finish_width VARCHAR(100) NULL,
    fabric_quality VARCHAR(255) NULL,
    total_trolley INT NULL,
    meters VARCHAR(100) NULL,
    matching VARCHAR(100) NULL,
    order_receive_date DATE NULL,
    grey_receive_date DATE NULL,
    remarks TEXT NULL,
    pack_instructions TEXT NULL,
    
    -- Process timing
    process_start_time TIMESTAMP NULL,
    process_end_time TIMESTAMP NULL,
    
    -- Timestamps
    attached_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_barcode (barcode),
    INDEX idx_process_type (process_type),
    INDEX idx_state (state),
    INDEX idx_paired_barcode (paired_barcode),
    INDEX idx_source_trolley (source_trolley_barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TRACKING HISTORY TABLE (Complete Audit Trail)
-- Stores: start time, end time, duration, full parameters
-- =====================================================
CREATE TABLE tracking_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_type ENUM('trolley_attached', 'process_input', 'process_output', 'trolley_transferred') NOT NULL,
    
    -- Process information
    process_code VARCHAR(255) NULL,
    process_name VARCHAR(255) NULL,
    
    -- Trolley information
    input_trolley VARCHAR(255) NULL,
    output_trolley VARCHAR(255) NULL,
    
    -- Process barcodes
    process_input_barcode VARCHAR(255) NULL,
    process_output_barcode VARCHAR(255) NULL,
    
    -- Complete data parameters
    customer_name VARCHAR(255),
    lot_number VARCHAR(255),
    design_name VARCHAR(255),
    design_number VARCHAR(255),
    grey_width VARCHAR(100),
    finish_width VARCHAR(100),
    fabric_quality VARCHAR(255),
    total_trolley INT,
    meters VARCHAR(100),
    matching VARCHAR(100),
    order_receive_date DATE,
    grey_receive_date DATE,
    remarks TEXT,
    pack_instructions TEXT,
    
    -- Legacy fields for backward compatibility
    trolley_barcode VARCHAR(255),
    process_barcode VARCHAR(255),
    from_barcode VARCHAR(255),
    to_barcode VARCHAR(255),
    
    -- Process timing with duration
    process_start_time TIMESTAMP NULL,
    process_end_time TIMESTAMP NULL,
    duration_seconds INT NULL,
    
    -- Status tracking
    status ENUM('initiated', 'in_progress', 'completed', 'transferred') DEFAULT 'initiated',
    
    -- Audit fields
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type (event_type),
    INDEX idx_process_code (process_code),
    INDEX idx_input_trolley (input_trolley),
    INDEX idx_output_trolley (output_trolley),
    INDEX idx_process_input (process_input_barcode),
    INDEX idx_process_output (process_output_barcode),
    INDEX idx_trolley_barcode (trolley_barcode),
    INDEX idx_process_barcode (process_barcode),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SETTINGS TABLE
-- =====================================================
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- INSERT DEFAULT SETTINGS
-- =====================================================
INSERT INTO settings (setting_key, setting_value) VALUES 
('company_name', 'TFT Industries'),
('timezone', 'Asia/Karachi'),
('timezone_offset', '+05:00'),
('maintenance_mode', 'false'),
('auto_mirror_enabled', 'true')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View: Active Processes (In Progress)
CREATE VIEW view_active_processes AS
SELECT 
    pb.barcode,
    pb.process_name,
    pb.process_type,
    pb.state,
    pb.customer_name,
    pb.lot_number,
    pb.process_start_time,
    TIMESTAMPDIFF(SECOND, pb.process_start_time, NOW()) as elapsed_seconds
FROM process_barcodes pb
WHERE pb.state = 'IN_PROCESS';

-- View: Full Trolleys
CREATE VIEW view_full_trolleys AS
SELECT 
    barcode,
    customer_name,
    lot_number,
    design_name,
    attached_at
FROM trolley_barcodes
WHERE state = 'FULL';

-- View: Recent History with Duration
CREATE VIEW view_history_with_duration AS
SELECT 
    id,
    event_type,
    process_name,
    input_trolley,
    output_trolley,
    process_start_time,
    process_end_time,
    duration_seconds,
    CONCAT(
        FLOOR(duration_seconds / 3600), 'h ',
        FLOOR((duration_seconds % 3600) / 60), 'm ',
        duration_seconds % 60, 's'
    ) as duration_formatted,
    status,
    created_at
FROM tracking_history
ORDER BY created_at DESC;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

DELIMITER $$

-- Procedure: Calculate Duration
CREATE PROCEDURE calculate_duration(
    IN p_start_time TIMESTAMP,
    IN p_end_time TIMESTAMP,
    OUT p_duration INT
)
BEGIN
    IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
        SET p_duration = TIMESTAMPDIFF(SECOND, p_start_time, p_end_time);
    ELSE
        SET p_duration = NULL;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Create sample trolley barcodes (TR-01 to TR-10, all EMPTY initially)
INSERT INTO trolley_barcodes (barcode, state) VALUES
('TR-01', 'EMPTY'),
('TR-02', 'EMPTY'),
('TR-03', 'EMPTY'),
('TR-04', 'EMPTY'),
('TR-05', 'EMPTY'),
('TR-06', 'EMPTY'),
('TR-07', 'EMPTY'),
('TR-08', 'EMPTY'),
('TR-09', 'EMPTY'),
('TR-10', 'EMPTY');

-- Create sample process barcodes (paired input/output)
INSERT INTO process_barcodes (barcode, process_type, state, paired_barcode) VALUES
('PR-01-in', 'input', 'EMPTY', 'PR-01-out'),
('PR-01-out', 'output', 'EMPTY', 'PR-01-in'),
('PR-02-in', 'input', 'EMPTY', 'PR-02-out'),
('PR-02-out', 'output', 'EMPTY', 'PR-02-in'),
('PR-03-in', 'input', 'EMPTY', 'PR-03-out'),
('PR-03-out', 'output', 'EMPTY', 'PR-03-in');

-- =====================================================
-- DATABASE INFO
-- =====================================================

SELECT 
    'Database Created Successfully!' as message,
    DATABASE() as database_name,
    @@version as mysql_version,
    NOW() as created_at;
