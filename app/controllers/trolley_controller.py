from flask import Blueprint, request, jsonify
from config.database import Database
from core.time_engine import TimeService

trolley_bp = Blueprint('trolley', __name__)
db = Database()

@trolley_bp.route('/attach', methods=['POST'])
def attach_trolley():
    """
    Attach data to a trolley barcode
    Uses TimeService for consistent timestamps
    """
    try:
        data = request.get_json()
        barcode = data.get('barcode')
        
        # Extract all parameters
        customer_name = data.get('customerName')
        lot_number = data.get('lotNumber') or data.get('greigeSort')
        design_name = data.get('designName')
        design_number = data.get('designNumber')
        grey_width = data.get('greyWidth')
        finish_width = data.get('finishWidth')
        fabric_quality = data.get('fabricQuality') or data.get('quality')
        total_trolley = data.get('totalTrolley') or data.get('quantity')
        meters = data.get('meters')
        matching = data.get('matching') or data.get('color')
        order_receive_date = data.get('orderReceiveDate')
        grey_receive_date = data.get('greyReceiveDate')
        remarks = data.get('remarks')
        pack_instructions = data.get('packInstructions')

        if not barcode:
            return jsonify({'success': False, 'message': 'Barcode is required'}), 400

        # ⭐ TIME ENGINE: Get current timestamp
        current_time = TimeService.get_db_timestamp()

        # Check if trolley exists
        existing = db.fetch_one('SELECT * FROM trolley_barcodes WHERE barcode = %s', (barcode,))

        # Prepare operations for transaction
        operations = []

        if existing:
            # Update existing trolley with TimeService timestamp
            operations.append((
                """UPDATE trolley_barcodes SET 
                state = 'FULL',
                customer_name = %s, lot_number = %s, design_name = %s, design_number = %s,
                grey_width = %s, finish_width = %s, fabric_quality = %s, total_trolley = %s,
                meters = %s, matching = %s, order_receive_date = %s, grey_receive_date = %s,
                remarks = %s, pack_instructions = %s, attached_at = %s
                WHERE barcode = %s""",
                (customer_name, lot_number, design_name, design_number, grey_width, finish_width,
                 fabric_quality, total_trolley, meters, matching, order_receive_date,
                 grey_receive_date, remarks, pack_instructions, current_time, barcode)
            ))
        else:
            # Insert new trolley with TimeService timestamp
            operations.append((
                """INSERT INTO trolley_barcodes 
                (barcode, state, customer_name, lot_number, design_name, design_number, grey_width,
                 finish_width, fabric_quality, total_trolley, meters, matching,
                 order_receive_date, grey_receive_date, remarks, pack_instructions, attached_at, created_at) 
                VALUES (%s, 'FULL', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (barcode, customer_name, lot_number, design_name, design_number, grey_width,
                 finish_width, fabric_quality, total_trolley, meters, matching,
                 order_receive_date, grey_receive_date, remarks, pack_instructions, current_time, current_time)
            ))

        # Record in history with TimeService timestamp
        operations.append((
            """INSERT INTO tracking_history 
            (event_type, customer_name, lot_number, design_name, design_number, grey_width,
             finish_width, fabric_quality, total_trolley, meters, matching, order_receive_date,
             grey_receive_date, remarks, pack_instructions, trolley_barcode, input_trolley, status, created_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            ('trolley_attached', customer_name, lot_number, design_name, design_number,
             grey_width, finish_width, fabric_quality, total_trolley, meters, matching,
             order_receive_date, grey_receive_date, remarks, pack_instructions, barcode, barcode, 'initiated', current_time)
        ))

        # Execute all operations in a single transaction
        db.execute_transaction(operations)

        return jsonify({
            'success': True, 
            'message': 'Trolley data attached successfully',
            'data': {
                'barcode': barcode,
                'state': 'FULL',
                'customerName': customer_name,
                'lotNumber': lot_number,
                'designName': design_name,
                'designNumber': design_number,
                'greyWidth': grey_width,
                'finishWidth': finish_width,
                'fabricQuality': fabric_quality,
                'totalTrolley': total_trolley,
                'meters': meters,
                'matching': matching,
                'orderReceiveDate': order_receive_date,
                'greyReceiveDate': grey_receive_date,
                'remarks': remarks,
                'packInstructions': pack_instructions,
                'timestamp': TimeService.format_for_display(current_time)
            }
        })
    except Exception as e:
        print(f"Attach trolley error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@trolley_bp.route('/check/<barcode>', methods=['GET'])
def check_trolley(barcode):
    """
    Check trolley status
    Returns: trolley data if FULL, empty status if EMPTY
    """
    try:
        trolley = db.fetch_one('SELECT * FROM trolley_barcodes WHERE barcode = %s', (barcode,))
        
        if trolley:
            is_empty = trolley['state'] == 'EMPTY'
            return jsonify({
                'success': True, 
                'exists': True, 
                'data': trolley if not is_empty else None,
                'isEmpty': is_empty,
                'state': trolley['state']
            })
        else:
            return jsonify({
                'success': True, 
                'exists': False, 
                'isEmpty': True,
                'state': 'EMPTY'
            })
    except Exception as e:
        print(f"Check trolley error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@trolley_bp.route('/clear/<barcode>', methods=['POST'])
def clear_trolley(barcode):
    """
    Manually clear a trolley (set to EMPTY state)
    """
    try:
        # Clear all data and set state to EMPTY
        db.execute_query(
            """UPDATE trolley_barcodes SET 
            state = 'EMPTY',
            customer_name = NULL, lot_number = NULL, design_name = NULL,
            design_number = NULL, grey_width = NULL, finish_width = NULL, fabric_quality = NULL,
            total_trolley = NULL, meters = NULL, matching = NULL, order_receive_date = NULL,
            grey_receive_date = NULL, remarks = NULL, pack_instructions = NULL, attached_at = NULL
            WHERE barcode = %s""",
            (barcode,))

        return jsonify({'success': True, 'message': f'Trolley {barcode} cleared successfully'})
    except Exception as e:
        print(f"Clear trolley error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
