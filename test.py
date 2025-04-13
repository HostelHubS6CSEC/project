# tests/test_authentication.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"
STUDENT_USER = {"roll_no": "16", "password": "Sree@123"}
ADMIN_USER = {"roll_no": "admin1", "password": "admin123"}
WARDEN_USER = {"roll_no": "warden1", "password": "admin123"}
SECURITY_USER = {"roll_no": "security1", "password": "admin123"}
MESS_USER = {"roll_no": "mess1", "password": "admin123"}
PAGES = ["/student", "/warden", "/mess", "/security", "/admin"]

class TestAuthentication:
    def __init__(self):
        service = Service(executable_path="C:/Users/ksree/OneDrive/Desktop/chromedriver-win64/chromedriver.exe")
        self.driver = webdriver.Chrome(service=service)
        self.wait = WebDriverWait(self.driver, 20)

    def login(self, roll_no, password, expected_role):
        self.driver.get(f"{BASE_URL}/")
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Roll No']")))
        roll_no_field = self.driver.find_element(By.XPATH, "//input[@placeholder='Roll No']")
        roll_no_field.send_keys(roll_no)
        password_field = self.driver.find_element(By.XPATH, "//input[@placeholder='Password']")
        password_field.send_keys(password)
        login_button = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Login')]")
        login_button.click()
        self.wait.until(EC.url_contains(f"/{expected_role}"))
        self.wait.until(lambda driver: driver.execute_script("return document.readyState") == "complete")
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Welcome')]")))

    def test_student_login(self):
        print("Testing Student Login...")
        self.login(STUDENT_USER["roll_no"], STUDENT_USER["password"], "student")
        assert "/student" in self.driver.current_url, "Student not redirected to dashboard"
        assert "Welcome" in self.driver.page_source, "Student dashboard not loaded"
        for page in ["/warden", "/mess", "/security"]:
            self.driver.get(f"{BASE_URL}{page}")
            assert "/login" not in self.driver.current_url, f"Student denied access to {page}"
        self.driver.get(f"{BASE_URL}/admin")
        assert "/admin" not in self.driver.current_url, "Student accessed admin page"
        self.driver.get(f"{BASE_URL}/student")
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Welcome')]")))
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Student Login test")

    def test_admin_login(self):
        print("Testing Admin Login...")
        self.login(ADMIN_USER["roll_no"], ADMIN_USER["password"], "admin")
        assert "/admin" in self.driver.current_url, "Admin not redirected to dashboard"
        assert "Welcome" in self.driver.page_source, "Admin dashboard not loaded"
        for page in PAGES:
            self.driver.get(f"{BASE_URL}{page}")
            assert "/login" not in self.driver.current_url, f"Admin denied access to {page}"
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Admin Login test")

    def test_warden_login(self):
        print("Testing Warden Login...")
        self.login(WARDEN_USER["roll_no"], WARDEN_USER["password"], "warden")
        assert "/warden" in self.driver.current_url, "Warden not redirected to dashboard"
        assert "Welcome" in self.driver.page_source, "Warden dashboard not loaded"
        for page in ["/student", "/mess", "/security", "/admin"]:
            self.driver.get(f"{BASE_URL}{page}")
            assert "/warden" in self.driver.current_url or "/login" not in self.driver.current_url, f"Warden should not access {page}"
        self.driver.get(f"{BASE_URL}/warden")
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Warden Login test")

    def test_security_login(self):
        print("Testing Security Login...")
        self.login(SECURITY_USER["roll_no"], SECURITY_USER["password"], "security")
        assert "/security" in self.driver.current_url, "Security not redirected to dashboard"
        assert "Welcome" in self.driver.page_source, "Security dashboard not loaded"
        for page in ["/student", "/warden", "/mess", "/admin"]:
            self.driver.get(f"{BASE_URL}{page}")
            assert "/security" in self.driver.current_url or "/login" not in self.driver.current_url, f"Security should not access {page}"
        self.driver.get(f"{BASE_URL}/security")
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Security Login test")

    def test_mess_login(self):
        print("Testing Mess Login...")
        self.login(MESS_USER["roll_no"], MESS_USER["password"], "mess")
        assert "/mess" in self.driver.current_url, "Mess not redirected to dashboard"
        assert "Welcome" in self.driver.page_source, "Mess dashboard not loaded"
        for page in ["/student", "/warden", "/security", "/admin"]:
            self.driver.get(f"{BASE_URL}{page}")
            assert "/mess" in self.driver.current_url or "/login" not in self.driver.current_url, f"Mess should not access {page}"
        self.driver.get(f"{BASE_URL}/mess")
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Mess Login test")

    def test_session_persistence(self):
        print("Testing Session Persistence...")
        self.login(STUDENT_USER["roll_no"], STUDENT_USER["password"], "student")
        self.driver.get(f"{BASE_URL}/student")
        self.driver.delete_all_cookies()
        self.driver.refresh()
        assert "/student" in self.driver.current_url, "Session not persisted"
        logout_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Logout']")))
        logout_button.click()
        self.wait.until(EC.url_to_be(f"{BASE_URL}/"))
        print("Passed Session Persistence test")

    def run_tests(self):
        try:
            self.test_student_login()
            self.test_admin_login()
            self.test_warden_login()
            self.test_security_login()
            self.test_mess_login()
            self.test_session_persistence()
            print("Passed all tests!")
        except AssertionError as e:
            print(f"Test failed: {e}")
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
        finally:
            self.driver.quit()

if __name__ == "__main__":
    tester = TestAuthentication()
    tester.run_tests()