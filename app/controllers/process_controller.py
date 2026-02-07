from flask import Blueprint, request, jsonify
from config.database import Database
from core.time_engine import TimeService

process_bp = Blueprint('process', __name__)
db = Database()

# ============================================================================
# WORKFLOW ENGINE - STATE MACHINE WITH TIME ENGINE
# ============================================================================

class WorkflowEngine:
    """
    Proper workflow engine with centralized time management
    
    Time Rules:
    - ALL timestamps come from TimeService
    - Storage: UTC (database)
    - Display: Pakistan time (UI)
    - NO SQL time functions
    - NO JavaScript time generation
    """
    
    @staticmethod
    def transfer_trolley_to_process(trolley_barcode, process_barcode, process_name):
        """
        FLOW STAGE 1: Carrier → Processor
        TR-01(FULL) → PR-01-in(EMPTY)
        """
        
        # Validate trolley state
        trolley = db.fetch_one(
            "SELECT * FROM trolley_barcodes WHERE barcode = %s AND state = 'FULL'",
            (trolley_barcode,)
        )
        
        if not trolley:
            return {
                'success': False, 
                'message': 'Trolley must be FULL with data before connecting to process',
                'error_type': 'CARRIER_EMPTY'
            }
        
        # Validate process state
        process_input = db.fetch_one(
            "SELECT * FROM process_barcodes WHERE barcode = %s AND process_type = 'input'",
            (process_barcode,)
        )
        
        if not process_input:
            return {
                'success': False,
                'message': 'Process input barcode not found',
                'error_type': 'PROCESSOR_NOT_FOUND'
            }
        
        if process_input['state'] != 'EMPTY':
            return {
                'success': False,
                'message': f'Process is already {process_input["state"]}. Clear it first.',
                'error_type': 'PROCESSOR_BUSY'
            }
        
        # Extract trolley data (payload)
        payload = {
            'customer_name': trolley['customer_name'],
            'lot_number': trolley['lot_number'],
            'design_name': trolley['design_name'],
            'design_number': trolley['design_number'],
            'grey_width': trolley['grey_width'],
            'finish_width': trolley['finish_width'],
            'fabric_quality': trolley['fabric_quality'],
            'total_trolley': trolley['total_trolley'],
            'meters': trolley['meters'],
            'matching': trolley['matching'],
            'order_receive_date': trolley['order_receive_date'],
            'grey_receive_date': trolley['grey_receive_date'],
            'remarks': trolley['remarks'],
            'pack_instructions': trolley['pack_instructions']
        }
        
        # Get paired output barcode
        paired_output = process_input.get('paired_barcode')
        process_code = process_barcode.rsplit('-', 1)[0] if '-' in process_barcode else process_barcode
        
        # ⭐ TIME ENGINE: Get current timestamp from TimeService
        current_time = TimeService.get_db_timestamp()
        
        # Build transaction
        operations = []
        
        # Migrate data to input process
        operations.append((
            """UPDATE process_barcodes SET 
            state = 'IN_PROCESS',
            process_name = %s,
            source_trolley_barcode = %s,
            customer_name = %s, lot_number = %s, design_name = %s, design_number = %s,
            grey_width = %s, finish_width = %s, fabric_quality = %s, total_trolley = %s,
            meters = %s, matching = %s, order_receive_date = %s, grey_receive_date = %s,
            remarks = %s, pack_instructions = %s,
            process_start_time = %s,
            attached_at = %s
            WHERE barcode = %s""",
            (process_name, trolley_barcode, 
             payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
             payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
             payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
             payload['remarks'], payload['pack_instructions'],
             current_time, current_time, process_barcode)
        ))
        
        # Auto-mirror to output process
        if paired_output:
            operations.append((
                """UPDATE process_barcodes SET 
                state = 'IN_PROCESS',
                process_name = %s,
                source_trolley_barcode = %s,
                customer_name = %s, lot_number = %s, design_name = %s, design_number = %s,
                grey_width = %s, finish_width = %s, fabric_quality = %s, total_trolley = %s,
                meters = %s, matching = %s, order_receive_date = %s, grey_receive_date = %s,
                remarks = %s, pack_instructions = %s,
                process_start_time = %s,
                attached_at = %s
                WHERE barcode = %s""",
                (process_name, trolley_barcode, 
                 payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
                 payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
                 payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
                 payload['remarks'], payload['pack_instructions'],
                 current_time, current_time, paired_output)
            ))
        
        # Reset trolley
        operations.append((
            """UPDATE trolley_barcodes SET 
            state = 'EMPTY',
            customer_name = NULL, lot_number = NULL, design_name = NULL,
            design_number = NULL, grey_width = NULL, finish_width = NULL, fabric_quality = NULL,
            total_trolley = NULL, meters = NULL, matching = NULL, order_receive_date = NULL,
            grey_receive_date = NULL, remarks = NULL, pack_instructions = NULL, attached_at = NULL
            WHERE barcode = %s""",
            (trolley_barcode,)
        ))
        
        # Record flow event
        operations.append((
            """INSERT INTO tracking_history 
            (event_type, process_code, process_name, input_trolley, 
             process_input_barcode, process_output_barcode,
             customer_name, lot_number, design_name, design_number, grey_width,
             finish_width, fabric_quality, total_trolley, meters, matching, order_receive_date,
             grey_receive_date, remarks, pack_instructions,
             trolley_barcode, process_barcode, from_barcode, to_barcode,
             process_start_time, status, created_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            ('process_input', process_code, process_name, trolley_barcode,
             process_barcode, paired_output, 
             payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
             payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
             payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
             payload['remarks'], payload['pack_instructions'],
             trolley_barcode, process_barcode, trolley_barcode, process_barcode, 
             current_time, 'in_progress', current_time)
        ))
        
        # Execute atomic transaction
        try:
            db.execute_transaction(operations)
            return {
                'success': True,
                'message': f'Data migrated from {trolley_barcode} to {process_barcode}',
                'flow_state': 'CARRIER_TO_PROCESSOR',
                'data': {
                    'source': trolley_barcode,
                    'destination': process_barcode,
                    'mirror': paired_output,
                    'process_name': process_name,
                    'state': 'IN_PROCESS',
                    'timestamp': TimeService.format_for_display(current_time)
                }
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Flow transaction failed: {str(e)}',
                'error_type': 'TRANSACTION_FAILED'
            }
    
    @staticmethod
    def transfer_process_to_trolley(output_barcode, trolley_barcode):
        """
        FLOW STAGE 2: Processor → Carrier
        PR-01-out(IN_PROCESS) → TR-02(EMPTY or NON-EXISTENT)
        """
        
        # Validate process output state
        process_output = db.fetch_one(
            "SELECT * FROM process_barcodes WHERE barcode = %s AND process_type = 'output' AND state = 'IN_PROCESS'",
            (output_barcode,)
        )
        
        if not process_output:
            return {
                'success': False,
                'message': 'Process output is empty or not in progress. Cannot transfer.',
                'error_type': 'PROCESSOR_EMPTY'
            }
        
        # Extract process data (payload)
        payload = {
            'customer_name': process_output['customer_name'],
            'lot_number': process_output['lot_number'],
            'design_name': process_output['design_name'],
            'design_number': process_output['design_number'],
            'grey_width': process_output['grey_width'],
            'finish_width': process_output['finish_width'],
            'fabric_quality': process_output['fabric_quality'],
            'total_trolley': process_output['total_trolley'],
            'meters': process_output['meters'],
            'matching': process_output['matching'],
            'order_receive_date': process_output['order_receive_date'],
            'grey_receive_date': process_output['grey_receive_date'],
            'remarks': process_output['remarks'],
            'pack_instructions': process_output['pack_instructions']
        }
        
        # Get flow metadata
        paired_input = process_output.get('paired_barcode')
        process_code = output_barcode.rsplit('-', 1)[0] if '-' in output_barcode else output_barcode
        process_name = process_output.get('process_name')
        source_trolley = process_output.get('source_trolley_barcode')
        start_time = process_output.get('process_start_time')
        
        # ⭐ TIME ENGINE: Get current timestamp
        current_time = TimeService.get_db_timestamp()
        
        # Calculate duration
        duration_seconds = TimeService.calculate_duration(start_time, current_time) if start_time else None
        
        # Check if target trolley exists
        existing_trolley = db.fetch_one(
            "SELECT * FROM trolley_barcodes WHERE barcode = %s",
            (trolley_barcode,)
        )
        
        # Build transaction
        operations = []
        
        # Migrate data to trolley
        if existing_trolley:
            operations.append((
                """UPDATE trolley_barcodes SET 
                state = 'FULL',
                customer_name = %s, lot_number = %s, design_name = %s, design_number = %s,
                grey_width = %s, finish_width = %s, fabric_quality = %s, total_trolley = %s,
                meters = %s, matching = %s, order_receive_date = %s, grey_receive_date = %s,
                remarks = %s, pack_instructions = %s,
                attached_at = %s
                WHERE barcode = %s""",
                (payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
                 payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
                 payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
                 payload['remarks'], payload['pack_instructions'],
                 current_time, trolley_barcode)
            ))
        else:
            # Auto-provision new trolley
            operations.append((
                """INSERT INTO trolley_barcodes 
                (barcode, state, customer_name, lot_number, design_name, design_number, grey_width,
                 finish_width, fabric_quality, total_trolley, meters, matching, order_receive_date,
                 grey_receive_date, remarks, pack_instructions, attached_at, created_at) 
                VALUES (%s, 'FULL', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (trolley_barcode, 
                 payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
                 payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
                 payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
                 payload['remarks'], payload['pack_instructions'],
                 current_time, current_time)
            ))
        
        # Reset output process
        operations.append((
            """UPDATE process_barcodes SET 
            state = 'EMPTY',
            customer_name = NULL, lot_number = NULL, design_name = NULL,
            design_number = NULL, grey_width = NULL, finish_width = NULL, fabric_quality = NULL,
            total_trolley = NULL, meters = NULL, matching = NULL, order_receive_date = NULL,
            grey_receive_date = NULL, remarks = NULL, pack_instructions = NULL,
            source_trolley_barcode = NULL, process_name = NULL,
            process_start_time = NULL, process_end_time = %s, attached_at = NULL
            WHERE barcode = %s""",
            (current_time, output_barcode)
        ))
        
        # Reset input process (paired)
        if paired_input:
            operations.append((
                """UPDATE process_barcodes SET 
                state = 'EMPTY',
                customer_name = NULL, lot_number = NULL, design_name = NULL,
                design_number = NULL, grey_width = NULL, finish_width = NULL, fabric_quality = NULL,
                total_trolley = NULL, meters = NULL, matching = NULL, order_receive_date = NULL,
                grey_receive_date = NULL, remarks = NULL, pack_instructions = NULL,
                source_trolley_barcode = NULL, process_name = NULL,
                process_start_time = NULL, process_end_time = %s, attached_at = NULL
                WHERE barcode = %s""",
                (current_time, paired_input)
            ))
        
        # Record flow completion
        operations.append((
            """INSERT INTO tracking_history 
            (event_type, process_code, process_name, input_trolley, output_trolley,
             process_input_barcode, process_output_barcode,
             customer_name, lot_number, design_name, design_number, grey_width,
             finish_width, fabric_quality, total_trolley, meters, matching, order_receive_date,
             grey_receive_date, remarks, pack_instructions,
             process_barcode, trolley_barcode, from_barcode, to_barcode,
             process_start_time, process_end_time, duration_seconds, status, created_at) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            ('process_output', process_code, process_name,
             source_trolley, trolley_barcode, paired_input, output_barcode,
             payload['customer_name'], payload['lot_number'], payload['design_name'], payload['design_number'],
             payload['grey_width'], payload['finish_width'], payload['fabric_quality'], payload['total_trolley'],
             payload['meters'], payload['matching'], payload['order_receive_date'], payload['grey_receive_date'],
             payload['remarks'], payload['pack_instructions'],
             output_barcode, trolley_barcode, output_barcode, trolley_barcode,
             start_time, current_time, duration_seconds, 'completed', current_time)
        ))
        
        # Execute atomic transaction
        try:
            db.execute_transaction(operations)
            
            return {
                'success': True,
                'message': f'Data migrated from {output_barcode} to {trolley_barcode}',
                'flow_state': 'PROCESSOR_TO_CARRIER',
                'data': {
                    'source': output_barcode,
                    'destination': trolley_barcode,
                    'process_name': process_name,
                    'original_trolley': source_trolley,
                    'duration_seconds': duration_seconds,
                    'state': 'COMPLETED',
                    'carrier_provisioned': not existing_trolley,
                    'timestamp': TimeService.format_for_display(current_time)
                }
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Flow transaction failed: {str(e)}',
                'error_type': 'TRANSACTION_FAILED'
            }


# ============================================================================
# API ENDPOINTS
# ============================================================================

@process_bp.route('/input', methods=['POST'])
def process_input():
    """API: Carrier → Processor flow"""
    try:
        data = request.get_json()
        trolley_barcode = data.get('trolleyBarcode')
        process_barcode = data.get('processBarcode')
        process_name = data.get('processName', 'Unknown Process')
        
        if not all([trolley_barcode, process_barcode]):
            return jsonify({'success': False, 'message': 'Trolley and process barcodes required'}), 400
        
        result = WorkflowEngine.transfer_trolley_to_process(
            trolley_barcode, 
            process_barcode, 
            process_name
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Process input error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': f'Server error: {str(e)}',
            'error_type': 'SERVER_ERROR'
        }), 500


@process_bp.route('/output', methods=['POST'])
def process_output():
    """API: Processor → Carrier flow"""
    try:
        data = request.get_json()
        output_barcode = data.get('outputBarcode')
        trolley_barcode = data.get('trolleyBarcode')
        
        if not all([output_barcode, trolley_barcode]):
            return jsonify({'success': False, 'message': 'Output and trolley barcodes required'}), 400
        
        result = WorkflowEngine.transfer_process_to_trolley(
            output_barcode,
            trolley_barcode
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"Process output error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'error_type': 'SERVER_ERROR'
        }), 500


@process_bp.route('/check/<barcode>', methods=['GET'])
def check_process(barcode):
    """API: Get process barcode state and type"""
    try:
        process = db.fetch_one(
            "SELECT * FROM process_barcodes WHERE barcode = %s",
            (barcode,)
        )
        
        if process:
            return jsonify({
                'success': True,
                'exists': True,
                'data': process,
                'state': process['state'],
                'processType': process['process_type'],
                'pairedBarcode': process['paired_barcode']
            })
        else:
            return jsonify({
                'success': True,
                'exists': False,
                'state': 'NOT_FOUND'
            })
    except Exception as e:
        print(f"Check process error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500


@process_bp.route('/transfer', methods=['POST'])
def transfer_to_trolley():
    """Legacy endpoint - redirects to /output"""
    return process_output()
