"""Seed script to create a demo user and sample items."""
from . import database, crud

# ensure database tables exist
database.init_db()


def run():
    db = database.SessionLocal()
    try:
        user = crud.get_user_by_username(db, "demo")
        if not user:
            user = crud.create_user(db, "demo", "demopass")
            print("Created demo user: demo / demopass")
        else:
            print("Demo user already exists")

        admin = crud.get_user_by_username(db, "admin")
        if not admin:
            admin = crud.create_user(db, "admin", "adminpass", role='admin')
            print("Created admin user: admin / adminpass")
        else:
            print("Admin user already exists")

        # create some demo items
        for i in range(1, 7):
            title = f"Demo Item {i}"
            crud.create_item_for_user(db, user.id, title, category=("alpha" if i%2==0 else "beta"), description=f"Auto-generated item {i}")
        print("Seeded demo items")
    finally:
        db.close()


if __name__ == '__main__':
    run()
