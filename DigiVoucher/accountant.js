import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.1.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
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
  const payModal = document.getElementById("payModal");
  const paymentModeSelect = document.getElementById("paymentMode");
  const paymentAmountInput = document.getElementById("paymentAmount");
  const payConfirmBtn = document.getElementById("payConfirmBtn");
  const payCancelBtn = document.getElementById("payCancelBtn");

  let selectedVoucherId = null;
  let selectedAccountantId = null;
  let selectedEmployeeName = null; // This should be set when the pay modal is opened

  // Authenticate accountant
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userEmail = user.email;

      try {
        // Dynamically determine the company name
        const companiesRef = collection(db, "users");
        const companiesSnapshot = await getDocs(companiesRef);

        let companyName = null;

        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id;

          const accountantRef = collection(
            db,
            "users",
            companyId,
            "accountant"
          );
          const accountantQuery = query(
            accountantRef,
            where("email", "==", userEmail)
          );
          const accountantSnapshot = await getDocs(accountantQuery);

          if (!accountantSnapshot.empty) {
            companyName = companyId;
            break;
          }
        }

        if (!companyName) {
          console.error("Unable to determine the accountant's company.");
          return;
        }

        console.log("Identified company name:", companyName);

        // Query the Accountant's vouchers collection
        const accountantRef = collection(
          db,
          "users",
          companyName,
          "accountant"
        );
        const accountantQuery = query(accountantRef);
        const querySnapshot = await getDocs(accountantQuery);

        querySnapshot.forEach(async (accountantDoc) => {
          if (accountantDoc.data().email === userEmail) {
            // Fetch vouchers under this accountant
            const vouchersRef = collection(
              db,
              "users",
              companyName,
              "accountant",
              accountantDoc.id,
              "vouchers"
            );
            const vouchersSnapshot = await getDocs(vouchersRef);

            // Display vouchers in table
            vouchersSnapshot.forEach((voucherDoc) => {
              const voucher = voucherDoc.data();
              const employeeName = voucher.paidTo; // Use employee name from the voucher
              displayVoucherInTable(
                voucher,
                employeeName,
                accountantDoc.id,
                voucherDoc.id
              );
            });
          }
        });
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      }
    } else {
      console.log("Accountant is not authenticated.");
    }
  });

  // Function to display vouchers in the table
  function displayVoucherInTable(
    voucher,
    employeeName,
    accountantId,
    voucherId
  ) {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${employeeName}</td>
        <td>${voucher.date}</td>
        <td>${voucher.total}</td>
        <td>
          <button class="view-btn">View</button>
          <button class="pay-btn">Pay</button>
        </td>
      `;

    vouchersTable.appendChild(row);

    // View button functionality
    row.querySelector(".view-btn").addEventListener("click", () => {
      openVoucherModal(voucher);
    });

    // Pay button functionality
    row.querySelector(".pay-btn").addEventListener("click", () => {
      openPayModal(voucherId, accountantId, employeeName);
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

  // Open Pay Modal
  function openPayModal(voucherId, accountantId, employeeName) {
    selectedVoucherId = voucherId;
    selectedAccountantId = accountantId;
    selectedEmployeeName = employeeName; // Store the employee name here

    // Reset modal inputs
    paymentModeSelect.value = "";
    paymentAmountInput.value = "";

    payModal.style.display = "block"; // Show the modal
  }

  // Confirm Payment
  payConfirmBtn.addEventListener("click", async () => {
    const paymentMode = paymentModeSelect.value;
    const paymentAmount = paymentAmountInput.value;
  
    if (paymentMode && paymentAmount) {
      try {
        const user = auth.currentUser;
        if (!user) {
          alert("User is not authenticated.");
          return;
        }
  
        const userEmail = user.email;
  
        // Dynamically determine the company name
        const companiesRef = collection(db, "users");
        const companiesSnapshot = await getDocs(companiesRef);
  
        let companyName = null;
  
        for (const companyDoc of companiesSnapshot.docs) {
          const companyId = companyDoc.id;
  
          const accountantRef = collection(
            db,
            "users",
            companyId,
            "accountant"
          );
          const accountantQuery = query(
            accountantRef,
            where("email", "==", userEmail)
          );
          const accountantSnapshot = await getDocs(accountantQuery);
  
          if (!accountantSnapshot.empty) {
            companyName = companyId;
            break;
          }
        }
  
        if (!companyName) {
          console.error("Unable to determine the accountant's company.");
          alert("Unable to determine your company. Payment could not be processed.");
          return;
        }
  
        console.log("Identified company name:", companyName);
        console.log("Selected Voucher ID:", selectedVoucherId);
  
        // Reference the selected voucher document
        const accountantVoucherRef = doc(
          db,
          "users",
          companyName,
          "accountant",
          selectedAccountantId,
          "vouchers",
          selectedVoucherId
        );
  
        const voucherSnapshot = await getDoc(accountantVoucherRef);
  
        if (!voucherSnapshot.exists()) {
          console.error("Voucher does not exist.");
          alert("Failed to find the voucher.");
          return;
        }
  
        const voucherData = voucherSnapshot.data(); // Get the entire voucher data
  
        // Add payment details to the voucher data
        const updatedVoucherData = {
          ...voucherData, // Spread all existing voucher fields
          paymentMode: paymentMode,
          amountPaid: parseFloat(paymentAmount),
          status: "Paid",
        };
  
        // Update the voucher in the accountant's collection
        await setDoc(accountantVoucherRef, updatedVoucherData, { merge: true });
        const createdBy = voucherData.createdBy;
  
        // Handle duplication based on who created the voucher
        if (createdBy === "manager" || createdBy === "superboss" || createdBy === "employee") {
          // Define the role collection based on the creator of the voucher
          const roleSubCollectionMapping = {
            manager: "manager",
            superboss: "superboss",
            employee: "employee"
          };
  
          // Get the user's role based on the voucher creator
          const roleCollection = roleSubCollectionMapping[createdBy];
  
          // Query for the specific user document in the respective role
          const userRef = collection(db, "users", companyName, roleCollection);
          const userQuery = query(userRef, where("name", "==", voucherData.paidTo));
          const userSnapshot = await getDocs(userQuery);
  
          if (!userSnapshot.empty) {
            const userId = userSnapshot.docs[0].id; // Get the user ID (Manager, Superboss, or Employee)
  
            // Add the voucher to the user's `vouchers_acc` subcollection
            const userVoucherRef = doc(
              db,
              "users",
              companyName,
              roleCollection,
              userId,
              "vouchers_acc", // This will be the subcollection where the voucher will be stored
              selectedVoucherId
            );
  
            await setDoc(userVoucherRef, updatedVoucherData); // Store the updated voucher data in the subcollection
            console.log(`Voucher copied to ${createdBy}'s subcollection.`);
          } else {
            console.error(`No ${createdBy} found with the given name.`);
            alert(`Failed to find the ${createdBy} associated with this voucher.`);
            return;
          }
        }
  
        alert(`Payment recorded:\nMode: ${paymentMode}\nAmount: ${paymentAmount}`);
        console.log("Payment details successfully updated in Firebase.");
  
        // Close the modal and reset inputs
        payModal.style.display = "none";
        paymentModeSelect.value = "";
        paymentAmountInput.value = "";
      } catch (error) {
        console.error("Error processing payment:", error);
        alert("Failed to process payment. Please try again.");
      }
    } else {
      alert("Please fill in all payment details.");
    }
  });
  

  // Cancel Payment
  payCancelBtn.addEventListener("click", () => {
    payModal.style.display = "none";
  });
});
