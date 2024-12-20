import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";

// Enable debug logging
setLogLevel("debug");

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOxohCyJrmEq80-_EmX2_zbwasiMKbgx0",
  authDomain: "digivoucher-d6f3e.firebaseapp.com",
  projectId: "digivoucher-d6f3e",
  storageBucket: "digivoucher-d6f3e.appspot.com",
  messagingSenderId: "484728387363",
  appId: "1:484728387363:web:5283f8f1baaa9088e4fe96",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Populate Company List
async function populateCompanies() {
  try {
    const companiesRef = collection(db, "companies");
    const companiesSnapshot = await getDocs(companiesRef);
    const companyList = document.getElementById("companyList");
    companyList.innerHTML = ""; // Clear existing options

    companiesSnapshot.forEach((doc) => {
      const option = document.createElement("option");
      option.value = doc.id; // Use document ID as the value
      companyList.appendChild(option);
    });
  } catch (error) {
    console.error("Error populating company list:", error);
  }
}
populateCompanies();

// Registration
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const company = document.getElementById("regCompany").value.toLowerCase(); // Ensure consistent casing
  const role = document.getElementById("regRole").value;

  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Add user details to Firestore using the userId as the document ID
    const userRef = doc(db, "users", company, role, name);
    await setDoc(userRef, {
      name,
      password,
      email,
      role,
      userId,
    });

    alert("Registration successful!");

    // Store user data in localStorage for future use
    const userData = { email, company, role, userId };
    localStorage.setItem("userData", JSON.stringify(userData));

    // Redirect user based on their role after registration
    if (role === "employee") {
      window.location.href = "employee.html";
    } else if (role === "manager") {
      window.location.href = "manager.html";
    } else if (role === "accountant") {
      window.location.href = "accountant.html";
    }
    else if (role === "superboss") {
      window.location.href = "superboss.html";
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Registration failed: " + error.message);
  }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const company = document.getElementById("loginCompany").value.toLowerCase(); // Ensure consistent casing
  const role = document.getElementById("loginRole").value.toLowerCase(); // Get selected role from dropdown

  try {
    // Authenticate the user with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Fetch the subcollection for the specified role
    const roleCollectionRef = collection(db, "users", company, role);
    const querySnapshot = await getDocs(roleCollectionRef);

    // Find the user document by email
    let userDoc = null;
    querySnapshot.forEach((doc) => {
      if (doc.data().email === email) {
        userDoc = doc; // Store the matched document
      }
    });

    if (userDoc) {
      const userData = userDoc.data();
      console.log("User data:", userData);

      // Store user data in localStorage for future use
      const userDataToStore = { email, company, role, userId };
      localStorage.setItem("userData", JSON.stringify(userDataToStore));

      // Redirect the user based on their role
      if (role === "employee") {
        window.location.href = "employee.html";
      } else if (role === "manager") {
        window.location.href = "manager.html";
      } else if (role === "accountant") {
        window.location.href = "accountant.html";
      }else if (role === "superboss") {
        window.location.href = "superboss.html";
      }
    } else {
      // If the user is not found in the selected role
      throw new Error("User not found under the selected role. Please check your credentials or contact support.");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + error.message);
  }
});

// On page load
window.onload = function () {
  const auth = getAuth();

  // Clear session and sign out the user
  localStorage.removeItem("userData");
  signOut(auth)
    .then(() => {
      console.log("User successfully logged out.");
    })
    .catch((error) => {
      console.error("Error logging out user:", error);
    });

  // Prevent navigating back to logged-in pages
  history.pushState(null, null, location.href);

  // Disable forward/back navigation
  window.onpopstate = function () {
    history.pushState(null, null, location.href);
  };
};
