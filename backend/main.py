from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from datetime import datetime
import uuid, shutil, os
import models, schemas
from uuid import uuid4
import pytz
from database import engine, get_db
from typing import List
from reportlab.pdfgen import canvas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(debug=True)

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend"))
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
RECEIPTS_DIR = os.path.join(BASE_DIR, "receipts")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(RECEIPTS_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=ASSETS_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.mount("/receipts", StaticFiles(directory=RECEIPTS_DIR), name="receipts")

# Handle favicon.ico to prevent 404 error
@app.get("/favicon.ico")
def favicon():
    return Response(content="", media_type="image/x-icon")

# Serve HTML
@app.get("/", response_class=HTMLResponse)
def serve_root():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/home", response_class=HTMLResponse)
def serve_home():
    return HTMLResponse("""
    <h2>Laundry App Pages</h2>
    <ul>
        <li><a href="/register.html">Register</a></li>
        <li><a href="/login.html">Login</a></li>
        <li><a href="/dashboard.html">Dashboard</a></li>
        <li><a href="/admin.html">Admin Panel</a></li>
        <li><a href="/track.html">Track Orders</a></li>
        <li><a href="/orders.html">Orders</a></li>
    </ul>
    """)

@app.get("/index.html")
def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/register.html")
def serve_register():
    return FileResponse(os.path.join(FRONTEND_DIR, "register.html"))

@app.get("/login.html")
def serve_login():
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"))

@app.get("/dashboard.html")
def serve_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

@app.get("/admin.html")
def serve_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))

@app.get("/track.html")
def serve_track():
    return FileResponse(os.path.join(FRONTEND_DIR, "track.html"))

@app.get("/orders.html")
def serve_orders():
    return FileResponse(os.path.join(FRONTEND_DIR, "orders.html"))

notifications = []

def generate_receipt(order, path):
    c = canvas.Canvas(path)
    c.drawString(100, 750, f"Receipt for Order ID: {order.id}")
    c.drawString(100, 730, f"Item: {order.item_type}")
    c.drawString(100, 710, f"Quantity: {order.quantity}")
    c.drawString(100, 690, f"Hostel: {order.hostel_name or 'N/A'}")
    c.drawString(100, 670, f"Room No: {order.room_number or 'N/A'}")
    c.drawString(100, 650, f"Pickup Slot: {order.pickup_time_slot or 'N/A'}")
    c.drawString(100, 630, f"Total Price: ₹{order.total_price}")
    c.drawString(100, 610, f"Status: {order.status}")
    c.drawString(100, 590, f"Date: {order.date_created.strftime('%Y-%m-%d %H:%M')}")
    c.save()

@app.get("/download-receipt/{order_id}")
def download_receipt(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    receipt_filename = f"receipt_{order.id}.pdf"
    receipt_path = os.path.join(RECEIPTS_DIR, receipt_filename)

    if not os.path.exists(receipt_path):
        generate_receipt(order, receipt_path)

    return FileResponse(path=receipt_path, filename=receipt_filename, media_type='application/pdf')

@app.get("/order/{order_id}", response_model=schemas.OrderOut)
def get_order_by_id(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return schemas.OrderOut.from_orm(order)

@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = models.User(
        id=str(uuid.uuid4()), username=user.username,
        password=user.password, email=user.email,
        phone=user.phone, plan=user.plan, role="user"
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.username == user.username,
        models.User.password == user.password
    ).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "message": "Login successful",
        "user_id": db_user.id,
        "role": db_user.role,
        "plan": db_user.plan
    }

@app.post("/upload-request")
def upload_request(
    user_id: str = Form(...),
    item_type: str = Form(...),
    quantity: int = Form(...),
    note: str = Form(None),
    payment_method: str = Form(None),
    hostel_name: str = Form(None),
    room_number: str = Form(None),
    pickup_time_slot: str = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    image_url = None
    if image:
        file_path = os.path.join("uploads", f"{uuid.uuid4()}_{image.filename}")
        full_path = os.path.join(BASE_DIR, file_path)
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = file_path

    new_request = models.LaundryRequest(
        id=str(uuid.uuid4()), user_id=user_id,
        item_type=item_type, quantity=quantity,
        note=note, payment_method=payment_method,
        image_url=image_url, status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(new_request)

    price_entry = db.query(models.Pricing).filter(models.Pricing.item_type == item_type).first()
    unit_price = price_entry.price if price_entry else 50
    total_price = unit_price * quantity

    new_order = models.Order(
        id=str(uuid.uuid4()), item_type=item_type,
        quantity=quantity, status="Pending", user_id=user_id,
        hostel_name=hostel_name, room_number=room_number,
        pickup_time_slot=pickup_time_slot, total_price=total_price,
        date_created=datetime.utcnow()
    )
    db.add(new_order)
    db.commit()

    notifications.append(f"New request for {item_type} by user {user_id}")
    return {"message": "Laundry request and order submitted", "request_id": new_request.id, "order_id": new_order.id}

@app.get("/order-history/{user_id}")
def order_history(user_id: str, month: int = None, year: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Order).filter(models.Order.user_id == user_id)
    if month or year:
        ist = pytz.timezone("Asia/Kolkata")
        now = datetime.now(ist)
        if not year: year = now.year
        if not month: month = now.month
        query = query.filter(
            extract("month", models.Order.date_created) == month,
            extract("year", models.Order.date_created) == year
        )
    return query.all()

@app.get("/all-orders", response_model=List[schemas.OrderOut])
def get_all_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    return [schemas.OrderOut.from_orm(order) for order in orders]

@app.get("/pricing")
def get_all_pricing(db: Session = Depends(get_db)):
    prices = db.query(models.Pricing).all()
    return {p.item_type: p.price for p in prices}

@app.post("/pricing")
def set_pricing(pricing: schemas.PricingUpdate, db: Session = Depends(get_db)):
    existing = db.query(models.Pricing).filter(models.Pricing.item_type == pricing.item_type).first()
    if existing:
        existing.price = pricing.price
    else:
        new_price = models.Pricing(item_type=pricing.item_type, price=pricing.price)
        db.add(new_price)
    db.commit()
    return {"message": "Pricing updated"}

@app.get("/calculate-price")
def calculate_price(item_type: str, quantity: int, db: Session = Depends(get_db)):
    entry = db.query(models.Pricing).filter(models.Pricing.item_type == item_type).first()
    price = entry.price if entry else 50
    return {"estimated_price": price * quantity}

@app.get("/notifications")
def get_notifications():
    return notifications[-10:]

@app.get("/user/notifications/{user_id}")
def user_notifications(user_id: str, db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.user_id == user_id, models.Order.status == "Completed").all()
    return [{"order_id": o.id, "status": o.status} for o in orders]

@app.get("/admin/summary")
def get_admin_summary(db: Session = Depends(get_db)):
    total_users = db.query(func.count(models.User.id)).scalar()
    completed_orders = db.query(func.count(models.Order.id)).filter(models.Order.status == "Completed").scalar()
    total_revenue = db.query(func.sum(models.Order.total_price)).scalar() or 0
    most_washed = db.query(models.Order.item_type, func.count(models.Order.item_type).label("count"))\
        .group_by(models.Order.item_type).order_by(func.count(models.Order.item_type).desc()).first()
    return {
        "total_users": total_users,
        "completed_orders": completed_orders,
        "total_revenue": total_revenue,
        "most_washed_item": most_washed[0] if most_washed else "N/A"
    }

@app.get("/create-admin")
def create_admin(db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == "admin").first()
    if existing:
        return {"message": "Admin already exists"}

    admin = models.User(
        id=str(uuid4()), username="admin", password="admin123",
        email="admin@example.com", phone="9999999999",
        plan="premium", role="admin"
    )
    db.add(admin)
    db.commit()
    return {"message": "✅ Admin created: username=admin, password=admin123"}

@app.get("/admin/orders-per-month")
def orders_per_month(db: Session = Depends(get_db)):
    results = db.query(
        extract("month", models.Order.date_created).label("month"),
        func.count(models.Order.id).label("count")
    ).group_by(extract("month", models.Order.date_created)).all()

    return [{"month": int(month), "count": count} for month, count in results]

@app.put("/admin/update-status/{order_id}")
def mark_order_completed(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "Pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be marked as completed")

    order.status = "Completed"
    db.commit()

    notifications.append(f"✅ Order {order.id} completed for user {order.user_id}")

    return {"message": "Order marked as completed and user notified"}

@app.put("/cancel-order/{order_id}")
def cancel_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != "Pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    order.status = "Cancelled"
    db.commit()

    notifications.append(f"🚫 Order {order.id} cancelled by user {order.user_id}")

    return {"message": "Order cancelled successfully"}

@app.post("/feedback/{order_id}")
def submit_feedback(order_id: str, feedback: str = Form(...), db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.feedback = feedback
    db.commit()

    return {"message": "Feedback submitted successfully"}
