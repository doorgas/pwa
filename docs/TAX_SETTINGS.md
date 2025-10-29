# Tax Settings Documentation

## Overview

The Tax Settings feature allows administrators to configure VAT (Value Added Tax) and Service Tax for the application. Both taxes can be configured independently and support either percentage-based or fixed amount calculations.

## Features

### VAT Tax Configuration
- **Enable/Disable**: Toggle VAT tax on or off
- **Type Selection**: Choose between percentage (%) or fixed amount ($)
- **Value Input**: Set the tax rate or fixed amount
- **Real-time Preview**: See how the tax affects a sample $100 order

### Service Tax Configuration
- **Enable/Disable**: Toggle Service tax on or off
- **Type Selection**: Choose between percentage (%) or fixed amount ($)
- **Value Input**: Set the tax rate or fixed amount
- **Real-time Preview**: See how the tax affects a sample $100 order

### Combined Tax Preview
- Shows the total tax impact when both taxes are enabled
- Displays breakdown of individual tax amounts
- Shows final total amount including all taxes

## Database Storage

Tax settings are stored in the `settings` table with the following keys:
- `vat_tax_settings`: VAT tax configuration (JSON)
- `service_tax_settings`: Service tax configuration (JSON)

### Data Structure
```json
{
  "enabled": boolean,
  "type": "percentage" | "fixed",
  "value": number
}
```

## API Endpoints

### GET `/api/settings/tax-settings`
Retrieves current VAT and Service tax settings.

**Response:**
```json
{
  "vatTax": {
    "enabled": false,
    "type": "percentage",
    "value": 0
  },
  "serviceTax": {
    "enabled": false,
    "type": "percentage", 
    "value": 0
  }
}
```

### POST `/api/settings/tax-settings`
Updates VAT and/or Service tax settings.

**Request Body:**
```json
{
  "vatTax": {
    "enabled": true,
    "type": "percentage",
    "value": 18
  },
  "serviceTax": {
    "enabled": true,
    "type": "fixed",
    "value": 5.00
  }
}
```

## Usage in Code

### Import Tax Utilities
```typescript
import { calculateTaxes, fetchTaxSettings, getTaxDescription } from '@/utils/taxUtils';
```

### Calculate Taxes for an Order
```typescript
const taxSettings = await fetchTaxSettings();
const baseAmount = 100.00;

const taxCalculation = calculateTaxes(
  baseAmount,
  taxSettings.vatTax,
  taxSettings.serviceTax
);

console.log('VAT Amount:', taxCalculation.vatAmount);
console.log('Service Tax Amount:', taxCalculation.serviceAmount);
console.log('Total Tax:', taxCalculation.totalTaxAmount);
console.log('Final Amount:', taxCalculation.finalAmount);
```

### Display Tax Information
```typescript
const vatDescription = getTaxDescription(taxSettings.vatTax);
const serviceDescription = getTaxDescription(taxSettings.serviceTax);
```

## Validation Rules

1. **VAT Tax**:
   - Value must be ≥ 0
   - For percentage type: value must be ≤ 100
   - Value must be > 0 when enabled

2. **Service Tax**:
   - Value must be ≥ 0
   - For percentage type: value must be ≤ 100
   - Value must be > 0 when enabled

## User Interface

### Settings Page Location
Navigate to: **Settings** → **Tax Configuration**

### Features
- Toggle switches for enabling/disabling each tax
- Dropdown for selecting tax type (percentage/fixed)
- Number input for tax value with appropriate validation
- Real-time preview showing tax calculations
- Combined tax preview showing total impact
- Save button to persist changes

## Examples

### Example 1: VAT Only (18%)
- Base Amount: $100.00
- VAT Tax: 18% = $18.00
- Total: $118.00

### Example 2: Service Tax Only ($5 fixed)
- Base Amount: $100.00
- Service Tax: $5.00 fixed
- Total: $105.00

### Example 3: Both Taxes
- Base Amount: $100.00
- VAT Tax: 18% = $18.00
- Service Tax: $5.00 fixed
- Total Tax: $23.00
- Total: $123.00

## Integration Points

The tax settings can be integrated into:
- Order creation and editing
- Invoice generation
- Price calculations
- Checkout processes
- Financial reporting

## Security Notes

- Tax settings are stored securely in the database
- Only authenticated admin users can modify tax settings
- All tax calculations are performed server-side
- Input validation prevents invalid tax configurations 