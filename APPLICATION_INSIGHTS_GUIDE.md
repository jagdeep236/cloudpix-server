# Application Insights - How to View Logs in Azure Portal

This guide shows you how to access and view Application Insights telemetry data in Azure Portal.

## Step 1: Navigate to Application Insights

1. **Log in to Azure Portal**: Go to [https://portal.azure.com](https://portal.azure.com)

2. **Find Your Application Insights Resource**:
   - Click on **"All resources"** in the left sidebar
   - Search for your Application Insights resource (e.g., `cloudpix-insights`)
   - Or go to **"Monitor"** > **"Application Insights"** in the left sidebar

3. **Open Your Application Insights Resource**: Click on your Application Insights resource name

## Step 2: Main Views and Sections

Once you're in your Application Insights resource, you'll see several sections:

### Overview Dashboard
- **Location**: Main page when you open Application Insights
- **Shows**: 
  - Request rate (requests per minute)
  - Response time
  - Failed requests
  - Server response time
  - Recent activity timeline

### Logs (Log Analytics)
- **Location**: Left sidebar > **"Logs"**
- **Purpose**: Query and analyze all telemetry data using KQL (Kusto Query Language)
- **This is where you'll spend most of your time!**

### Transaction Search
- **Location**: Left sidebar > **"Transaction search"**
- **Purpose**: Search for specific requests, dependencies, exceptions, and traces
- **Useful for**: Finding specific user actions or errors

### Failures
- **Location**: Left sidebar > **"Failures"**
- **Purpose**: View all exceptions and failed requests
- **Shows**: Exception types, failure rates, affected users

### Performance
- **Location**: Left sidebar > **"Performance"**
- **Purpose**: Analyze response times and performance bottlenecks
- **Shows**: Slowest operations, dependency calls, database queries

### Live Metrics Stream
- **Location**: Left sidebar > **"Live Metrics Stream"**
- **Purpose**: Real-time monitoring of requests, exceptions, and performance
- **Useful for**: Debugging issues as they happen

## Step 3: Using Logs (KQL Queries)

The **Logs** section is the most powerful tool for querying your telemetry data.

### Access Logs:
1. Click **"Logs"** in the left sidebar
2. You'll see a query editor with sample queries

### Common Queries for Your Application

#### 1. View All HTTP Requests (Last 24 Hours)
```kusto
requests
| where timestamp > ago(24h)
| project timestamp, name, url, resultCode, duration, success
| order by timestamp desc
```

#### 2. View All Exceptions
```kusto
exceptions
| where timestamp > ago(24h)
| project timestamp, type, message, outerMessage, severityLevel
| order by timestamp desc
```

#### 3. View Custom Events (Auth, Files, Share Links)
```kusto
customEvents
| where timestamp > ago(24h)
| project timestamp, name, customDimensions
| order by timestamp desc
```

#### 4. View Specific Custom Events (e.g., Login Events)
```kusto
customEvents
| where name == "auth_login_success" or name == "auth_login_failed"
| where timestamp > ago(24h)
| project timestamp, name, customDimensions
| order by timestamp desc
```

#### 5. View File Upload Events
```kusto
customEvents
| where name == "file_upload_success"
| where timestamp > ago(24h)
| project timestamp, name, customDimensions
| order by timestamp desc
```

#### 6. View Share Link Events
```kusto
customEvents
| where name startswith "share_link"
| where timestamp > ago(24h)
| project timestamp, name, customDimensions
| order by timestamp desc
```

#### 7. View Dependencies (Cosmos DB, Blob Storage Calls)
```kusto
dependencies
| where timestamp > ago(24h)
| project timestamp, name, type, target, success, duration
| order by timestamp desc
```

#### 8. View Failed Requests
```kusto
requests
| where timestamp > ago(24h)
| where success == false
| project timestamp, name, url, resultCode, duration
| order by timestamp desc
```

#### 9. View Performance Metrics (Slow Requests)
```kusto
requests
| where timestamp > ago(24h)
| where duration > 1000  // Requests taking more than 1 second
| project timestamp, name, url, duration, resultCode
| order by duration desc
```

#### 10. View Custom Metrics (File Upload Sizes)
```kusto
customMetrics
| where name == "file_upload_size"
| where timestamp > ago(24h)
| project timestamp, name, value
| order by timestamp desc
```

#### 11. View Traces (Console Logs)
```kusto
traces
| where timestamp > ago(24h)
| project timestamp, message, severityLevel
| order by timestamp desc
```

#### 12. Count Requests by Endpoint
```kusto
requests
| where timestamp > ago(24h)
| summarize count() by name
| order by count_ desc
```

#### 13. View Exception Details with Stack Traces
```kusto
exceptions
| where timestamp > ago(24h)
| project timestamp, type, outerMessage, details, severityLevel
| order by timestamp desc
```

#### 14. View All Telemetry for a Specific Time Range
```kusto
union requests, exceptions, customEvents, dependencies, traces
| where timestamp > ago(1h)
| project timestamp, itemType, name, message
| order by timestamp desc
```

## Step 4: Using Transaction Search

**Transaction Search** is useful for finding specific user actions:

1. Click **"Transaction search"** in the left sidebar
2. Use filters:
   - **Time range**: Select your time window
   - **Event types**: Requests, Dependencies, Exceptions, Traces, Custom Events
   - **Search**: Type keywords (e.g., "login", "upload", "share")
3. Click on any result to see the full transaction details

## Step 5: Viewing Failures

1. Click **"Failures"** in the left sidebar
2. You'll see:
   - **Exception types**: Grouped by exception type
   - **Failed requests**: HTTP errors (4xx, 5xx)
   - **Affected users**: How many users experienced failures
3. Click on any exception to see details and stack traces

## Step 6: Performance Analysis

1. Click **"Performance"** in the left sidebar
2. View:
   - **Slowest operations**: Requests sorted by duration
   - **Dependencies**: External service calls (Cosmos DB, Blob Storage)
   - **Operations**: Breakdown by endpoint
3. Click on any operation to see detailed performance metrics

## Step 7: Live Metrics Stream

For real-time monitoring:

1. Click **"Live Metrics Stream"** in the left sidebar
2. You'll see:
   - **Incoming requests**: Real-time request rate
   - **Outgoing requests**: Dependency calls
   - **Server health**: CPU, memory, request rate
   - **Sample telemetry**: Recent requests, exceptions, traces

## Step 8: Creating Alerts

Set up alerts for important events:

1. Click **"Alerts"** in the left sidebar
2. Click **"+ Create"** > **"Alert rule"**
3. Configure:
   - **Condition**: When to trigger (e.g., exception rate > 10)
   - **Actions**: Email, SMS, webhook notifications
   - **Alert rule name**: Descriptive name

### Example Alert: High Exception Rate
- **Signal**: Exception rate
- **Condition**: Greater than 10 exceptions per minute
- **Action**: Send email to your team

## Step 9: Exporting Data

### Export to Excel/CSV:
1. In **Logs**, run your query
2. Click **"Export"** > **"Export to CSV"** or **"Export to Excel"**

### Pin to Dashboard:
1. Run your query in **Logs**
2. Click **"Pin to dashboard"**
3. Select your dashboard
4. The chart will appear on your Azure dashboard

## Step 10: Saved Queries

Save frequently used queries:

1. In **Logs**, write your query
2. Click **"Save"** > **"Save query"**
3. Give it a name (e.g., "Failed Login Attempts")
4. Access it later from **"Saved queries"** in the left sidebar

## Quick Reference: What Data is Available

| Data Type | Table Name | What It Contains |
|-----------|-----------|------------------|
| HTTP Requests | `requests` | All API calls (GET, POST, PUT, DELETE) |
| Exceptions | `exceptions` | All errors and exceptions |
| Custom Events | `customEvents` | Business events (login, upload, share) |
| Dependencies | `dependencies` | External calls (Cosmos DB, Blob Storage) |
| Traces | `traces` | Console logs and custom traces |
| Custom Metrics | `customMetrics` | Custom numeric metrics (file sizes) |
| Performance Counters | `performanceCounters` | CPU, memory, disk usage |

## Tips for Effective Log Analysis

1. **Use Time Ranges**: Always specify a time range (`ago(24h)`, `ago(1h)`, etc.)
2. **Filter Early**: Use `where` clauses to filter data before processing
3. **Use Project**: Use `project` to select only needed columns
4. **Order Results**: Use `order by timestamp desc` to see recent events first
5. **Save Queries**: Save frequently used queries for quick access
6. **Set Alerts**: Create alerts for critical issues (high error rates, slow responses)

## Troubleshooting: No Data Appearing?

If you don't see data in Application Insights:

1. **Check Connection String**: Verify `APPLICATIONINSIGHTS_CONNECTION_STRING` is set in Azure App Service
2. **Wait a Few Minutes**: Data can take 2-5 minutes to appear
3. **Check Time Range**: Make sure your time range includes when the app was running
4. **Verify Initialization**: Check app logs for "Application Insights initialized successfully"
5. **Check Resource**: Ensure you're looking at the correct Application Insights resource

## Direct Links

- **Azure Portal**: https://portal.azure.com
- **Application Insights Overview**: Navigate to your resource in Azure Portal
- **Logs Query Editor**: Your App Insights Resource > Logs

## Next Steps

- Set up alerts for critical errors
- Create custom dashboards with important metrics
- Export data for analysis
- Set up continuous export to Azure Storage (for long-term retention)

