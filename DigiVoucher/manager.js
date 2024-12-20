import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  where,
  query,
  getDocs,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-firestore.js";

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

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const vouchersTable = document.getElementById("vouchersTable");
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
  let managerName = "";

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
    return `M-${randomCode}-${serialNumber}`;
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

      companyInitials = `M-${newFirstChar}${newSecondChar}`;
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
      let managerName = null;

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id; // The company document name (e.g., tcs, skr)

        // Check for the user in the 'manager' subcollection
        const managerRef = collection(db, "users", companyId, "manager");
        const userQuery = query(managerRef, where("email", "==", userEmail));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          companyName = companyId; // Assign the company name dynamically
          managerName = userSnapshot.docs[0].id; // Get the manager's name from the document name
          break;
        }
      }

      if (!companyName || !managerName) {
        alert(
          "Unable to determine your company or manager. Please contact support."
        );
        return;
      }

      // Step 2: Prepare voucher data
      const voucherData = {
        billNo: billNoField.value,
        serialNumber: currentSerialNumber,
        date: document.getElementById("date").value,
        paidTo: managerName, // Use the manager's name dynamically
        total: totalField.value,
        inWords: inWordsField.value,
        status: "pending",
        companyId: companyName, // Employee's company
        createdBy: "manager", // Added field

      };

      const categories = await collectCategoryData();
      voucherData.categories = categories;

      // Step 3: Save voucher data under the manager's subcollection
      const managerRef = doc(db, "users", companyName, "manager", managerName);
      const vouchersRef = collection(managerRef, "my_voucher"); // Subcollection for vouchers
      const voucherDocRef = doc(vouchersRef, voucherData.billNo); // Use billNo as document ID
      await setDoc(voucherDocRef, voucherData); // Save voucher under manager's subcollection
      console.log("Voucher saved under manager's subcollection");

      // Step 4: Mirror voucher data in the superboss's subcollection
      const superbossRef = collection(db, "users", companyName, "superboss");
      const superbossSnapshot = await getDocs(superbossRef);

      superbossSnapshot.forEach(async (superbossDoc) => {
        const superbossName = superbossDoc.id; // Get superboss user document name
        const superbossVoucherRef = collection(
          db,
          "users",
          companyName,
          "superboss",
          superbossName,
          "vouchers"
        ); // Subcollection for superboss vouchers

        const superbossVoucherDocRef = doc(
          superbossVoucherRef,
          voucherData.billNo
        );
        await setDoc(superbossVoucherDocRef, voucherData); // Save voucher under superboss's subcollection
        console.log("Voucher saved under superboss's subcollection");
      });

      // Step 5: Update serial number
      await updateSerialNumber();

      // Notify the user and clear form
      alert(
        "Voucher created and sent to the superboss and saved under your account!"
      );
      resetForm();
      voucherPopup.style.display = "none";
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
  
    const managerVouchersTable = document.getElementById("managerVouchersTable");
  
    // Toggle table visibility
    if (managerVouchersTable.style.display === "table") {
      managerVouchersTable.style.display = "none";
      return;
    }
  
    const userEmail = user.email;
  
    try {
      const companiesRef = collection(db, "users");
      const companiesSnapshot = await getDocs(companiesRef);
  
      let companyName = null;
      let managerId = null;
  
      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const managerRef = collection(db, "users", companyId, "manager");
        const managerQuery = query(managerRef, where("email", "==", userEmail));
        const managerSnapshot = await getDocs(managerQuery);
  
        if (!managerSnapshot.empty) {
          companyName = companyId;
          managerId = managerSnapshot.docs[0].id;
          break;
        }
      }
  
      if (!companyName || !managerId) {
        alert("Unable to determine your company or manager details.");
        return;
      }
  
      const vouchersRef = collection(
        db,
        "users",
        companyName,
        "manager",
        managerId,
        "vouchers_acc"
      );
      const vouchersSnapshot = await getDocs(vouchersRef);
      const vouchers = [];
  
      vouchersSnapshot.forEach((doc) => {
        vouchers.push(doc.data());
      });
  
      managerVouchersTable.style.display = "table"; // Show the table
      const tbody = managerVouchersTable.querySelector("tbody");
      tbody.innerHTML = ""; // Clear previous rows
  
      vouchers.forEach((voucher) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${voucher.billNo || "N/A"}</td>
          <td>${voucher.date || "N/A"}</td>
          <td>${voucher.total || "N/A"}</td>
          <td>${voucher.status || "N/A"}</td>
          <td>
            <button class="view-btn">View</button>
          </td>
        `;
        tbody.appendChild(row);
  
        // Add view functionality
        row.querySelector(".view-btn").addEventListener("click", () => {
          openVoucherModal(voucher);
        });
      });
    } catch (error) {
      console.error("Error fetching manager vouchers:", error);
      alert("An error occurred while fetching your vouchers. Please try again.");
    }
  });
  
  



  // Authenticate Manager
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userEmail = user.email;

      try {
        // Step 1: Determine the manager's company dynamically
        const companiesRef = collection(db, "users");
        const companiesSnapshot = await getDocs(companiesRef);

        let companyName = null;

        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id; // The company document name (e.g., tcs, skr)

          // Check for the user in the 'manager' subcollection
          const managerRef = collection(db, "users", companyId, "manager");
          const managerQuery = query(
            managerRef,
            where("email", "==", userEmail)
          );
          const managerSnapshot = await getDocs(managerQuery);
          if (!managerSnapshot.empty) {
            companyName = companyId; // Assign the company name dynamically
            managerSnapshot.forEach((doc) => {
              managerName = doc.id;
              paidToField.value = doc.data().name
              paidToField.setAttribute("readonly", true)
            });
            break;
          }
        }

        console.log("Identified company name for manager:", companyName);

        if (!companyName) {
          console.log(
            "Unable to determine the manager's company. Please contact support."
          );
          return;
        }

        // Step 2: Query the manager's vouchers collection
        const managersRef = collection(db, "users", companyName, "manager");
        const q = query(managersRef);

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (managerDoc) => {
          if (managerDoc.data().email === userEmail) {
            // Fetch vouchers under this manager
            const vouchersRef = collection(
              db,
              "users",
              companyName,
              "manager",
              managerDoc.id,
              "vouchers"
            );
            const vouchersSnapshot = await getDocs(vouchersRef);

            // Display vouchers in a table
            vouchersSnapshot.forEach((voucherDoc) => {
              const voucher = voucherDoc.data();
              const employeeName = voucher.paidTo; // Use employee name from the voucher
              displayVoucherInTable(voucher, employeeName, managerDoc.id);
            });
          }
        });
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      }
    } else {
      console.log("Manager is not authenticated.");
    }
  });

  // Function to display vouchers in the table
  function displayVoucherInTable(voucher, employeeName, managerId) {
    const row = document.createElement("tr");
    const isApproved = voucher.status === "approved";
    const isRejected = voucher.status === "rejected";

    row.innerHTML = `
      <td>${employeeName}</td>
      <td>${voucher.date}</td>
      <td>${voucher.total}</td>
      <td>${voucher.status}</td>
      <td>
        <button class="view-btn">View</button>
        <button class="approve-btn" ${
          isApproved || isRejected ? "disabled" : ""
        }>Approve</button>
        <button class="reject-btn" ${
          isApproved || isRejected ? "disabled" : ""
        }>Reject</button>
      </td>
    `;

    vouchersTable.appendChild(row);

    // View button functionality
    row.querySelector(".view-btn").addEventListener("click", () => {
      openVoucherModal(voucher);
    });

    // Approve button functionality
    const approveBtn = row.querySelector(".approve-btn");
    if (!isApproved && !isRejected) {
      approveBtn.addEventListener("click", () => {
        updateVoucherStatus(voucher.billNo, "approved", null, row, managerId);
      });
    }

    // Reject button functionality
    const rejectBtn = row.querySelector(".reject-btn");
    if (!isApproved && !isRejected) {
      rejectBtn.addEventListener("click", () => {
        showRejectReasonPopup(voucher.billNo, row, managerId);
      });
    }
  }

  // Function to update voucher status
  async function updateVoucherStatus(billNo, status, reason, row, managerId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated.");
        return;
      }

      const userEmail = user.email;

      // Dynamically determine the company name
      const companiesRef = collection(db, "users");
      const companiesSnapshot = await getDocs(companiesRef);

      let companyName = null;

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;

        const managerRef = collection(db, "users", companyId, "manager");
        const managerQuery = query(managerRef, where("email", "==", userEmail));
        const managerSnapshot = await getDocs(managerQuery);

        if (!managerSnapshot.empty) {
          companyName = companyId;
          break;
        }
      }

      if (!companyName) {
        console.error("Unable to determine the manager's company.");
        return;
      }

      console.log("Identified company name:", companyName);

      // Fetch managers and update voucher status
      const managersRef = collection(db, "users", companyName, "manager");
      const querySnapshot = await getDocs(managersRef);

      querySnapshot.forEach(async (managerDoc) => {
        const vouchersRef = collection(
          db,
          "users",
          companyName,
          "manager",
          managerDoc.id,
          "vouchers"
        );
        const vouchersSnapshot = await getDocs(vouchersRef);

        vouchersSnapshot.forEach(async (voucherDoc) => {
          if (voucherDoc.data().billNo === billNo) {
            // Update the status and reason (if any)
            const voucherRef = doc(
              db,
              "users",
              companyName,
              "manager",
              managerDoc.id,
              "vouchers",
              voucherDoc.id
            );
            const updatedData = { status };
            if (reason) updatedData.reason = reason;
            await setDoc(voucherRef, updatedData, { merge: true });

            // If approved, duplicate the voucher to accountant
            if (status === "approved") {
              const voucherData = voucherDoc.data();
              const accountantsRef = collection(
                db,
                "users",
                companyName,
                "accountant"
              );
              const accountantSnapshot = await getDocs(accountantsRef);
              accountantSnapshot.forEach(async (accountantDoc) => {
                const accountantVouchersRef = collection(
                  db,
                  "users",
                  companyName,
                  "accountant",
                  accountantDoc.id,
                  "vouchers"
                );
                await setDoc(
                  doc(accountantVouchersRef),
                  {
                    ...voucherData,
                    status: "approved",
                    forwardedBy: managerId,
                    forwardedAt: new Date().toISOString(),
                  },
                  { merge: true }
                );
              });
            }

            alert(`Voucher ${billNo} has been ${status}.`);
            row.querySelector("td:nth-child(4)").textContent = status;

            // Remove the "Reject" and "Approve" buttons, keeping "View"
            const actionCell = row.querySelector("td:nth-child(5)");
            actionCell.innerHTML = `<button class="view-btn">View</button>`;
          }
        });
      });
    } catch (error) {
      console.error("Error updating voucher status:", error);
    }
  }

  // Show reject reason popup
  function showRejectReasonPopup(billNo, row, managerId) {
    const reasonPopup = document.createElement("div");
    reasonPopup.classList.add("popup");
    reasonPopup.innerHTML = `
      <div class="popup-content">
        <h3>Provide Reason for Rejection</h3>
        <textarea id="rejectReason" placeholder="Enter reason here"></textarea>
        <button id="submitRejectReason">Submit</button>
        <button id="cancelRejectReason">Cancel</button>
      </div>
    `;
    document.body.appendChild(reasonPopup);

    // Cancel rejection
    document
      .getElementById("cancelRejectReason")
      .addEventListener("click", () => {
        document.body.removeChild(reasonPopup);
      });

    // Submit rejection reason
    document
      .getElementById("submitRejectReason")
      .addEventListener("click", () => {
        const reason = document.getElementById("rejectReason").value;
        if (reason.trim()) {
          updateVoucherStatus(billNo, "rejected", reason, row, managerId);
          document.body.removeChild(reasonPopup);
        } else {
          alert("Please provide a reason for rejection.");
        }
      });
  }

  // Open voucher modal
  function openVoucherModal(voucher) {
    const voucherDetails = document.getElementById("voucherDetails");
    const generalDetails = `
      <p><strong>Voucher Number:</strong> ${voucher.billNo}</p>
      <p><strong>Paid To:</strong> ${voucher.paidTo}</p>
      <p><strong>Date:</strong> ${voucher.date}</p>
      <p><strong>Amount:</strong> ${voucher.total}</p>
      <p><strong>Status:</strong> ${voucher.status}</p>
    `;

    let categoryTable = `
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (voucher.categories && Array.isArray(voucher.categories)) {
      voucher.categories.forEach((category) => {
        categoryTable += `
          <tr>
            <td>${category.category || "No Category"}</td>
            <td>${category.description || "No Description"}</td>
            <td>${category.amount || "No Amount"}</td>
            <td><a href="${category.receipt || "#"}" target="_blank">${
          category.receipt ? "View Receipt" : "No Receipt"
        }</a></td>
          </tr>
        `;
      });
    } else {
      categoryTable += `
        <tr>
          <td colspan="4">No categories available</td>
        </tr>
      `;
    }

    categoryTable += `</tbody></table>`;

    voucherDetails.innerHTML = generalDetails + categoryTable;
    document.getElementById("voucherModal").style.display = "block";
  }

  // Close the modal
  function closeModal() {
    document.getElementById("voucherModal").style.display = "none";
  }

  document.getElementById("closeBtn").addEventListener("click", closeModal);
});
