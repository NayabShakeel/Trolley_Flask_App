#  Trolley Tracking System 


## ⚡ Quick Start

### 1. Setup Database
```bash
mysql -u root -p < database_schema_fixed.sql
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 3. Install & Run
```bash
pip install -r requirements.txt
python app.py
```

### 4. Access
```
http://localhost:5500
```

**That's it!** See `QUICK_START.md` for detailed testing steps.

---

## 🧪 Testing

After setup, test the complete flow:

1. ✅ Attach data to TR-01
2. ✅ Verify all parameters appear
3. ✅ Connect TR-01 → PR-01-in
4. ✅ Check PR-01-out has same data (automatic)
5. ✅ Check TR-01 is EMPTY
6. ✅ Connect PR-01-out → TR-02
7. ✅ Check TR-02 has data
8. ✅ Check both PR barcodes are EMPTY
9. ✅ View history with start/end/duration

**All tests should pass!**


## 📦 Package Contents

```
trolley-app-FIXED/
├── README.md                        # This file
├── QUICK_START.md                   # 5-minute guide
├── INSTALLATION_GUIDE.md            # Detailed setup
├── FIXES_AND_IMPROVEMENTS.md        # Technical details
├── database_schema_fixed.sql        # Complete schema
├── requirements.txt                 # Python dependencies
├── .env.example                     # Configuration template
├── app.py                           # Main application
├── setup_database.bat               # Windows DB setup
├── start.bat                        # Windows app start
├── config/
│   └── database.py                  # DB with transactions
├── app/
│   ├── controllers/
│   │   ├── trolley_controller.py   # State management
│   │   ├── process_controller.py   # Auto-mirroring
│   │   ├── barcode_controller.py   # Enhanced search
│   │   ├── history_controller.py   # Duration tracking
│   │   └── ...
│   ├── templates/                   # HTML pages
│   └── static/                      # CSS/JS assets
```

