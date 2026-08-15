import "./App.css";
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";


const OBJECT_CONFIG = {
  Account: {
    label: "Account",
    fields: ["Name", "Phone", "Website", "Industry", "Type"],
  },

  Opportunity: {
    label: "Opportunity",
    fields: [
      "Name",
      "Amount",
      "StageName",
      "CloseDate",
      "Type",
    ],
  },

  Lead: {
    label: "Lead",
    fields: [
      "FirstName",
      "LastName",
      "Company",
      "Email",
      "Phone",
      "Status",
    ],
  },

  Contact: {
    label: "Contact",
    fields: [
      "FirstName",
      "LastName",
      "Email",
      "Phone",
      "Title",
    ],
  },

  Case: {
    label: "Case",
    fields: [
      "CaseNumber",
      "Subject",
      "Status",
      "Priority",
      "Origin",
    ],
  },
};

const PICKLIST_OPTIONS = {
  StageName: [
    "Prospecting",
    "Qualification",
    "Needs Analysis",
    "Value Proposition",
    "Id. Decision Makers",
    "Perception Analysis",
    "Proposal/Price Quote",
    "Negotiation/Review",
    "Closed Won",
    "Closed Lost",
  ],

  Type: [
    "Existing Customer - Upgrade",
    "Existing Customer - Replacement",
    "Existing Customer - Downgrade",
    "New Customer",
  ],

  Industry: [
    "Agriculture",
    "Apparel",
    "Banking",
    "Biotechnology",
    "Chemicals",
    "Communications",
    "Construction",
    "Consulting",
    "Education",
    "Electronics",
    "Energy",
    "Engineering",
    "Entertainment",
    "Environmental",
    "Finance",
    "Food & Beverage",
    "Government",
    "Healthcare",
    "Hospitality",
    "Insurance",
    "Machinery",
    "Manufacturing",
    "Media",
    "Not For Profit",
    "Recreation",
    "Retail",
    "Shipping",
    "Technology",
    "Telecommunications",
    "Transportation",
    "Utilities",
    "Other",
  ],

  Status: [
    "New",
    "Working",
    "Escalated",
    "Closed",
  ],

  Priority: [
    "High",
    "Medium",
    "Low",
  ],

  Origin: [
    "Phone",
    "Email",
    "Web",
  ],
};
const OBJECT_ENDPOINTS = {
  Account: "accounts",
  Opportunity: "opportunities",
  Lead: "leads",
  Contact: "contacts",
  Case: "cases",
};

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
const [recordsLoading, setRecordsLoading] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
 
const [sortField, setSortField] = useState("Name");
const [sortDirection, setSortDirection] = useState("asc");
const [selectedObject, setSelectedObject] = useState("Contact");
const currentObjectConfig = OBJECT_CONFIG[selectedObject];
const handleObjectChange = (objectName) => {
  setSelectedObject(objectName);
  setRecords([]);
  setSearchTerm("");
  setCurrentPage(1);
  setHasMore(true);
  setEditingId(null);
  setViewingContact(null);

  const firstField = OBJECT_CONFIG[objectName].fields[0];

  setSortField(firstField);
  setSortDirection("asc");

  clearForm();
};
const fieldKeyMap = {
  Name: "name",
  Phone: "phone",
  Website: "website",
  Industry: "industry",
  Type: "type",

  Amount: "amount",
  StageName: "stageName",
  CloseDate: "closeDate",

  FirstName: "firstName",
  LastName: "lastName",
  Company: "company",
  Email: "email",

  Title: "title",

  CaseNumber: "caseNumber",
  Subject: "subject",
  Status: "status",
  Priority: "priority",
  Origin: "origin",
};
  const [form, setForm] = useState({
  name: "",
  phone: "",
  website: "",
  industry: "",
  type: "",

  amount: "",
  stageName: "",
  closeDate: "",

  firstName: "",
  lastName: "",
  company: "",
  email: "",
  title: "",

  caseNumber: "",
  subject: "",
  status: "",
  priority: "",
  origin: "",
});

  const [editingId, setEditingId] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);


  // --------------------------------------------------
  // Check Salesforce Login
  // --------------------------------------------------

  useEffect(() => {
    checkLoginStatus();
  }, []);
useEffect(() => {
  if (authenticated) {
    loadObjectRecords(selectedObject);
  }
}, [selectedObject, authenticated]);
  const checkLoginStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/status`, {
        credentials: "include",
      });

      const data = await response.json();

      setAuthenticated(data.authenticated);
      setLoading(false);


    } catch (error) {
      console.error("Status check failed:", error);
      setLoading(false);
      showMessage("Unable to connect to the server.", "error");
    }
  };

  // --------------------------------------------------
  // Show Message
  // --------------------------------------------------

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 4000);
  };

  // --------------------------------------------------
  // Login
  // --------------------------------------------------

  const login = () => {
    window.location.href = `${API_URL}/auth/login`;
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        credentials: "include",
      });

      setAuthenticated(false);
      clearForm();
      showMessage("Logged out successfully.");
    } catch (error) {
      console.error("Logout failed:", error);
      showMessage("Logout failed.", "error");
    }
  };
 const loadObjectRecords = async (objectName, page = 1, append = false) => {
  if (append) {
    setLoadingMore(true);
  } else {
    setRecordsLoading(true);
  }

  try {
    const endpoint = OBJECT_ENDPOINTS[objectName];

    const response = await fetch(
      `${API_URL}/api/${endpoint}?page=${page}`,
      {
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || `Failed to load ${objectName} records`
      );
    }

    if (append) {
      setRecords((previousRecords) => [
        ...previousRecords,
        ...data.records,
      ]);
    } else {
      setRecords(data.records);
    }

    setCurrentPage(data.page);
    setHasMore(data.hasMore);
  } catch (error) {
    console.error(
      `Load ${objectName} records failed:`,
      error
    );

    showMessage(error.message, "error");
  } finally {
    setRecordsLoading(false);
    setLoadingMore(false);
  }
}; 

const loadNextPage = async () => {
  if (loadingMore || !hasMore || recordsLoading) {
    return;
  }

  await loadObjectRecords(
    selectedObject,
    currentPage + 1,
    true
  );
};

useEffect(() => {
  const handleScroll = () => {
    const scrollPosition =
      window.innerHeight + window.scrollY;

    const pageHeight =
      document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 300) {
      loadNextPage();
    }
  };

  window.addEventListener("scroll", handleScroll);

  return () => {
    window.removeEventListener("scroll", handleScroll);
  };
}, [
  selectedObject,
  currentPage,
  hasMore,
  loadingMore,
  recordsLoading,
]);
  // --------------------------------------------------
  // Get Contacts
  // --------------------------------------------------

  const loadContacts = async () => {
    setContactsLoading(true);
    

    try {
      const response = await fetch(`${API_URL}/api/contacts`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load contacts");
      }

      setContacts(data);
    } catch (error) {
      console.error("Load contacts failed:", error);
      showMessage(error.message, "error");
    } finally {
      setContactsLoading(false);
    }
  };

  const sortRecords = (field) => {
  if (sortField === field) {
    setSortDirection(
      sortDirection === "asc" ? "desc" : "asc"
    );
  } else {
    setSortField(field);
    setSortDirection("asc");
  }

  setCurrentPage(1);
};

 
  // --------------------------------------------------
  // Handle Form Input
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Create / Update Contact
  // --------------------------------------------------

  const handleSubmit = async (event) => {
  event.preventDefault();

  const endpoint = OBJECT_ENDPOINTS[selectedObject];

  // Basic validation
  if (selectedObject === "Account" && !form.name.trim()) {
    showMessage("Account name is required.", "error");
    return;
  }

  if (selectedObject === "Lead" && !form.lastName.trim()) {
    showMessage("Last name is required.", "error");
    return;
  }

  if (selectedObject === "Contact" && !form.lastName.trim()) {
    showMessage("Last name is required.", "error");
    return;
  }
  if (selectedObject === "Opportunity") {
  if (!form.name.trim()) {
    showMessage("Opportunity name is required.", "error");
    return;
  }

  if (!form.stageName.trim()) {
    showMessage("Stage Name is required.", "error");
    return;
  }

  if (!form.closeDate) {
    showMessage("Close Date is required.", "error");
    return;
  }
}

  if (
    (selectedObject === "Lead" || selectedObject === "Contact") &&
    form.email &&
    !form.email.includes("@")
  ) {
    showMessage("Please enter a valid email address.", "error");
    return;
  }

  try {
    setSaving(true);

    const url = editingId
      ? `${API_URL}/api/${endpoint}/${editingId}`
      : `${API_URL}/api/${endpoint}`;

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await response.json();
if (!response.ok) {
  throw new Error(
    data.error ||
      `${editingId ? "Update" : "Create"} ${selectedObject} failed`
  );
}
    

    showMessage(
      `${selectedObject} ${
        editingId ? "updated" : "created"
      } successfully.`
    );

    clearForm();
    setRecords([]);
setCurrentPage(1);
setHasMore(true);

await loadObjectRecords(selectedObject, 1, false);
    

  
  } catch (error) {
    console.error(
      `${selectedObject} save failed:`,
      error
    );

    showMessage(error.message, "error");
  } finally {
    setSaving(false);
  }
};

  // --------------------------------------------------
  // Edit Contact
  // --------------------------------------------------
  const viewRecord = (record) => {
  setViewingContact(record);
};
const editRecord = (record) => {
  setEditingId(record.Id);

  const newForm = {};

  currentObjectConfig.fields.forEach((field) => {
    const fieldKey = fieldKeyMap[field];

    newForm[fieldKey] = record[field] || "";
  });

  setForm((previousForm) => ({
    ...previousForm,
    ...newForm,
  }));

  setMessage("");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};
  
  // --------------------------------------------------
  // Delete Contact
  // --------------------------------------------------
const deleteRecord = async (id) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete this ${currentObjectConfig.label}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const endpoint = OBJECT_ENDPOINTS[selectedObject];

    const response = await fetch(
      `${API_URL}/api/${endpoint}/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          `Failed to delete ${currentObjectConfig.label}`
      );
    }

    showMessage(
      `${currentObjectConfig.label} deleted successfully.`
    );

    await loadObjectRecords(selectedObject);

    setCurrentPage(1);
  } catch (error) {
    console.error(
      `${currentObjectConfig.label} delete failed:`,
      error
    );

    showMessage(error.message, "error");
  }
};

  // --------------------------------------------------
  // Clear Form
  // --------------------------------------------------

const clearForm = () => {
  setForm({
    name: "",
    phone: "",
    website: "",
    industry: "",
    type: "",

    amount: "",
    stageName: "",
    closeDate: "",

    firstName: "",
    lastName: "",
    company: "",
    email: "",
    title: "",

    caseNumber: "",
    subject: "",
    status: "",
    priority: "",
    origin: "",
  });

  setEditingId(null);
}; 
  // --------------------------------------------------
  // Search Contacts
  // --------------------------------------------------
// --------------------------------------------------
// Filter Records
// --------------------------------------------------

const filteredRecords = records.filter((record) => {
  const search = searchTerm.toLowerCase();

  return currentObjectConfig.fields.some((field) =>
    String(record[field] || "")
      .toLowerCase()
      .includes(search)
  );
});

// --------------------------------------------------
// Sort Records
// --------------------------------------------------

const sortedFilteredRecords = [...filteredRecords].sort(
  (a, b) => {
    const valueA = String(a[sortField] || "").toLowerCase();
    const valueB = String(b[sortField] || "").toLowerCase();

    if (valueA < valueB) {
      return sortDirection === "asc" ? -1 : 1;
    }

    if (valueA > valueB) {
      return sortDirection === "asc" ? 1 : -1;
    }

    return 0;
  }
);

  // --------------------------------------------------
  // Reset page when search changes
  // --------------------------------------------------

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --------------------------------------------------
  // Pagination Calculations
  // --------------------------------------------------

   // --------------------------------------------------
  // Keep current page valid
  // --------------------------------------------------

  

  // --------------------------------------------------
  // Pagination Functions
  // --------------------------------------------------

  

  // --------------------------------------------------
  // Loading Screen
  // --------------------------------------------------

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.logoCircle}>S</div>

          <h2>Connecting to Salesforce</h2>

          <p>Please wait...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Login Screen
  // --------------------------------------------------

  if (!authenticated) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.logoCircle}>S</div>

          <h1 style={styles.loginTitle}>
            Salesforce CRM
          </h1>

          <p style={styles.loginText}>
            Manage your Salesforce contacts from one simple
            application.
          </p>

          <button
            style={styles.loginButton}
            onClick={login}
          >
            Login with Salesforce
          </button>

          <p style={styles.secureText}>
            🔒 Secure OAuth authentication
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      {/* Header */}

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.brand}>
            <div style={styles.smallLogo}>S</div>

            <div>
              <h1 style={styles.brandTitle}>
                Salesforce CRM
              </h1>

              <p style={styles.brandSubtitle}>
                Contact Management
              </p>
            </div>
          </div>

          <div style={styles.headerRight}>
            <span style={styles.loggedIn}>
              ● Connected to Salesforce
            </span>

            <button
              style={styles.logoutButton}
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {loadingMore && (
  <div style={styles.loadingMore}>
    Loading more records...
  </div>
)}

{!hasMore && records.length > 0 && (
  <div style={styles.endOfRecords}>
    All available records have been loaded.
  </div>
)}

      <main style={styles.main}>
        {/* Message */}

        {message && (
          <div
            style={{
              ...styles.message,
              ...(messageType === "error"
                ? styles.errorMessage
                : styles.successMessage),
            }}
          >
            <span>
              {messageType === "error" ? "⚠️" : "✓"}
            </span>

            {message}
          </div>
        )}

        {/* Dashboard Cards */}

        <div className="responsiveStatsGrid" style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>👥</div>

            <div>
              <p style={styles.statLabel}>
                Total {currentObjectConfig.label}s
              </p>

              <h2 style={styles.statNumber}>
                {records.length}
              </h2>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>🔎</div>

            <div>
              <p style={styles.statLabel}>
                Search Results
              </p>

            <h2 style={styles.statNumber}>
  {filteredRecords.length}
</h2>  
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>☁️</div>

            <div>
              <p style={styles.statLabel}>Status</p>

              <h2 style={styles.connectedText}>
                Connected
              </h2>
            </div>
          </div>
        </div>
        {/* Salesforce Object Selector */}

<section style={styles.objectSelectorCard}>
  <div>
    <h2 style={styles.objectSelectorTitle}>
      Select Salesforce Object
    </h2>

    <p style={styles.objectSelectorSubtitle}>
      Choose which Salesforce object you want to manage.
    </p>
  </div>

  <select
    value={selectedObject}
  onChange={(event) => handleObjectChange(event.target.value)}
    style={styles.objectSelector}
  >
    <option value="Account">Account</option>
    <option value="Opportunity">Opportunity</option>
    <option value="Lead">Lead</option>
    <option value="Contact">Contact</option>
    <option value="Case">Case</option>
  </select>
</section>


        {/* Add / Edit Contact */}

        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
  {editingId
    ? `Edit ${currentObjectConfig.label}`
    : `Add New ${currentObjectConfig.label}`}
</h2>

          <p style={styles.sectionSubtitle}>
  {editingId
    ? `Update the ${currentObjectConfig.label.toLowerCase()} information below.`
    : `Create a new ${currentObjectConfig.label.toLowerCase()} in Salesforce.`}
</p>    
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="responsiveFormGrid" style={styles.formGrid}>
             {currentObjectConfig.fields.map((fieldName) => {
  const fieldKey = fieldKeyMap[fieldName] || fieldName;

  return (
    <div style={styles.field} key={fieldName}>
      <label style={styles.label}>
        {fieldName}
      </label>
      {PICKLIST_OPTIONS[fieldName] ? (
  <select
    name={fieldKey}
    value={form[fieldKey] || ""}
    onChange={handleChange}
    style={styles.input}
  >
    <option value="">
      Select {fieldName}
    </option>

    {PICKLIST_OPTIONS[fieldName].map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
) : fieldName === "CloseDate" ? (
  <input
    type="date"
    name="closeDate"
    value={form.closeDate}
    onChange={handleChange}
    style={styles.input}
    required
  />
) : (
  <input
    type={fieldName === "Amount" ? "number" : "text"}
    name={fieldKey}
    placeholder={`Enter ${fieldName}`}
    value={form[fieldKey] || ""}
    onChange={handleChange}
    style={styles.input}
  />
)}

   
    </div>
  );
})}
          </div>

            <div style={styles.formButtons}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={saving}
              >
              {saving
  ? "Saving..."
  : editingId
    ? `Update ${currentObjectConfig.label}`
    : `Add ${currentObjectConfig.label}`} 
              </button>

              {editingId && (
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={clearForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Contacts */}

        <section style={styles.sectionCard}>
          <div className="responsiveContactsToolbar" style={styles.contactsToolbar}>
            <div>
            <h2 style={styles.sectionTitle}>
  {currentObjectConfig.label}s
</h2>

<p style={styles.sectionSubtitle}>
  View and manage your Salesforce {currentObjectConfig.label.toLowerCase()} records.
</p>
            </div>

            <button
  style={styles.refreshButton}
  onClick={() => {
  setRecords([]);
  setCurrentPage(1);
  setHasMore(true);
  loadObjectRecords(selectedObject, 1, false);
}}
  disabled={recordsLoading}
>
  {recordsLoading
    ? "Loading..."
    : "↻ Refresh"}
</button>
          </div>

        <div style={styles.sortSection}>
  <span style={{ fontWeight: "600" }}>
    Sort by:
  </span>

  {currentObjectConfig.fields.map((field) => (
    <button
      key={field}
      style={styles.sortButton}
      onClick={() => sortRecords(field)}
    >
      {field}{" "}
      {sortField === field
        ? sortDirection === "asc"
          ? "↑"
          : "↓"
        : ""}
    </button>
  ))}
</div>  

          {/* Search */}

          <div style={styles.searchContainer}>
            <span style={styles.searchIcon}>
              🔎
            </span>

          <input
  type="text"
  placeholder={`Search ${currentObjectConfig.label.toLowerCase()} records...`}
  value={searchTerm}
  onChange={(event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }}
  style={styles.searchInput}
/>  
          </div>

            {recordsLoading ? (
  <div style={styles.emptyState}>
    <h3>Loading {currentObjectConfig.label}s...</h3>

    <p>
      Fetching the latest data from Salesforce.
    </p>
  </div>
) : filteredRecords.length === 0 ? (
  <div style={styles.emptyState}>
    <div style={styles.emptyIcon}>
      📋
    </div>

    <h3>
      {searchTerm
        ? `No matching ${currentObjectConfig.label.toLowerCase()}s`
        : `No ${currentObjectConfig.label.toLowerCase()}s found`}
    </h3>

    <p>
      {searchTerm
        ? "Try a different search term."
        : `Add your first ${currentObjectConfig.label.toLowerCase()} using the form above.`}
    </p>
  </div>
) : (          <>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                <thead>
  <tr>
    {currentObjectConfig.fields.map((field) => (
      <th key={field} style={styles.th}>
        {field}
      </th>
    ))}

  <th
  style={{
    ...styles.th,
    width: "190px",
    minWidth: "190px",
    textAlign: "center",
  }}
>
  Actions
</th>  
  </tr>
</thead>  

            <tbody>
    {sortedFilteredRecords.map((record) => (
    <tr
      key={record.Id}
      style={styles.tableRow}
    >
      {currentObjectConfig.fields.map((field) => (
        <td
          key={field}
          style={styles.td}
        >
          {record[field] || "-"}
        </td>
      ))}

  <td
  style={{
    ...styles.td,
    textAlign: "center",
    minWidth: "190px",
    width: "190px",
    overflow: "visible",
    whiteSpace: "nowrap",
  }}
>
  <button
    style={styles.viewButton}
    onClick={() => viewRecord(record)}
  >
    View
  </button>

  <button
    style={styles.editButton}
    onClick={() => editRecord(record)}
  >
    Edit
  </button>

  <button
    style={styles.deleteButton}
    onClick={() => deleteRecord(record.Id)}
  >
    Delete
  </button>
</td>  
    </tr>
  ))}
</tbody>     
        </table>
              </div>

                          </>
          )}
        </section>
      </main>
{viewingContact && (
  <div style={styles.modalOverlay}>
    <div style={styles.modalCard}>

      <div style={styles.modalHeader}>
        <div>
          <h2 style={styles.modalTitle}>
            {currentObjectConfig.label} Details
          </h2>

          <p style={styles.modalSubtitle}>
            Salesforce {currentObjectConfig.label}
          </p>
        </div>

        <button
          style={styles.closeButton}
          onClick={() => setViewingContact(null)}
        >
          ×
        </button>
      </div>

      <div style={styles.contactDetails}>

        {currentObjectConfig.fields.map((field) => (
          <div
            style={styles.detailItem}
            key={field}
          >
            <span style={styles.detailLabel}>
              {field}
            </span>

            <span style={styles.detailValue}>
              {viewingContact[field] || "-"}
            </span>
          </div>
        ))}

        <div style={styles.detailItem}>
          <span style={styles.detailLabel}>
            Salesforce ID
          </span>

          <span style={styles.detailValue}>
            {viewingContact.Id}
          </span>
        </div>

      </div>

      <div style={styles.modalFooter}>

        <button
          style={styles.modalCloseButton}
          onClick={() => setViewingContact(null)}
        >
          Close
        </button>

        <button
  style={styles.modalEditButton}
  onClick={() => {
    setViewingContact(null);
    editRecord(viewingContact);
  }}
>
  Edit {currentObjectConfig.label}
</button>

      </div>

    </div>
  </div>
)}
      <footer style={styles.footer}>
        Salesforce CRUD Application • React + Node.js +
        Express
      </footer>
    </div>
  );
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f6f9",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
    color: "#181818",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f6f9",
    fontFamily: "Arial, sans-serif",
  },

  loadingCard: {
    backgroundColor: "white",
    padding: "45px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow:
      "0 8px 30px rgba(0,0,0,0.1)",
  },

  loginPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg, #032d60 0%, #0176d3 100%)",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  loginCard: {
    width: "100%",
    maxWidth: "430px",
    backgroundColor: "white",
    padding: "45px 40px",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow:
      "0 20px 50px rgba(0,0,0,0.25)",
  },

  logoCircle: {
    width: "70px",
    height: "70px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    backgroundColor: "#0176d3",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "36px",
    fontWeight: "bold",
  },

  loginTitle: {
    color: "#032d60",
    marginBottom: "12px",
  },

  loginText: {
    color: "#5f6b7a",
    lineHeight: "1.6",
    marginBottom: "30px",
  },

  loginButton: {
    width: "100%",
    backgroundColor: "#0176d3",
    color: "white",
    border: "none",
    padding: "14px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
  },

  secureText: {
    color: "#6b7280",
    fontSize: "13px",
    marginTop: "20px",
  },

  header: {
    backgroundColor: "#032d60",
    color: "white",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.15)",
  },

  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "18px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  smallLogo: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "#0176d3",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "22px",
  },

  brandTitle: {
    margin: 0,
    fontSize: "20px",
  },

  brandSubtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    opacity: 0.8,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  loggedIn: {
    color: "#70e000",
    fontSize: "14px",
    fontWeight: "600",
  },

  logoutButton: {
    backgroundColor: "#ba0517",
    color: "white",
    border: "none",
    padding: "9px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "30px 25px",
  },

  message: {
    padding: "13px 18px",
    borderRadius: "8px",
    marginBottom: "22px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    fontWeight: "500",
  },

  successMessage: {
    backgroundColor: "#e8f5e9",
    color: "#1b5e20",
    border:
      "1px solid #a5d6a7",
  },

  errorMessage: {
    backgroundColor: "#ffebee",
    color: "#b71c1c",
    border:
      "1px solid #ef9a9a",
  },

  statsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "18px",
  marginBottom: "25px",
},

  statCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.06)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#eef4ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "23px",
  },

  statLabel: {
    margin: 0,
    color: "#68737d",
    fontSize: "13px",
  },

  statNumber: {
    margin: "5px 0 0",
    color: "#032d60",
    fontSize: "25px",
  },

  connectedText: {
    margin: "5px 0 0",
    color: "#2e844a",
    fontSize: "18px",
  },

  sectionCard: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "25px",
    marginBottom: "25px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.06)",
  },
  objectSelectorCard: {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "22px 25px",
  marginBottom: "25px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
},

objectSelectorTitle: {
  margin: 0,
  color: "#032d60",
  fontSize: "20px",
},

objectSelectorSubtitle: {
  color: "#68737d",
  margin: "6px 0 0",
  fontSize: "14px",
},

objectSelector: {
  minWidth: "220px",
  padding: "11px 14px",
  border: "1px solid #c9c9c9",
  borderRadius: "6px",
  fontSize: "14px",
  backgroundColor: "#ffffff",
  color: "#181818",
  WebkitTextFillColor: "#181818",
  cursor: "pointer",
  outline: "none",
},

  sectionHeader: {
    marginBottom: "22px",
  },

  sectionTitle: {
    margin: 0,
    color: "#032d60",
    fontSize: "21px",
  },

  sectionSubtitle: {
    color: "#68737d",
    margin: "6px 0 0",
    fontSize: "14px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "18px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#3e4a59",
  },

  required: {
    color: "#ba0517",
  },

  input: {
  padding: "12px 13px",
  border: "1px solid #c9c9c9",
  borderRadius: "6px",
  fontSize: "14px",
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
  backgroundColor: "#ffffff",
  color: "#181818",
  WebkitTextFillColor: "#181818",
},

  formButtons: {
    marginTop: "22px",
    display: "flex",
    gap: "10px",
  },

  primaryButton: {
    backgroundColor: "#0176d3",
    color: "white",
    border: "none",
    padding: "11px 22px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  cancelButton: {
    backgroundColor: "#747474",
    color: "white",
    border: "none",
    padding: "11px 22px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  contactsToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  refreshButton: {
    backgroundColor: "#2e844a",
    color: "white",
    border: "none",
    padding: "10px 17px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },

  searchContainer: {
    position: "relative",
    marginBottom: "20px",
  },

  searchIcon: {
    position: "absolute",
    left: "13px",
    top: "11px",
    fontSize: "16px",
  },

  searchInput: {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 15px 12px 40px",
  border: "1px solid #c9c9c9",
  borderRadius: "7px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#ffffff",
  color: "#181818",
  WebkitTextFillColor: "#181818",
},

  tableWrapper: {
    overflowX: "auto",
    border:
      "1px solid #e5e5e5",
    borderRadius: "8px",
  },

  table: {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "auto",
  minWidth: "850px",
},

  th: {
  backgroundColor: "#032d60",
  color: "white",
  padding: "13px 15px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "600",
  verticalAlign: "middle",
},

 td: {
  padding: "14px 15px",
  borderBottom: "1px solid #e5e5e5",
  fontSize: "14px",
  color: "#3e4a59",
  verticalAlign: "middle",
  textAlign: "left",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
},

  tableRow: {
    backgroundColor: "white",
  },
  viewButton: {
  backgroundColor: "#2e844a",
  color: "white",
  border: "none",
  padding: "7px 13px",
  borderRadius: "5px",
  cursor: "pointer",
  marginRight: "7px",
  fontSize: "13px",
  fontWeight: "600",
},

  editButton: {
    backgroundColor: "#0176d3",
    color: "white",
    border: "none",
    padding: "7px 13px",
    borderRadius: "5px",
    cursor: "pointer",
    marginRight: "7px",
    fontSize: "13px",
    fontWeight: "600",
  },

  deleteButton: {
    backgroundColor: "#ba0517",
    color: "white",
    border: "none",
    padding: "7px 13px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  // --------------------------------------------------
  // Pagination Styles
  // --------------------------------------------------

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    paddingTop: "18px",
    borderTop:
      "1px solid #e5e5e5",
  },

  pageButton: {
    backgroundColor: "#0176d3",
    color: "white",
    border: "none",
    padding: "9px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "13px",
  },

  disabledButton: {
    backgroundColor: "#d8dde6",
    color: "#68737d",
    cursor: "not-allowed",
  },

  pageInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    color: "#3e4a59",
    fontSize: "14px",
  },

  recordInfo: {
    color: "#68737d",
    fontSize: "12px",
  },

  emptyState: {
    textAlign: "center",
    padding: "50px 20px",
    color: "#68737d",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },
  loadingMore: {
    textAlign: "center",
    padding: "20px",
    color: "#0176d3",
    fontWeight: "600",
    fontSize: "14px",
  },

  endOfRecords: {
    textAlign: "center",
    padding: "20px",
    color: "#68737d",
    fontSize: "13px",
  },

  sortSection: {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "18px",
},

sortButton: {
  backgroundColor: "#0176d3",
  color: "white",
  border: "none",
  padding: "7px 12px",
  borderRadius: "5px",
  cursor: "pointer",
  fontSize: "13px",
},

sortDirection: {
  color: "#68737d",
  fontSize: "13px",
  marginLeft: "5px",
},
modalOverlay: {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "20px",
},

modalCard: {
  width: "100%",
  maxWidth: "500px",
  backgroundColor: "white",
  borderRadius: "12px",
  boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
  overflow: "hidden",
},

modalHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 25px",
  backgroundColor: "#032d60",
  color: "white",
},

modalTitle: {
  margin: 0,
  fontSize: "21px",
},

modalSubtitle: {
  margin: "5px 0 0",
  fontSize: "13px",
  opacity: 0.8,
},

closeButton: {
  backgroundColor: "transparent",
  color: "white",
  border: "none",
  fontSize: "28px",
  cursor: "pointer",
  lineHeight: 1,
},

contactDetails: {
  padding: "25px",
},

detailItem: {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "14px 0",
  borderBottom: "1px solid #e5e5e5",
},

detailLabel: {
  color: "#68737d",
  fontSize: "14px",
  fontWeight: "600",
},

detailValue: {
  color: "#181818",
  fontSize: "14px",
  textAlign: "right",
  wordBreak: "break-word",
},

modalFooter: {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  padding: "18px 25px",
  backgroundColor: "#f8f9fb",
},

modalCloseButton: {
  backgroundColor: "#747474",
  color: "white",
  border: "none",
  padding: "9px 18px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
},

modalEditButton: {
  backgroundColor: "#0176d3",
  color: "white",
  border: "none",
  padding: "9px 18px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "600",
},

  footer: {
    textAlign: "center",
    padding: "25px",
    color: "#68737d",
    fontSize: "13px",
  },
};

export default App;