import pymysql

passwords = ["", "root", "password", "123456", "lsrw_password", "admin"]
users = ["root", "lsrw"]

found = False
for u in users:
    for p in passwords:
        try:
            conn = pymysql.connect(host='127.0.0.1', port=3306, user=u, password=p, connect_timeout=2)
            print(f"SUCCESS: Connected with user='{u}', password='{p}'")
            
            # Check if lsrw_ai database exists or create it
            with conn.cursor() as cursor:
                cursor.execute("CREATE DATABASE IF NOT EXISTS lsrw_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                print("SUCCESS: Database 'lsrw_ai' created or already exists!")
            conn.close()
            found = True
            break
        except Exception as e:
            pass
    if found:
        break

if not found:
    print("COULD_NOT_AUTO_CONNECT")
