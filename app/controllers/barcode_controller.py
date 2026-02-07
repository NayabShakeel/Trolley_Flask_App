from flask import Blueprint, request, jsonify
from config.database import Database

barcode_bp = Blueprint('barcode', __name__)
db = Database()

@barcode_bp.route('/search/<barcode>', methods=['GET'])
def search_barcode(barcode):
    """
    Universal barcode search
    Returns complete information including:
    - Trolley data (if exists and FULL)
    - Process data (if exists and IN_PROCESS)
    - History records
    - Current state
    """
    try:
        # Search in trolley barcodes
        trolley = db.fetch_one(
            'SELECT * FROM trolley_barcodes WHERE barcode = %s', 
            (barcode,)
        )
        
        # Search in process barcodes
        process = db.fetch_one(
            'SELECT * FROM process_barcodes WHERE barcode = %s', 
            (barcode,)
        )
        
        # Get complete history for this barcode
        history = db.fetch_all(
            '''SELECT 
                id, event_type, process_code, process_name,
                input_trolley, output_trolley,
                process_input_barcode, process_output_barcode,
                customer_name, lot_number, design_name, design_number,
                grey_width, finish_width, fabric_quality, total_trolley,
                meters, matching, order_receive_date, grey_receive_date,
                remarks, pack_instructions,
                process_start_time, process_end_time, duration_seconds,
                status, created_at,
                CASE 
                    WHEN duration_seconds IS NOT NULL THEN
                        CONCAT(
                            FLOOR(duration_seconds / 3600), 'h ',
                            FLOOR((duration_seconds % 3600) / 60), 'm ',
                            duration_seconds % 60, 's'
                        )
                    ELSE NULL
                END as duration_formatted
            FROM tracking_history 
            WHERE trolley_barcode = %s 
               OR process_barcode = %s 
               OR from_barcode = %s 
               OR to_barcode = %s
               OR input_trolley = %s
               OR output_trolley = %s
               OR process_input_barcode = %s
               OR process_output_barcode = %s
            ORDER BY created_at DESC 
            LIMIT 50''',
            (barcode, barcode, barcode, barcode, barcode, barcode, barcode, barcode)
        )
        
        # Determine barcode type and state
        barcode_type = None
        state = None
        data = None
        
        if trolley:
            barcode_type = 'trolley'
            state = trolley['state']
            # Only show data if trolley is FULL
            if state == 'FULL':
                data = trolley
        
        if process:
            barcode_type = 'process'
            state = process['state']
            # Show process data if IN_PROCESS
            if state in ['IN_PROCESS', 'COMPLETED']:
                data = process
        
        # Check if trolley is currently in a process
        current_process = None
        if trolley:
            current_process = db.fetch_one(
                "SELECT * FROM process_barcodes WHERE source_trolley_barcode = %s AND state = 'IN_PROCESS'", 
                (barcode,)
            )
        
        return jsonify({
            'success': True,
            'found': bool(data or history),
            'barcodeType': barcode_type,
            'state': state,
            'trolley': data if barcode_type == 'trolley' else None,
            'process': data if barcode_type == 'process' else None,
            'currentProcess': current_process,
            'history': history,
            'historyCount': len(history)
        })
    except Exception as e:
        print(f"Barcode search error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@barcode_bp.route('/info/<barcode>', methods=['GET'])
def get_barcode_info(barcode):
    """
    Get detailed information about a specific barcode
    Returns all parameters attached to the barcode
    """
    try:
        # Try trolley first
        trolley = db.fetch_one(
            'SELECT * FROM trolley_barcodes WHERE barcode = %s',
            (barcode,)
        )
        
        if trolley and trolley['state'] == 'FULL':
            return jsonify({
                'success': True,
                'type': 'trolley',
                'state': trolley['state'],
                'data': {
                    'barcode': trolley['barcode'],
                    'customerName': trolley['customer_name'],
                    'lotNumber': trolley['lot_number'],
                    'designName': trolley['design_name'],
                    'designNumber': trolley['design_number'],
                    'greyWidth': trolley['grey_width'],
                    'finishWidth': trolley['finish_width'],
                    'fabricQuality': trolley['fabric_quality'],
                    'totalTrolley': trolley['total_trolley'],
                    'meters': trolley['meters'],
                    'matching': trolley['matching'],
                    'orderReceiveDate': trolley['order_receive_date'],
                    'greyReceiveDate': trolley['grey_receive_date'],
                    'remarks': trolley['remarks'],
                    'packInstructions': trolley['pack_instructions'],
                    'attachedAt': trolley['attached_at']
                }
            })
        
        # Try process
        process = db.fetch_one(
            'SELECT * FROM process_barcodes WHERE barcode = %s',
            (barcode,)
        )
        
        if process and process['state'] == 'IN_PROCESS':
            return jsonify({
                'success': True,
                'type': 'process',
                'state': process['state'],
                'processType': process['process_type'],
                'data': {
                    'barcode': process['barcode'],
                    'processName': process['process_name'],
                    'pairedBarcode': process['paired_barcode'],
                    'sourceTrolley': process['source_trolley_barcode'],
                    'customerName': process['customer_name'],
                    'lotNumber': process['lot_number'],
                    'designName': process['design_name'],
                    'designNumber': process['design_number'],
                    'greyWidth': process['grey_width'],
                    'finishWidth': process['finish_width'],
                    'fabricQuality': process['fabric_quality'],
                    'totalTrolley': process['total_trolley'],
                    'meters': process['meters'],
                    'matching': process['matching'],
                    'orderReceiveDate': process['order_receive_date'],
                    'greyReceiveDate': process['grey_receive_date'],
                    'remarks': process['remarks'],
                    'packInstructions': process['pack_instructions'],
                    'processStartTime': process['process_start_time'],
                    'attachedAt': process['attached_at']
                }
            })
        
        return jsonify({
            'success': True,
            'found': False,
            'state': 'EMPTY',
            'message': 'Barcode is empty or not found'
        })
    except Exception as e:
        print(f"Get barcode info error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
