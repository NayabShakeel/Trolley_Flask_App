from flask import Blueprint, request, jsonify
from config.database import Database

history_bp = Blueprint('history', __name__)
db = Database()

@history_bp.route('/', methods=['GET'])
@history_bp.route('', methods=['GET'])
def get_history():
    """Default history endpoint - redirects to /all"""
    return get_all_history()

@history_bp.route('/all', methods=['GET'])
def get_all_history():
    """
    Get all history records with pagination
    Now includes: start time, end time, duration
    """
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        offset = (page - 1) * limit
        
        # Get total count
        count = db.fetch_one('SELECT COUNT(*) as total FROM tracking_history')
        total = count['total'] if count else 0
        
        # Fetch history with formatted duration
        history = db.fetch_all(
            '''SELECT 
                id, event_type, process_code, process_name,
                input_trolley, output_trolley,
                process_input_barcode, process_output_barcode,
                customer_name, lot_number, design_name, design_number,
                grey_width, finish_width, fabric_quality, total_trolley,
                meters, matching, order_receive_date, grey_receive_date,
                remarks, pack_instructions,
                trolley_barcode, process_barcode, from_barcode, to_barcode,
                process_start_time, process_end_time, duration_seconds,
                CASE 
                    WHEN duration_seconds IS NOT NULL THEN
                        CONCAT(
                            FLOOR(duration_seconds / 3600), 'h ',
                            FLOOR((duration_seconds % 3600) / 60), 'm ',
                            duration_seconds % 60, 's'
                        )
                    ELSE '-'
                END as duration_formatted,
                status, created_by, created_at
            FROM tracking_history 
            ORDER BY created_at DESC 
            LIMIT %s OFFSET %s''',
            (limit, offset)
        )
        
        return jsonify({
            'success': True,
            'data': history,
            'pagination': {
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit if total > 0 else 0
            }
        })
    except Exception as e:
        print(f"History all error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@history_bp.route('/search', methods=['GET'])
def search_history():
    """
    Search history by various parameters
    """
    try:
        query = request.args.get('query', '')
        
        history = db.fetch_all(
            """SELECT 
                id, event_type, process_code, process_name,
                input_trolley, output_trolley,
                process_input_barcode, process_output_barcode,
                customer_name, lot_number, design_name, design_number,
                grey_width, finish_width, fabric_quality, total_trolley,
                meters, matching, order_receive_date, grey_receive_date,
                remarks, pack_instructions,
                trolley_barcode, process_barcode, from_barcode, to_barcode,
                process_start_time, process_end_time, duration_seconds,
                CASE 
                    WHEN duration_seconds IS NOT NULL THEN
                        CONCAT(
                            FLOOR(duration_seconds / 3600), 'h ',
                            FLOOR((duration_seconds % 3600) / 60), 'm ',
                            duration_seconds % 60, 's'
                        )
                    ELSE '-'
                END as duration_formatted,
                status, created_at
            FROM tracking_history 
            WHERE customer_name LIKE %s 
               OR lot_number LIKE %s
               OR design_name LIKE %s
               OR trolley_barcode LIKE %s 
               OR process_barcode LIKE %s 
               OR fabric_quality LIKE %s
               OR input_trolley LIKE %s
               OR output_trolley LIKE %s
               OR process_code LIKE %s
               OR process_name LIKE %s
            ORDER BY created_at DESC 
            LIMIT 100""",
            (f'%{query}%', f'%{query}%', f'%{query}%', f'%{query}%', 
             f'%{query}%', f'%{query}%', f'%{query}%', f'%{query}%',
             f'%{query}%', f'%{query}%')
        )
        
        return jsonify({
            'success': True,
            'data': history,
            'count': len(history)
        })
    except Exception as e:
        print(f"History search error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@history_bp.route('/process/<process_code>', methods=['GET'])
def get_process_history(process_code):
    """
    Get history for a specific process code (e.g., PR-01)
    """
    try:
        history = db.fetch_all(
            """SELECT 
                id, event_type, process_code, process_name,
                input_trolley, output_trolley,
                process_input_barcode, process_output_barcode,
                customer_name, lot_number, design_name, design_number,
                grey_width, finish_width, fabric_quality, total_trolley,
                meters, matching, order_receive_date, grey_receive_date,
                remarks, pack_instructions,
                process_start_time, process_end_time, duration_seconds,
                CASE 
                    WHEN duration_seconds IS NOT NULL THEN
                        CONCAT(
                            FLOOR(duration_seconds / 3600), 'h ',
                            FLOOR((duration_seconds % 3600) / 60), 'm ',
                            duration_seconds % 60, 's'
                        )
                    ELSE '-'
                END as duration_formatted,
                status, created_at
            FROM tracking_history 
            WHERE process_code = %s
            ORDER BY created_at DESC 
            LIMIT 100""",
            (process_code,)
        )
        
        return jsonify({
            'success': True,
            'processCode': process_code,
            'data': history,
            'count': len(history)
        })
    except Exception as e:
        print(f"Process history error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@history_bp.route('/trolley/<trolley_barcode>', methods=['GET'])
def get_trolley_history(trolley_barcode):
    """
    Get complete journey of a trolley barcode
    """
    try:
        history = db.fetch_all(
            """SELECT 
                id, event_type, process_code, process_name,
                input_trolley, output_trolley,
                process_input_barcode, process_output_barcode,
                customer_name, lot_number, design_name, design_number,
                grey_width, finish_width, fabric_quality, total_trolley,
                meters, matching, order_receive_date, grey_receive_date,
                remarks, pack_instructions,
                process_start_time, process_end_time, duration_seconds,
                CASE 
                    WHEN duration_seconds IS NOT NULL THEN
                        CONCAT(
                            FLOOR(duration_seconds / 3600), 'h ',
                            FLOOR((duration_seconds % 3600) / 60), 'm ',
                            duration_seconds % 60, 's'
                        )
                    ELSE '-'
                END as duration_formatted,
                status, created_at
            FROM tracking_history 
            WHERE trolley_barcode = %s
               OR input_trolley = %s
               OR output_trolley = %s
            ORDER BY created_at DESC""",
            (trolley_barcode, trolley_barcode, trolley_barcode)
        )
        
        return jsonify({
            'success': True,
            'trolleyBarcode': trolley_barcode,
            'data': history,
            'count': len(history)
        })
    except Exception as e:
        print(f"Trolley history error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@history_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    Get statistics about the system
    """
    try:
        # Total events
        total_events = db.fetch_one('SELECT COUNT(*) as count FROM tracking_history')
        
        # Active processes
        active_processes = db.fetch_one(
            "SELECT COUNT(*) as count FROM process_barcodes WHERE state = 'IN_PROCESS'"
        )
        
        # Full trolleys
        full_trolleys = db.fetch_one(
            "SELECT COUNT(*) as count FROM trolley_barcodes WHERE state = 'FULL'"
        )
        
        # Events by type
        events_by_type = db.fetch_all(
            """SELECT event_type, COUNT(*) as count 
            FROM tracking_history 
            GROUP BY event_type"""
        )
        
        # Average process duration
        avg_duration = db.fetch_one(
            """SELECT 
                AVG(duration_seconds) as avg_seconds,
                MIN(duration_seconds) as min_seconds,
                MAX(duration_seconds) as max_seconds
            FROM tracking_history 
            WHERE duration_seconds IS NOT NULL"""
        )
        
        return jsonify({
            'success': True,
            'stats': {
                'totalEvents': total_events['count'] if total_events else 0,
                'activeProcesses': active_processes['count'] if active_processes else 0,
                'fullTrolleys': full_trolleys['count'] if full_trolleys else 0,
                'eventsByType': events_by_type or [],
                'averageDuration': {
                    'seconds': avg_duration['avg_seconds'] if avg_duration and avg_duration['avg_seconds'] else 0,
                    'minutes': round(avg_duration['avg_seconds'] / 60, 2) if avg_duration and avg_duration['avg_seconds'] else 0,
                    'formatted': f"{int(avg_duration['avg_seconds'] // 3600)}h {int((avg_duration['avg_seconds'] % 3600) // 60)}m" if avg_duration and avg_duration['avg_seconds'] else 'N/A'
                },
                'minDuration': avg_duration['min_seconds'] if avg_duration and avg_duration['min_seconds'] else 0,
                'maxDuration': avg_duration['max_seconds'] if avg_duration and avg_duration['max_seconds'] else 0
            }
        })
    except Exception as e:
        print(f"Stats error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500
