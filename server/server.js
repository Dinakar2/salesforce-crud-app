const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const session = require("express-session");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(express.json());

app.use(
  cors({
    origin: "https://salesforce-crud-frontend-6ypo.onrender.com",
    credentials: true,
  }),
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// --------------------------------------------------
// Generate PKCE Code Verifier
// --------------------------------------------------

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

// --------------------------------------------------
// Generate PKCE Code Challenge
// --------------------------------------------------

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// --------------------------------------------------
// Home Route
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Salesforce CRUD Backend is running",
  });
});

// --------------------------------------------------
// Salesforce Login
// --------------------------------------------------

app.get("/auth/login", (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(32).toString("hex");

  // Store OAuth security values in the session
  req.session.codeVerifier = codeVerifier;
  req.session.oauthState = state;

  console.log("LOGIN SESSION ID:", req.sessionID);
  console.log("LOGIN OAUTH STATE:", state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SF_CLIENT_ID,
    redirect_uri: process.env.SF_CALLBACK_URL,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authorizationUrl =
    `${process.env.SF_LOGIN_URL}/services/oauth2/authorize?` +
    params.toString();

  res.redirect(authorizationUrl);
});

// --------------------------------------------------
// Salesforce OAuth Callback
// --------------------------------------------------

app.get("/auth/callback", async (req, res) => {
  try {
    const { code, error, error_description, state } = req.query;

    console.log("CALLBACK SESSION ID:", req.sessionID);
    console.log("CALLBACK OAUTH STATE:", state);
    console.log("SAVED OAUTH STATE:", req.session.oauthState);

    if (error) {
      return res.status(400).json({
        error,
        error_description,
      });
    }
    if (state !== req.session.oauthState) {
      return res.status(400).json({
        error: "Invalid OAuth state",
      });
    }

    if (!code) {
      return res.status(400).json({
        error: "Authorization code was not received",
      });
    }

    const codeVerifier = req.session.codeVerifier;

    if (!codeVerifier) {
      return res.status(400).json({
        error: "PKCE code verifier is missing",
      });
    }

    const tokenResponse = await axios.post(
      `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: process.env.SF_CALLBACK_URL,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    // Store Salesforce token information in server session.
    req.session.salesforce = {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      instanceUrl: tokenResponse.data.instance_url,
      issuedAt: Date.now(),
    };

    delete req.session.codeVerifier;
    delete req.session.oauthState;

    console.log("SESSION BEFORE SAVE:", req.session);
    console.log("SESSION ID BEFORE SAVE:", req.sessionID);

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({
          error: "Failed to save session",
        });
      }

      res.redirect("https://salesforce-crud-frontend-6ypo.onrender.com/");
    });
  } catch (error) {
    console.error(
      "Salesforce OAuth Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Salesforce authentication failed",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// Check Login Status
// --------------------------------------------------
app.get("/auth/status", (req, res) => {
  console.log("========== AUTH STATUS ==========");
  console.log("SESSION ID:", req.sessionID);
  console.log("SESSION:", req.session);
  console.log("SALESFORCE SESSION:", req.session.salesforce);
  console.log("COOKIE:", req.headers.cookie);

  if (req.session.salesforce) {
    return res.json({
      authenticated: true,
    });
  }

  return res.json({
    authenticated: false,
  });
});

// --------------------------------------------------
// Logout
// --------------------------------------------------

app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      message: "Logged out successfully",
    });
  });
});

// --------------------------------------------------
// Salesforce Contact CRUD APIs
// --------------------------------------------------

const SF_API_VERSION = "v66.0";

// Check Salesforce login
function requireSalesforceLogin(req, res, next) {
  if (!req.session.salesforce) {
    return res.status(401).json({
      error: "Not authenticated with Salesforce",
    });
  }

  next();
}

function handleSalesforceError(error, res, message) {
  console.error(`${message}:`, error.response?.data || error.message);

  const status = error.response?.status || 500;

  if (status === 401) {
    return res.status(401).json({
      error: "Salesforce session expired. Please login again.",
    });
  }

  return res.status(status).json({
    error: message,
    details: error.response?.data || error.message,
  });
}

// --------------------------------------------------
// Pagination Helper
// --------------------------------------------------

function getPagination(req) {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

// --------------------------------------------------
// GET Contacts
// --------------------------------------------------
app.get("/api/contacts", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { page, limit, offset } = getPagination(req);

    const query = `
      SELECT Id, FirstName, LastName, Email, Phone, Title
      FROM Contact
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const response = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      {
        params: {
          q: query,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      records: response.data.records,
      page,
      limit,
      hasMore: response.data.records.length === limit,
    });
  } catch (error) {
    console.error("GET Contacts Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch contacts",
      details: error.response?.data || error.message,
    });
  }
});
// --------------------------------------------------
// GET Account Records
// --------------------------------------------------

app.get("/api/accounts", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { page, limit, offset } = getPagination(req);

    const query = `
      SELECT Id, Name, Phone, Website, Industry, Type
      FROM Account
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const response = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      records: response.data.records,
      page,
      limit,
      hasMore: response.data.records.length === limit,
    });
  } catch (error) {
    console.error("GET Accounts Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch accounts",
      details: error.response?.data || error.message,
    });
  }
});
// --------------------------------------------------
// GET Opportunity Records
// --------------------------------------------------

app.get("/api/opportunities", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { page, limit, offset } = getPagination(req);

    const query = `
      SELECT Id, Name, Amount, StageName, CloseDate, Type
      FROM Opportunity
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const response = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      records: response.data.records,
      page,
      limit,
      hasMore: response.data.records.length === limit,
    });
  } catch (error) {
    console.error(
      "GET Opportunities Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to fetch opportunities",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// GET Lead Records
// --------------------------------------------------

app.get("/api/leads", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { page, limit, offset } = getPagination(req);

    const query = `
      SELECT Id, FirstName, LastName, Company, Email, Phone, Status
      FROM Lead
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const response = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      records: response.data.records,
      page,
      limit,
      hasMore: response.data.records.length === limit,
    });
  } catch (error) {
    console.error("GET Leads Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch leads",
      details: error.response?.data || error.message,
    });
  }
});
// --------------------------------------------------
// GET Case Records
// --------------------------------------------------

app.get("/api/cases", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { page, limit, offset } = getPagination(req);

    const query = `
      SELECT Id, CaseNumber, Subject, Status, Priority, Origin
      FROM Case
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const response = await axios.get(
      `${instanceUrl}/services/data/${SF_API_VERSION}/query`,
      {
        params: { q: query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      records: response.data.records,
      page,
      limit,
      hasMore: response.data.records.length === limit,
    });
  } catch (error) {
    console.error("GET Cases Error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch cases",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// CREATE Contact
// --------------------------------------------------

app.post("/api/contacts", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { firstName, lastName, email, phone, title } = req.body;

    if (!lastName) {
      return res.status(400).json({
        error: "Last name is required",
      });
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact`,
      {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone,
        Title: title,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error(
      "CREATE Contact Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to create contact",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// UPDATE Contact
// --------------------------------------------------

app.put("/api/contacts/:id", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { id } = req.params;
    const { firstName, lastName, email, phone, title } = req.body;

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone,
        Title: title,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.json({
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error(
      "UPDATE Contact Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to update contact",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// DELETE Contact
// --------------------------------------------------

app.delete("/api/contacts/:id", requireSalesforceLogin, async (req, res) => {
  try {
    const { accessToken, instanceUrl } = req.session.salesforce;

    const { id } = req.params;

    await axios.delete(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Contact/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE Contact Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to delete contact",
      details: error.response?.data || error.message,
    });
  }
});
// --------------------------------------------------
// Dynamic CRUD APIs for Account, Opportunity, Lead, Case
// --------------------------------------------------

const OBJECT_CONFIG = {
  Account: {
    requiredField: "Name",
    fields: ["Name", "Phone", "Website", "Industry", "Type"],
  },

  Opportunity: {
    requiredField: "Name",
    fields: ["Name", "Amount", "StageName", "CloseDate", "Type"],
  },

  Lead: {
    requiredField: "LastName",
    fields: ["FirstName", "LastName", "Company", "Email", "Phone", "Status"],
  },

  Case: {
    requiredField: "Subject",
    fields: ["CaseNumber", "Subject", "Status", "Priority", "Origin"],
  },
};

const OBJECT_API_NAMES = {
  Account: "Account",
  Opportunity: "Opportunity",
  Lead: "Lead",
  Case: "Case",
};

// --------------------------------------------------
// Helper: Build Salesforce Payload
// --------------------------------------------------

function buildSalesforcePayload(objectName, body) {
  const config = OBJECT_CONFIG[objectName];

  const payload = {};

  config.fields.forEach((field) => {
    // CaseNumber is generated by Salesforce
    if (objectName === "Case" && field === "CaseNumber") {
      return;
    }

    let key = field.charAt(0).toLowerCase() + field.slice(1);

    // Explicit field mappings
    if (field === "CloseDate") {
      key = "closeDate";
    }

    if (field === "StageName") {
      key = "stageName";
    }

    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      payload[field] = body[key];
    }
  });

  return payload;
}

// --------------------------------------------------
// CREATE Dynamic Object
// --------------------------------------------------

app.post("/api/:object", requireSalesforceLogin, async (req, res) => {
  try {
    const objectName = req.params.object;

    // Convert endpoint name to Salesforce object name
    const objectMap = {
      accounts: "Account",
      opportunities: "Opportunity",
      leads: "Lead",
      cases: "Case",
    };

    const salesforceObject = objectMap[objectName];

    if (!salesforceObject) {
      return res.status(400).json({
        error: "Unsupported Salesforce object",
      });
    }

    const config = OBJECT_CONFIG[salesforceObject];

    const { accessToken, instanceUrl } = req.session.salesforce;

    const payload = buildSalesforcePayload(salesforceObject, req.body);
    console.log("Request body:", req.body);
    console.log("Salesforce payload:", payload);

    // Required field validation
    if (!payload[config.requiredField]) {
      return res.status(400).json({
        error: `${config.requiredField} is required`,
      });
    }

    // Opportunity validation
    if (salesforceObject === "Opportunity") {
      if (!payload.StageName) {
        return res.status(400).json({
          error: "StageName is required for Opportunity",
        });
      }

      if (!payload.CloseDate) {
        return res.status(400).json({
          error: "CloseDate is required for Opportunity",
        });
      }
    }

    const response = await axios.post(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${OBJECT_API_NAMES[salesforceObject]}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error(
      "CREATE Dynamic Object Error:",
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      error: "Failed to create record",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// UPDATE Dynamic Object
// --------------------------------------------------

app.put("/api/:object/:id", requireSalesforceLogin, async (req, res) => {
  try {
    const objectName = req.params.object;
    const id = req.params.id;

    const objectMap = {
      accounts: "Account",
      opportunities: "Opportunity",
      leads: "Lead",
      cases: "Case",
    };

    const salesforceObject = objectMap[objectName];

    if (!salesforceObject) {
      return res.status(400).json({
        error: "Unsupported Salesforce object",
      });
    }

    const { accessToken, instanceUrl } = req.session.salesforce;

    const payload = buildSalesforcePayload(salesforceObject, req.body);

    await axios.patch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${OBJECT_API_NAMES[salesforceObject]}/${id}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.json({
      message: `${salesforceObject} updated successfully`,
    });
  } catch (error) {
    console.error(
      "UPDATE Dynamic Object Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to update record",
      details: error.response?.data || error.message,
    });
  }
});

// --------------------------------------------------
// DELETE Dynamic Object
// --------------------------------------------------

app.delete("/api/:object/:id", requireSalesforceLogin, async (req, res) => {
  try {
    const objectName = req.params.object;
    const id = req.params.id;

    const objectMap = {
      accounts: "Account",
      opportunities: "Opportunity",
      leads: "Lead",
      cases: "Case",
    };

    const salesforceObject = objectMap[objectName];

    if (!salesforceObject) {
      return res.status(400).json({
        error: "Unsupported Salesforce object",
      });
    }

    const { accessToken, instanceUrl } = req.session.salesforce;

    await axios.delete(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${OBJECT_API_NAMES[salesforceObject]}/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    res.json({
      message: `${salesforceObject} deleted successfully`,
    });
  } catch (error) {
    console.error(
      "DELETE Dynamic Object Error:",
      error.response?.data || error.message,
    );

    res.status(500).json({
      error: "Failed to delete record",
      details: error.response?.data || error.message,
    });
  }
});
// --------------------------------------------------
// Start Server
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
