# Salesforce CRUD Application

A full-stack Salesforce CRM web application that allows users to manage Salesforce records through a web-based interface without using the native Salesforce interface.

The application uses React for the frontend, Node.js/Express for the backend, and Salesforce OAuth 2.0 and REST APIs for authentication and CRM operations.

## Live Application

https://salesforce-crud-app-l7yw.onrender.com

## Project Overview

This project provides a user-friendly web interface for managing Salesforce CRM records.

Users can authenticate with Salesforce using OAuth 2.0 and perform standard CRUD (Create, Read, Update, Delete) operations on the following Salesforce standard objects:

- Account
- Opportunity
- Lead
- Contact
- Case

A central object dropdown allows users to select the Salesforce object they want to manage. The application dynamically displays the relevant fields and records for the selected object.

## Features

- Salesforce OAuth 2.0 authentication
- Salesforce connection status
- Central Salesforce object selection dropdown
- Support for five Salesforce standard objects:
  - Account
  - Opportunity
  - Lead
  - Contact
  - Case
- Dynamic object-specific fields
- View Salesforce records
- Search records
- Create new records
- Update existing records
- Delete records
- Pagination with 20 records loaded at a time
- Infinite scrolling to load additional records
- Responsive web interface
- Salesforce REST API integration
- Server-side Salesforce session/token handling

## Salesforce Objects

### Account

Supported fields include:

- Name
- Phone
- Website
- Industry
- Type

### Opportunity

Supported fields include:

- Name
- Amount
- StageName
- CloseDate
- Type

### Lead

Supported fields include:

- FirstName
- LastName
- Company
- Email
- Phone
- Status

### Contact

Supported fields include:

- FirstName
- LastName
- Email
- Phone
- Title

### Case

Supported fields include:

- CaseNumber
- Subject
- Status
- Priority
- Origin

## CRUD Operations

The application supports the following operations:

### Create

Users can create new Salesforce records directly from the web application.

### Read

Users can view Salesforce records and search available records.

### Update

Users can edit existing Salesforce records.

### Delete

Users can delete Salesforce records directly through the application.

## Pagination and Infinite Scroll

The application loads records in batches of 20.

When the user reaches the end of the currently displayed records, the application requests the next set of records from the backend.

Example:

```text
Records 1 - 20
       ↓
Scroll to bottom
       ↓
Records 21 - 40
       ↓
Scroll to bottom
       ↓
Records 41 - 60
       ↓
Continue....
```
