import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  setDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOxohCyJrmEq80-_EmX2_zbwasiMKbgx0",
  authDomain: "digivoucher-d6f3e.firebaseapp.com",
  projectId: "digivoucher-d6f3e",
  storageBucket: "digivoucher-d6f3e.appspot.com",
  messagingSenderId: "484728387363",
  appId: "1:484728387363:web:5283f8f1baaa9088e4fe96",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore, Auth, and Storage
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM Elements
const paidToField = document.getElementById("paidTo");
const billNoField = document.getElementById("billNo");
const createVoucherBtn = document.getElementById("createVoucherBtn");
const voucherPopup = document.getElementById("voucherPopup");
const closePopup = document.getElementById("closePopup");
const totalField = document.getElementById("total");
const inWordsField = document.getElementById("inWords");
const submitVoucherBtn = document.getElementById("submitVoucherBtn");
const fetchVouchersBtn = document.getElementById("fetchVouchersBtn");
const voucherTableBody = document.getElementById("voucherTableBody");

let companyInitials = "";
let currentSerialNumber = 1;
let employeeName = "";

// Utility Functions
function generateRandomCode(length = 2) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return result;
}


async function fetchLatestSerialNumber() {
  const metadataDoc = doc(db, "metadata", "serialNumbers");
  try {
    const metadataSnapshot = await getDoc(metadataDoc);
    if (metadataSnapshot.exists()) {
      const data = metadataSnapshot.data();
      companyInitials = data.prefix || companyInitials;
      currentSerialNumber = data.lastSerialNumber + 1 || currentSerialNumber;
    }
  } catch (error) {
    console.error("Error fetching latest serial number:", error);
  }
}

function generateUniqueBillNumber() {
  const randomCode = generateRandomCode();
  const serialNumber = String(currentSerialNumber).padStart(4, "0");
  return `E-${randomCode}-${serialNumber}`;
}
async function updateSerialNumber() {
  const metadataDoc = doc(db, "metadata", "serialNumbers");
  currentSerialNumber++;

  if (currentSerialNumber > 9999) {
    const lastPrefix = companyInitials.split("-")[1];
    const firstChar = lastPrefix.charAt(0);
    const secondChar = lastPrefix.charAt(1);

    let newFirstChar = firstChar;
    let newSecondChar = secondChar;

    if (secondChar === "Z") {
      newSecondChar = "A";
      newFirstChar = String.fromCharCode(firstChar.charCodeAt(0) + 1);
    } else {
      newSecondChar = String.fromCharCode(secondChar.charCodeAt(0) + 1);
    }

    companyInitials = `E-${newFirstChar}${newSecondChar}`;
    currentSerialNumber = 1;
  }

  try {
    await setDoc(metadataDoc, {
      prefix: companyInitials,
      lastSerialNumber: currentSerialNumber,
    });
  } catch (error) {
    console.error("Error updating serial number:", error);
  }
}

function calculateTotal() {
  let total = 0;
  const amountInputs = document.querySelectorAll(".amount-input");
  amountInputs.forEach((input) => {
    total += parseFloat(input.value) || 0;
  });
  totalField.value = total.toFixed(2);
  inWordsField.value = convertNumberToWords(total);

}

// Function to convert number to words
function convertNumberToWords(num) {
  const belowTwenty = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const aboveHundred = ["Hundred", "Thousand", "Million", "Billion"];

  if (num === 0) return "Zero Rupees Only";

  function helper(n) {
    if (n < 20) return belowTwenty[n];
    if (n < 100)
      return (
        tens[Math.floor(n / 10)] +
        (n % 10 !== 0 ? " " + belowTwenty[n % 10] : "")
      );
    for (let i = 0, unit = 100; unit <= 1000000000; unit *= 1000, i++) {
      if (n < unit * 1000)
        return (
          helper(Math.floor(n / unit)) +
          " " +
          aboveHundred[i] +
          (n % unit !== 0 ? " " + helper(n % unit) : "")
        );
    }
  }

  return helper(num) + " Rupees Only";
}

addCategoryBtn.addEventListener("click", () => {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>
      <select class="category-select">
        <option value="Conveyance">Conveyance</option>
        <option value="Loading and Unloading">Loading and Unloading</option>
        <option value="Labour Charges">Labour Charges</option>
        <option value="Packing Charges">Packing Charges</option>
        <option value="Others">Others</option>
      </select>
    </td>
    <td><input type="text" class="description-input" placeholder="Enter description"></td>
    <td><input type="number" class="amount-input" placeholder="Enter amount"></td>
    <td><input type="file" class="receipt-input" accept="application/pdf"></td>
    <td><button class="delete-btn">Delete</button></td>
  `;
  categoriesTable.appendChild(row);

  row.querySelector(".delete-btn").addEventListener("click", () => {
    row.remove();
    calculateTotal();
  });

  row
    .querySelector(".amount-input")
    .addEventListener("input", calculateTotal);
});


async function uploadReceipt(file) {
  const storageRef = ref(storage, `receipts/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

async function collectCategoryData() {
  const categories = [];
  const categoryRows = document.querySelectorAll("#categoriesTable tr");

  for (const row of categoryRows) {
    const categorySelect = row.querySelector(".category-select");
    const descriptionInput = row.querySelector(".description-input");
    const amountInput = row.querySelector(".amount-input");
    const receiptInput = row.querySelector(".receipt-input");

    if (categorySelect && descriptionInput && amountInput && receiptInput) {
      const category = categorySelect.value;
      const description = descriptionInput.value;
      const amount = amountInput.value;
      const receiptFile = receiptInput.files[0];
      const receiptURL = receiptFile
        ? await uploadReceipt(receiptFile)
        : null;

      categories.push({ category, description, amount, receiptURL });
    }
  }

  return categories;
}

// Event Listeners
createVoucherBtn.addEventListener("click", () => {
  const uniqueBillNo = generateUniqueBillNumber();
  billNoField.value = uniqueBillNo;
  voucherPopup.style.display = "flex";
  document.getElementById("date").value = new Date().toLocaleDateString();
});

closePopup.addEventListener("click", () => {
  voucherPopup.style.display = "none";
});

function resetForm() {
  billNoField.value = "";
  document.getElementById("date").value = "";
  paidToField.value = "";
  totalField.value = "";
  inWordsField.value = "";
  const categoriesTable = document.getElementById("categoriesTable");
  categoriesTable.innerHTML = ""; // Clear all dynamically added rows
}

submitVoucherBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("User is not authenticated.");
    return;
  }

  const userEmail = user.email;

  try {
    // Step 1: Determine the user's company dynamically
    const companiesRef = collection(db, "users");
    const companyQuery = query(companiesRef);
    const companiesSnapshot = await getDocs(companyQuery);

    let companyName = null;

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id; // The company document name (e.g., tcs, skr)

      // Check for the user in the 'employee' subcollection
      const employeeRef = collection(db, "users", companyId, "employee");
      const userQuery = query(employeeRef, where("email", "==", userEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        companyName = companyId; // Assign the company name dynamically
        break;
      }
    }

    if (!companyName) {
      alert("Unable to determine your company. Please contact support.");
      return;
    }

    // Step 2: Prepare voucher data
    const voucherData = {
      billNo: billNoField.value,
      serialNumber: currentSerialNumber,
      date: document.getElementById("date").value,
      paidTo: paidToField.value,
      total: totalField.value,
      inWords: inWordsField.value,
      status: "pending",
      companyId: companyName, // Employee's company
      createdBy: "employee", // Added field

    };

    const categories = await collectCategoryData();
    voucherData.categories = categories;

    // Step 3: Save voucher data under the logged-in user's subcollection
    const employeesRef = collection(db, "users", companyName, "employee");
    const q = query(employeesRef, where("email", "==", userEmail));

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      querySnapshot.forEach(async (docSnapshot) => {
        const userName = docSnapshot.data().name; // Get user's document name
        const userRef = doc(db, "users", companyName, "employee", userName);
        const vouchersRef = collection(userRef, "vouchers"); // Subcollection for vouchers  

        const voucherDocRef = doc(vouchersRef, voucherData.billNo); // Use billNo as document ID
        await setDoc(voucherDocRef, voucherData); // Save voucher for the employee
        await updateSerialNumber();
        alert("Voucher created and saved under your account!");

        // Step 4: Mirror voucher data to all managers within the company
        const managersRef = collection(db, "users", companyName, "manager");
        const managersSnapshot = await getDocs(managersRef);

        managersSnapshot.forEach(async (managerDoc) => {
          const managerVoucherRef = collection(
            db,
            "users",
            companyName,
            "manager",
            managerDoc.id,
            "vouchers"
          );

          const managerVoucherDocRef = doc(
            managerVoucherRef,
            voucherData.billNo
          ); // Use billNo as document ID
          await setDoc(managerVoucherDocRef, voucherData); // Save voucher for each manager
        });

        alert("Voucher generated and sent to all managers!");
        // Clear form fields and close popup
        resetForm();
        voucherPopup.style.display = "none";
      });
    } else {
      alert("User document not found. Unable to create voucher.");
    }
  } catch (error) {
    console.error("Error generating voucher:", error);
    alert("An error occurred. Please try again.");
  }
});

fetchVouchersBtn.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    alert("User is not authenticated.");
    return;
  }

  const userEmail = user.email;
  console.log("Authenticated User Email:", userEmail);

  try {
    const companiesRef = collection(db, "users");
    const companySnapshot = await getDocs(companiesRef);

    let companyName = null;
    let employeeId = null;

    for (const companyDoc of companySnapshot.docs) {
      const companyId = companyDoc.id;
      const employeeRef = collection(db, "users", companyId, "employee");
      const employeeQuery = query(employeeRef, where("email", "==", userEmail));
      const employeeSnapshot = await getDocs(employeeQuery);

      if (!employeeSnapshot.empty) {
        companyName = companyId;
        console.log("Company Found:", companyName);

        employeeSnapshot.forEach((doc) => {
          employeeId = doc.id;
          console.log("Employee ID Found:", employeeId);
        });
        break;
      }
    }

    if (!companyName || !employeeId) {
      alert("Unable to determine your company or employee details.");
      return;
    }

    const vouchersRef = collection(
      db,
      "users",
      companyName,
      "employee",
      employeeId,
      "vouchers_acc"
    );
    console.log("Fetching Vouchers From:", `users/${companyName}/employee/${employeeId}/vouchers_acc`);

    const vouchersSnapshot = await getDocs(vouchersRef);
    const vouchers = [];

    vouchersSnapshot.forEach((doc) => {
      console.log("Voucher Data:", doc.data());
      vouchers.push(doc.data());
    });

    if (vouchers.length > 0) {
      displayVouchers(vouchers);
    } else {
      voucherTableBody.innerHTML = `<tr><td colspan="5">No vouchers found.</td></tr>`;
    }
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    alert("An error occurred while fetching vouchers. Please try again.");
  }
});

async function displayVouchers(vouchers) {
  voucherTableBody.innerHTML = ""; // Clear the table
  
  vouchers.forEach(async (voucher) => {
    console.log("Voucher Data:", voucher);  // Log the voucher data for debugging
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${voucher.billNo || "N/A"}</td>
      <td>${voucher.date || "N/A"}</td>
      <td>${voucher.total || "N/A"}</td>
      <td>${voucher.status || "N/A"}</td>
      <td>
        <button class="yes-btn" style="margin-right: 5px;">Yes</button>
        <button class="no-btn">No</button>
      </td>
    `;
    voucherTableBody.appendChild(row);

    const yesBtn = row.querySelector(".yes-btn");
    const noBtn = row.querySelector(".no-btn");

    // Check if 'actions' field already exists
    if (voucher.actions) {
      // If an action already exists, disable the buttons
      disableButtons(yesBtn, noBtn, voucher.actions);
    }

    // Event listener for 'Yes' button
    yesBtn.addEventListener("click", async () => {
      await handleAction("Yes", voucher);
      disableButtons(yesBtn, noBtn, "Yes");
    });

    // Event listener for 'No' button
    noBtn.addEventListener("click", async () => {
      await handleAction("No", voucher);
      disableButtons(yesBtn, noBtn, "No");
    });
  });

}

// Function to handle Firestore updates
async function handleAction(action, voucher) {
  try {
    // Reference to the specific voucher document in Firestore
    const voucherRef = doc(
      db,
      "users",
      voucher.companyId, // Company Name
      "employee",
      voucher.employeeId, // Employee ID
      "vouchers_acc",
      voucher.billNo// Voucher document ID,
    );

    // Update the 'actions' field in Firestore
    await updateDoc(voucherRef, { actions: action });

    console.log(`Action '${action}' saved for voucher ${voucher.id}`);
  } catch (error) {
    console.error("Error updating voucher action:", error);
    alert("An error occurred. Please try again.");
  }
}

// Function to disable buttons and display the action taken
function disableButtons(yesBtn, noBtn, action) {
  yesBtn.disabled = true;
  noBtn.disabled = true;

  // Change button styles to indicate they are disabled
  yesBtn.style.backgroundColor = "#ccc";
  noBtn.style.backgroundColor = "#ccc";

  // Optional: Add text to display the action taken
  if (action) {
    const actionText = document.createElement("span");
    actionText.textContent = ` (${action})`;
    yesBtn.parentElement.appendChild(actionText);
  }
}

// Authentication and Initialization
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userEmail = user.email;
    const companiesRef = collection(db, "users");
    const companySnapshot = await getDocs(companiesRef);

    for (const companyDoc of companySnapshot.docs) {
      const companyId = companyDoc.id;
      const employeeRef = collection(db, "users", companyId, "employee");
      const employeeQuery = query(employeeRef, where("email", "==", userEmail));
      const employeeSnapshot = await getDocs(employeeQuery);

      if (!employeeSnapshot.empty) {
        companyInitials = companyId;
        employeeSnapshot.forEach((doc) => {
          employeeName = doc.id;
          paidToField.value = doc.data().name;
          paidToField.setAttribute("readonly", true);
        });
        break;
      }
    }
    fetchLatestSerialNumber();
  } else {
    console.log("User is not authenticated.");
  }
});
