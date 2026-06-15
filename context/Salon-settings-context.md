# Salon Management SaaS — Settings Context File

> **Purpose:** This document defines every configurable setting in the multi-tenant salon management platform, organized by user role. Use this as the authoritative reference when building settings screens, permission guards, database schemas, and API endpoints.

---

## Table of Contents

1. [Tenancy & Data Model](#1-tenancy--data-model)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Salon Owner / Admin Settings](#3-salon-owner--admin-settings)
   - 3.1 Business Profile
   - 3.2 Staff Management
   - 3.3 Services & Pricing
   - 3.4 Booking & Scheduling
   - 3.5 Payments & Billing
   - 3.6 Notifications & Communications
   - 3.7 Inventory
   - 3.8 Security & Compliance
4. [Staff Member Settings](#4-staff-member-settings)
   - 4.1 Schedule & Availability
   - 4.2 Services Offered
   - 4.3 Client & Appointment View
   - 4.4 Notifications
   - 4.5 Pay & Performance
5. [All Users Settings (Owner + Staff)](#5-all-users-settings-owner--staff)
   - 5.1 Personal Profile
   - 5.2 Account Security
   - 5.3 Notification Preferences
   - 5.4 App Preferences
6. [Permission Matrix](#6-permission-matrix)
7. [Database Schema Hints](#7-database-schema-hints)
8. [API Endpoint Suggestions](#8-api-endpoint-suggestions)

---

## 1. Tenancy & Data Model

- Each **tenant** = one salon business (or salon group with multiple locations).
- A tenant has exactly **one owner** (superadmin) and zero or more **staff members**.
- Settings exist at two levels:
  - **Tenant-level settings** — owned by the salon owner, scoped to the tenant. All staff inherit these.
  - **User-level settings** — personal to each user (owner or staff), scoped to `user_id`.
- For multi-location salons, some tenant-level settings can be **overridden per location** (noted below).

---

## 2. Role Hierarchy

```
Owner (superadmin)
  └── Manager (elevated staff — optional promoted role)
        └── Staff (stylist, receptionist, technician, etc.)
```

| Role        | Description                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `owner`     | Full access to all settings. One per tenant.                               |
| `manager`   | Access to staff calendar, client records, and reports. Set by owner.       |
| `staff`     | Access to own schedule, own clients, own earnings only.                    |

> **Implementation note:** The `manager` role is a permission elevation of `staff`, not a separate role type. Store as `role: "staff", permissions: ["view_all_calendar", "edit_clients", "view_reports"]`.

---

## 3. Salon Owner / Admin Settings

All settings in this section are **tenant-scoped** and require `role: owner` or `role: manager` with the relevant permission.

---

### 3.1 Business Profile

**Scope:** `tenant`  
**Access:** Owner only

| Setting Key                  | Type             | Description                                                              | Multi-location Override |
|------------------------------|------------------|--------------------------------------------------------------------------|------------------------|
| `salon_name`                 | `string`         | Public-facing business name                                              | Per location           |
| `logo_url`                   | `string (url)`   | Uploaded logo image URL                                                  | Per location           |
| `address`                    | `object`         | Street, city, state/province, zip, country                               | Per location           |
| `phone`                      | `string`         | Primary contact phone number                                             | Per location           |
| `website_url`                | `string (url)`   | Business website                                                         | No                     |
| `social_links`               | `object`         | `{ instagram, facebook, tiktok, google_business }` URLs                  | No                     |
| `business_hours`             | `object[]`       | Array of `{ day, open_time, close_time, is_closed }` for each weekday   | Per location           |
| `holiday_schedule`           | `object[]`       | Array of `{ date, label, is_closed, custom_hours }`                      | Per location           |
| `seasonal_hour_overrides`    | `object[]`       | Array of `{ start_date, end_date, hours }` for temporary hour changes    | Per location           |
| `locations`                  | `object[]`       | List of branches: `{ location_id, name, address, phone, is_active }`     | N/A (top-level)        |
| `business_license_number`    | `string`         | License number for compliance display                                    | Per location           |
| `tax_id`                     | `string`         | Business tax ID / EIN                                                    | No                     |
| `insurance_docs`             | `file[]`         | Uploaded insurance document URLs                                         | No                     |

---

### 3.2 Staff Management

**Scope:** `tenant`  
**Access:** Owner only (manager can view staff schedules)

#### Invitations & Roles

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `staff_invite_email`         | `string`         | Email address to send an invitation to                                   |
| `staff_role`                 | `enum`           | `owner`, `manager`, `staff`                                              |
| `staff_job_title`            | `string`         | Display title (e.g., "Senior Stylist", "Receptionist")                   |
| `staff_is_active`            | `boolean`        | Whether the staff account is active and bookable                        |
| `staff_color`                | `string (hex)`   | Calendar color assigned to this staff member                             |
| `staff_location_assignment`  | `string[]`       | List of `location_id`s this staff member works at                        |

#### Permissions (per staff member)

| Permission Key                      | Type      | Description                                          |
|-------------------------------------|-----------|------------------------------------------------------|
| `can_view_all_calendar`             | `boolean` | See all staff bookings (not just own)                |
| `can_edit_all_clients`              | `boolean` | Edit any client record                               |
| `can_view_reports`                  | `boolean` | Access revenue and performance reports               |
| `can_manage_inventory`              | `boolean` | Add/edit/delete inventory items                      |
| `can_apply_discounts`               | `boolean` | Apply discounts at POS/checkout                      |
| `can_process_refunds`               | `boolean` | Issue refunds                                        |
| `can_manage_waitlist`               | `boolean` | Add/remove clients from waitlist                     |

#### Commission & Pay

| Setting Key                   | Type             | Description                                                              |
|-------------------------------|------------------|--------------------------------------------------------------------------|
| `pay_type`                    | `enum`           | `hourly`, `salary`, `commission_only`, `hourly_plus_commission`          |
| `hourly_rate`                 | `decimal`        | Hourly wage (if applicable)                                              |
| `salary_amount`               | `decimal`        | Annual or monthly salary (if applicable)                                 |
| `commission_rate`             | `decimal (%)`    | Default commission percentage on services                                |
| `commission_per_service`      | `object[]`       | Override commission by service: `{ service_id, rate }`                   |
| `tip_split_type`              | `enum`           | `keep_all`, `pool_percentage`, `fixed_split`                            |
| `tip_split_value`             | `decimal`        | Pool share or fixed amount depending on split type                       |
| `pay_period`                  | `enum`           | `weekly`, `biweekly`, `monthly`                                         |
| `pay_period_start_day`        | `integer (0–6)`  | Day of week the pay period starts (0 = Sunday)                           |

#### Schedules & Shifts

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `default_shift_pattern`      | `object`         | Template schedule applied when onboarding `{ day, start, end }`         |
| `break_rules`                | `object[]`       | Required breaks: `{ min_shift_hours, break_duration_minutes }`           |
| `overtime_threshold_hours`   | `decimal`        | Hours/week after which overtime applies                                  |
| `overtime_rate_multiplier`   | `decimal`        | Multiplier for overtime pay (e.g., `1.5`)                               |

#### Performance Targets (per staff member)

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `revenue_target_period`      | `enum`           | `weekly`, `monthly`                                                     |
| `revenue_target_amount`      | `decimal`        | Revenue goal amount for the period                                       |
| `rebooking_rate_target`      | `decimal (%)`    | Target % of clients who rebook                                           |
| `client_retention_target`    | `decimal (%)`    | Target % of returning clients                                            |
| `new_client_target`          | `integer`        | Target number of new clients per period                                  |
| `show_targets_to_staff`      | `boolean`        | Whether staff can see their own targets                                  |

---

### 3.3 Services & Pricing

**Scope:** `tenant`  
**Access:** Owner only

#### Service Catalog

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `service_name`               | `string`         | Display name of the service                                              |
| `service_category`           | `string`         | Category group (e.g., "Hair", "Nails", "Skin")                          |
| `service_description`        | `string`         | Client-facing description                                                |
| `service_duration_minutes`   | `integer`        | Default duration in minutes                                              |
| `service_is_active`          | `boolean`        | Whether the service is bookable                                          |
| `service_is_online_bookable` | `boolean`        | Whether clients can book it online (vs in-store only)                    |
| `service_image_url`          | `string (url)`   | Optional image shown in booking widget                                   |
| `service_staff_assignments`  | `string[]`       | List of `staff_id`s who perform this service                             |
| `service_location_overrides` | `object[]`       | Override availability per location: `{ location_id, is_active }`        |

#### Pricing Rules

| Setting Key                      | Type          | Description                                                          |
|----------------------------------|---------------|----------------------------------------------------------------------|
| `base_price`                     | `decimal`     | Default price for the service                                        |
| `currency`                       | `string`      | ISO 4217 currency code (e.g., `USD`, `EUR`, `RWF`)                  |
| `price_per_staff`                | `object[]`    | Staff-level price override: `{ staff_id, price }`                   |
| `peak_pricing_enabled`           | `boolean`     | Whether peak/off-peak pricing is active                              |
| `peak_days`                      | `integer[]`   | Days of week (0–6) considered peak                                   |
| `peak_hours`                     | `object[]`    | `{ start_time, end_time }` ranges for peak pricing                   |
| `peak_price_modifier`            | `decimal (%)`  | % increase applied during peak hours                                |
| `deposit_required`               | `boolean`     | Whether a deposit is required to book                                |
| `deposit_type`                   | `enum`        | `percentage`, `fixed_amount`                                         |
| `deposit_value`                  | `decimal`     | Deposit amount or percentage                                         |

#### Packages & Memberships

| Setting Key                      | Type          | Description                                                          |
|----------------------------------|---------------|----------------------------------------------------------------------|
| `package_name`                   | `string`      | Name of the bundle                                                   |
| `package_services`               | `object[]`    | Services included: `{ service_id, quantity }`                        |
| `package_price`                  | `decimal`     | Total package price (usually discounted)                             |
| `package_validity_days`          | `integer`     | Days from purchase until the package expires                         |
| `membership_name`                | `string`      | Membership tier name (e.g., "Gold", "VIP")                          |
| `membership_price`               | `decimal`     | Monthly or annual cost                                               |
| `membership_billing_cycle`       | `enum`        | `monthly`, `annual`                                                  |
| `membership_benefits`            | `object[]`    | Included perks: `{ type, value }` (e.g., discount, free service)    |
| `loyalty_program_enabled`        | `boolean`     | Whether a points-based loyalty program is active                     |
| `loyalty_points_per_currency`    | `decimal`     | Points earned per unit of currency spent                             |
| `loyalty_redemption_rate`        | `decimal`     | Currency value of each point                                         |

#### Promotions & Discounts

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `promo_code`                 | `string`         | Alphanumeric discount code                                               |
| `promo_type`                 | `enum`           | `percentage`, `fixed_amount`, `buy_x_get_y`, `free_service`             |
| `promo_value`                | `decimal`        | Discount amount or percentage                                            |
| `promo_applies_to`           | `enum`           | `all_services`, `specific_service`, `specific_category`                  |
| `promo_service_ids`          | `string[]`       | Service IDs the promo applies to (if scoped)                             |
| `promo_usage_limit`          | `integer`        | Max total uses (null = unlimited)                                        |
| `promo_per_client_limit`     | `integer`        | Max uses per unique client                                               |
| `promo_start_date`           | `datetime`       | When the promo becomes active                                            |
| `promo_end_date`             | `datetime`       | When the promo expires                                                   |
| `promo_is_active`            | `boolean`        | Manual toggle to enable/disable                                          |
| `referral_program_enabled`   | `boolean`        | Whether a referral program is active                                     |
| `referral_reward_type`       | `enum`           | `discount`, `free_service`, `credit`                                     |
| `referral_reward_value`      | `decimal`        | Value of the referral reward                                             |
| `referral_reward_for`        | `enum`           | `referrer`, `referee`, `both`                                            |

---

### 3.4 Booking & Scheduling

**Scope:** `tenant`  
**Access:** Owner only

#### Online Booking

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `online_booking_enabled`           | `boolean`     | Master toggle for client-facing online booking                     |
| `booking_widget_embed_code`        | `string`      | Auto-generated embed snippet for the salon's website               |
| `booking_page_slug`                | `string`      | Custom URL slug for the hosted booking page                        |
| `booking_page_theme_color`         | `string (hex)`| Primary brand color used in the booking widget                     |
| `booking_page_logo_url`            | `string (url)`| Logo shown on the booking page                                     |
| `booking_page_welcome_message`     | `string`      | Custom message shown to clients at the top of the booking page     |
| `allow_guest_booking`              | `boolean`     | Whether clients can book without creating an account               |
| `require_client_account`           | `boolean`     | Require clients to register/log in before booking                  |
| `staff_selection_enabled`          | `boolean`     | Whether clients can choose their preferred staff member            |
| `staff_selection_mode`             | `enum`        | `optional`, `required`, `hidden` (hidden = auto-assign)            |

#### Booking Rules

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `min_booking_lead_time_hours`      | `integer`     | Minimum hours before appointment that booking is allowed           |
| `max_booking_advance_days`         | `integer`     | How far in advance clients can book (days)                         |
| `cancellation_window_hours`        | `integer`     | Hours before appointment within which cancellation is allowed      |
| `reschedule_window_hours`          | `integer`     | Hours before appointment within which rescheduling is allowed      |
| `buffer_time_before_minutes`       | `integer`     | Buffer added before each appointment                               |
| `buffer_time_after_minutes`        | `integer`     | Buffer added after each appointment                                |
| `slot_increment_minutes`           | `integer`     | Booking time slot intervals shown to clients (e.g., 15, 30)       |
| `max_services_per_booking`         | `integer`     | Max number of services a client can book in a single session        |
| `simultaneous_booking_enabled`     | `boolean`     | Allow a staff member to serve multiple clients at once (e.g., nails)|

#### No-Show Policy

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `no_show_fee_enabled`              | `boolean`     | Whether a fee is charged for no-shows                              |
| `no_show_fee_type`                 | `enum`        | `percentage_of_service`, `fixed_amount`                            |
| `no_show_fee_value`                | `decimal`     | Fee amount or percentage                                           |
| `late_cancellation_fee_enabled`    | `boolean`     | Separate fee for cancellations within the cancellation window      |
| `late_cancellation_fee_value`      | `decimal`     | Late cancellation fee amount                                       |
| `auto_block_after_no_shows`        | `boolean`     | Automatically block clients after repeated no-shows               |
| `no_show_block_threshold`          | `integer`     | Number of no-shows before auto-block is triggered                  |
| `require_card_on_file`             | `boolean`     | Require a saved payment method to complete booking                 |

#### Waitlist

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `waitlist_enabled`                 | `boolean`     | Allow clients to join a waitlist when no slots are available       |
| `waitlist_auto_fill`               | `boolean`     | Automatically offer freed slots to waitlisted clients              |
| `waitlist_notification_window_hours`| `integer`    | Hours in advance to notify waitlist when a slot opens              |

---

### 3.5 Payments & Billing

**Scope:** `tenant`  
**Access:** Owner only

#### Payment Methods

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `payment_processor`                | `enum`        | `stripe`, `square`, `paystack`, `flutterwave`, `custom`           |
| `payment_processor_api_key`        | `string`      | API key / secret for the connected payment processor               |
| `accepted_payment_methods`         | `string[]`    | `["card", "cash", "mobile_money", "gift_card", "bank_transfer"]`  |
| `gift_cards_enabled`               | `boolean`     | Whether gift cards can be sold and redeemed                        |
| `gift_card_expiry_months`          | `integer`     | Months until a gift card expires (null = never)                    |
| `tip_collection_enabled`           | `boolean`     | Whether tip prompts are shown at checkout                          |
| `tip_preset_percentages`           | `integer[]`   | Suggested tip options shown to clients (e.g., `[10, 15, 20]`)     |
| `tip_custom_amount_allowed`        | `boolean`     | Whether clients can enter a custom tip amount                      |

#### Invoice & Receipts

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `invoice_logo_url`                 | `string (url)`| Logo printed on invoices/receipts                                  |
| `invoice_header_text`              | `string`      | Custom text at the top of the invoice                              |
| `invoice_footer_text`              | `string`      | Custom message at the bottom (e.g., thank-you note, policy)        |
| `invoice_show_staff_name`          | `boolean`     | Include the staff member's name on the receipt                     |
| `invoice_show_service_duration`    | `boolean`     | Include service duration on the receipt                            |
| `invoice_numbering_prefix`         | `string`      | Prefix for invoice numbers (e.g., `INV-`, `SAL-`)                 |
| `invoice_next_number`              | `integer`     | Starting/current invoice number (auto-incremented)                 |
| `send_receipt_automatically`       | `boolean`     | Auto-send receipt to client email after checkout                   |
| `receipt_delivery_method`          | `enum`        | `email`, `sms`, `both`, `none`                                     |

#### Tax Settings

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `tax_enabled`                      | `boolean`     | Whether taxes are applied at checkout                              |
| `tax_rates`                        | `object[]`    | `{ name, rate_percentage, applies_to: "services"/"products"/"all" }` |
| `tax_inclusive_pricing`            | `boolean`     | Whether displayed prices already include tax                       |
| `tax_id_display_on_invoice`        | `boolean`     | Show the business tax ID on invoices                               |

#### Reports Access

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `report_revenue_enabled`           | `boolean`     | Revenue reports accessible to owner/managers                       |
| `report_staff_performance_enabled` | `boolean`     | Staff performance reports                                          |
| `report_client_retention_enabled`  | `boolean`     | Client retention and rebooking analytics                           |
| `report_inventory_enabled`         | `boolean`     | Inventory usage and stock reports                                  |
| `report_export_formats`            | `string[]`    | Available export formats: `["csv", "pdf", "xlsx"]`                 |

#### Refund Policy

| Setting Key                        | Type          | Description                                                        |
|------------------------------------|---------------|--------------------------------------------------------------------|
| `refunds_enabled`                  | `boolean`     | Whether refunds can be issued through the system                   |
| `refund_window_days`               | `integer`     | Days after appointment within which a refund is allowed            |
| `partial_refunds_allowed`          | `boolean`     | Whether partial refunds can be issued                              |
| `refund_requires_owner_approval`   | `boolean`     | Whether owner must approve refunds initiated by staff              |

---

### 3.6 Notifications & Communications

**Scope:** `tenant`  
**Access:** Owner only (templates) / Staff can toggle personal delivery

#### Client Reminders

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `reminder_enabled`                   | `boolean`     | Master toggle for client appointment reminders                   |
| `reminder_channels`                  | `string[]`    | `["email", "sms", "whatsapp"]`                                   |
| `reminder_schedule`                  | `object[]`    | `{ hours_before, channel }` — can send multiple reminders        |
| `reminder_email_template`            | `string`      | HTML/text template for email reminders                           |
| `reminder_sms_template`              | `string`      | SMS template (supports merge tags: `{client_name}`, `{time}`)   |
| `reminder_opt_out_handling`          | `enum`        | `unsubscribe_all`, `unsubscribe_channel`, `honor_per_type`       |
| `booking_confirmation_enabled`       | `boolean`     | Send confirmation immediately when booking is made               |
| `booking_confirmation_template`      | `string`      | Template for booking confirmation messages                       |
| `cancellation_notification_enabled`  | `boolean`     | Notify client when appointment is cancelled                      |

#### Review Requests

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `review_request_enabled`             | `boolean`     | Auto-send review request after appointment                       |
| `review_request_delay_hours`         | `integer`     | Hours after appointment to send review request                   |
| `review_request_channel`             | `enum`        | `email`, `sms`, `both`                                           |
| `review_request_template`            | `string`      | Message template for review requests                             |
| `review_platforms`                   | `string[]`    | `["google", "facebook", "yelp", "tripadvisor"]`                  |
| `review_platform_urls`               | `object`      | `{ google: "...", facebook: "..." }` — direct review page links  |

#### Marketing Emails

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `marketing_emails_enabled`           | `boolean`     | Whether marketing/promotional emails can be sent                 |
| `marketing_email_frequency_limit`    | `integer`     | Max marketing emails per client per month                        |
| `marketing_sender_name`              | `string`      | "From" name on marketing emails                                  |
| `marketing_sender_email`             | `string`      | "From" email address                                             |
| `unsubscribe_page_url`               | `string (url)`| Auto-generated or custom unsubscribe landing page                |
| `gdpr_consent_required`              | `boolean`     | Require explicit marketing consent before sending                |

#### Integrations

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `google_calendar_sync_enabled`       | `boolean`     | Sync appointments to/from Google Calendar                        |
| `google_calendar_oauth_token`        | `string`      | OAuth token for Google Calendar integration                      |
| `mailchimp_enabled`                  | `boolean`     | Sync client list with Mailchimp                                  |
| `mailchimp_api_key`                  | `string`      | Mailchimp API key                                                |
| `mailchimp_list_id`                  | `string`      | Target Mailchimp audience/list ID                                |
| `quickbooks_enabled`                 | `boolean`     | Sync financial data with QuickBooks                              |
| `quickbooks_oauth_token`             | `string`      | OAuth token for QuickBooks                                       |
| `zapier_webhook_url`                 | `string (url)`| Webhook URL for Zapier automation triggers                       |
| `meta_pixel_id`                      | `string`      | Meta (Facebook/Instagram) Pixel ID for ad tracking              |
| `google_analytics_id`                | `string`      | Google Analytics tracking ID                                     |

---

### 3.7 Inventory

**Scope:** `tenant`  
**Access:** Owner; optionally managers with `can_manage_inventory`

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `inventory_tracking_enabled`         | `boolean`     | Master toggle for inventory management                           |
| `low_stock_alert_enabled`            | `boolean`     | Whether low stock alerts are active                              |
| `low_stock_threshold_default`        | `integer`     | Default units threshold to trigger low-stock alert               |
| `low_stock_alert_channel`            | `string[]`    | `["email", "push", "sms"]`                                       |
| `low_stock_alert_recipients`         | `string[]`    | List of `user_id`s to notify on low stock                        |
| `auto_reorder_enabled`               | `boolean`     | Whether automatic reorders are triggered at threshold            |
| `supplier_name`                      | `string`      | Supplier display name                                            |
| `supplier_contact_email`             | `string`      | Supplier email for orders                                        |
| `supplier_contact_phone`             | `string`      | Supplier phone number                                            |
| `supplier_lead_time_days`            | `integer`     | Average days from order to delivery for this supplier            |
| `reorder_quantity_default`           | `integer`     | Default quantity to reorder when threshold is reached            |
| `retail_markup_percentage`           | `decimal (%)`  | Default markup applied to retail product pricing                |
| `retail_pos_display_enabled`         | `boolean`     | Show retail products in the POS checkout screen                  |
| `track_product_usage_per_service`    | `boolean`     | Deduct product inventory when a service is completed             |

---

### 3.8 Security & Compliance

**Scope:** `tenant`  
**Access:** Owner only

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `audit_log_enabled`                  | `boolean`     | Whether all user actions are logged                              |
| `audit_log_retention_days`           | `integer`     | How long audit logs are kept                                     |
| `audit_log_export_enabled`           | `boolean`     | Whether logs can be exported by the owner                        |
| `client_data_retention_days`         | `integer`     | Days to retain inactive client data before auto-deletion         |
| `gdpr_deletion_requests_enabled`     | `boolean`     | Allow clients to submit data deletion requests                   |
| `ccpa_opt_out_enabled`               | `boolean`     | Honor CCPA opt-out signals                                       |
| `enforce_2fa_for_staff`              | `boolean`     | Require all staff to enable 2FA                                  |
| `allowed_login_methods`              | `string[]`    | `["email_password", "google", "apple"]` — restrict login methods |
| `session_timeout_minutes`            | `integer`     | Auto-logout after inactivity (minutes)                           |
| `ip_allowlist_enabled`               | `boolean`     | Restrict access to specific IP ranges                            |
| `ip_allowlist`                       | `string[]`    | Allowed IP addresses or CIDR ranges                              |
| `data_export_enabled`                | `boolean`     | Allow export of clients, bookings, and financial data            |
| `data_export_formats`                | `string[]`    | `["csv", "pdf"]`                                                 |

---

## 4. Staff Member Settings

Settings staff can configure for themselves. Tenant-level constraints set by the owner always take precedence.

---

### 4.1 Schedule & Availability

**Scope:** `user` (staff)  
**Access:** Own record only

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `availability`                       | `object[]`    | `{ day_of_week, start_time, end_time, is_available }` per day   |
| `availability_effective_date`        | `date`        | When the current availability template takes effect              |
| `time_off_requests`                  | `object[]`    | `{ start_date, end_date, type, status, notes }` — leave requests |
| `time_off_type`                      | `enum`        | `vacation`, `personal`, `sick`, `unpaid`, `training`             |
| `blocked_slots`                      | `object[]`    | `{ date, start_time, end_time, reason }` — ad-hoc blocked periods|
| `recurring_breaks`                   | `object[]`    | `{ day_of_week, start_time, end_time }` — weekly recurring blocks|
| `max_appointments_per_day`           | `integer`     | Self-imposed cap on daily bookings (null = no limit)             |

---

### 4.2 Services Offered

**Scope:** `user` (staff)  
**Access:** Own record; constrained by owner's catalog

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `offered_service_ids`                | `string[]`    | Services this staff member performs (subset of salon catalog)    |
| `service_duration_overrides`         | `object[]`    | `{ service_id, duration_minutes }` — personal duration overrides |
| `specializations`                    | `string[]`    | Tags shown on booking page (e.g., "Balayage", "Afro Hair")       |
| `bio_for_booking_page`               | `string`      | Short client-facing bio displayed on the staff selection screen  |
| `photo_for_booking_page`             | `string (url)`| Profile photo shown in the booking widget                        |
| `is_bookable_online`                 | `boolean`     | Whether this staff member appears in the online booking widget   |

---

### 4.3 Client & Appointment View

**Scope:** `user` (staff)  
**Access:** Own clients; broader access governed by owner permissions

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `client_notes_access`                | `enum`        | `own_clients`, `all_clients` (set by owner permission)           |
| `client_visit_history_access`        | `enum`        | `own_clients`, `all_clients` (set by owner permission)           |
| `calendar_view_scope`                | `enum`        | `own_only`, `all_staff` (set by owner permission)                |
| `appointment_view_details`           | `enum`        | `basic` (name+time), `full` (service, price, notes)              |

---

### 4.4 Notifications (Staff-facing)

**Scope:** `user` (staff)  
**Access:** Own preferences; master toggles owned by tenant

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `notify_new_booking`                 | `boolean`     | Alert when a new appointment is assigned                         |
| `notify_booking_change`              | `boolean`     | Alert when an existing appointment is modified                   |
| `notify_booking_cancellation`        | `boolean`     | Alert when an appointment is cancelled                           |
| `notify_channel_new_booking`         | `string[]`    | `["push", "email", "sms"]` — delivery channels for new bookings  |
| `notify_daily_schedule_digest`       | `boolean`     | Receive a daily summary of the day's appointments               |
| `notify_digest_time`                 | `time`        | Time of day to send the daily digest                             |
| `notify_upcoming_appointment`        | `boolean`     | Reminder before each appointment starts                          |
| `notify_upcoming_minutes_before`     | `integer`     | Minutes before appointment to trigger the reminder               |
| `notify_client_message`              | `boolean`     | Alert when a client sends a message (if messaging is enabled)    |

---

### 4.5 Pay & Performance

**Scope:** `user` (staff) — read-only view  
**Access:** Own data only; display governed by owner's `show_targets_to_staff` flag

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `earnings_view_enabled`              | `boolean`     | (Owner-set) whether staff can see their own earnings             |
| `earnings_breakdown_visible`         | `boolean`     | (Owner-set) show commissions, tips, and salary separately        |
| `payroll_history_visible`            | `boolean`     | (Owner-set) whether past pay periods are accessible              |
| `goal_tracking_visible`              | `boolean`     | (Owner-set) whether personal targets are shown to staff          |

---

## 5. All Users Settings (Owner + Staff)

These settings are available to every user in the system regardless of role.

---

### 5.1 Personal Profile

**Scope:** `user`  
**Access:** Own record only

| Setting Key                  | Type             | Description                                                              |
|------------------------------|------------------|--------------------------------------------------------------------------|
| `display_name`               | `string`         | Name shown in the app and to clients                                     |
| `profile_photo_url`          | `string (url)`   | Headshot shown in staff listings and booking pages                       |
| `job_title`                  | `string`         | Role/title displayed to clients (e.g., "Master Colorist")                |
| `bio`                        | `string`         | Short bio shown on the booking widget                                    |
| `years_of_experience`        | `integer`        | Optional experience field shown to clients                               |
| `preferred_language`         | `string`         | ISO 639-1 language code for the UI (e.g., `en`, `fr`, `rw`)             |
| `timezone`                   | `string`         | IANA timezone string (e.g., `Africa/Kigali`, `America/New_York`)         |

---

### 5.2 Account Security

**Scope:** `user`  
**Access:** Own record only

| Setting Key                      | Type          | Description                                                          |
|----------------------------------|---------------|----------------------------------------------------------------------|
| `email`                          | `string`      | Login email address (change requires re-verification)                |
| `password_hash`                  | `string`      | Hashed password (never expose; change via reset flow)                |
| `password_last_changed_at`       | `datetime`    | Timestamp of last password change                                    |
| `two_factor_enabled`             | `boolean`     | Whether 2FA is active for this account                               |
| `two_factor_method`              | `enum`        | `authenticator_app`, `sms`                                           |
| `two_factor_phone`               | `string`      | Phone number for SMS-based 2FA                                       |
| `two_factor_backup_codes`        | `string[]`    | Hashed one-time backup codes                                         |
| `active_sessions`                | `object[]`    | `{ session_id, device, ip, last_active }` — viewable and revocable   |
| `google_oauth_linked`            | `boolean`     | Whether Google account is linked for sign-in                         |
| `apple_oauth_linked`             | `boolean`     | Whether Apple ID is linked for sign-in                               |
| `login_notification_enabled`     | `boolean`     | Receive alert on new login from an unrecognized device               |

---

### 5.3 Notification Preferences

**Scope:** `user`  
**Access:** Own record; tenant-level master toggles take precedence

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `email_notifications_enabled`        | `boolean`     | Master toggle for all email notifications                        |
| `email_notification_types`           | `string[]`    | Opt in/out per type: `["booking", "reminder", "report", "promo"]`|
| `push_notifications_enabled`         | `boolean`     | Master toggle for push notifications                             |
| `push_notification_types`            | `string[]`    | Opt in/out per type same as email types                          |
| `sms_notifications_enabled`          | `boolean`     | Master toggle for SMS notifications                              |
| `sms_notification_types`             | `string[]`    | Opt in/out per type                                              |
| `sms_phone_number`                   | `string`      | Phone number for SMS delivery                                    |
| `quiet_hours_enabled`                | `boolean`     | Mute notifications outside defined hours                         |
| `quiet_hours_start`                  | `time`        | Start of quiet period (e.g., `22:00`)                            |
| `quiet_hours_end`                    | `time`        | End of quiet period (e.g., `07:00`)                              |
| `quiet_hours_timezone`               | `string`      | Timezone applied to quiet hours window                           |

---

### 5.4 App Preferences

**Scope:** `user`  
**Access:** Own record only

| Setting Key                          | Type          | Description                                                      |
|--------------------------------------|---------------|------------------------------------------------------------------|
| `theme`                              | `enum`        | `light`, `dark`, `system`                                        |
| `default_landing_view`               | `enum`        | `calendar`, `dashboard`, `client_list`, `pos`                    |
| `calendar_default_view`              | `enum`        | `day`, `week`, `agenda`                                          |
| `calendar_start_hour`                | `integer`     | Hour to start the calendar day view (e.g., `8` for 8 AM)         |
| `calendar_end_hour`                  | `integer`     | Hour to end the calendar day view (e.g., `20` for 8 PM)          |
| `time_format`                        | `enum`        | `12h`, `24h`                                                     |
| `date_format`                        | `enum`        | `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`                         |
| `first_day_of_week`                  | `integer`     | `0` = Sunday, `1` = Monday                                       |
| `sound_effects_enabled`              | `boolean`     | Play sounds on notifications or checkout                         |

---

## 6. Permission Matrix

| Feature / Action                        | Owner | Manager | Staff |
|-----------------------------------------|:-----:|:-------:|:-----:|
| Edit business profile                   | ✅    | ❌      | ❌    |
| Manage staff roles & permissions        | ✅    | ❌      | ❌    |
| Set commission & pay rules              | ✅    | ❌      | ❌    |
| Create/edit services & pricing          | ✅    | ❌      | ❌    |
| Create promotions & packages            | ✅    | ❌      | ❌    |
| Configure booking rules                 | ✅    | ❌      | ❌    |
| Configure payment methods               | ✅    | ❌      | ❌    |
| Issue refunds                           | ✅    | ⚙️*     | ⚙️*  |
| View all staff calendar                 | ✅    | ⚙️*     | ❌    |
| View own calendar                       | ✅    | ✅      | ✅    |
| Edit all client records                 | ✅    | ⚙️*     | ❌    |
| Edit own client notes                   | ✅    | ✅      | ✅    |
| View revenue reports                    | ✅    | ⚙️*     | ❌    |
| View own earnings                       | ✅    | ✅      | ⚙️*  |
| Manage inventory                        | ✅    | ⚙️*     | ❌    |
| Apply discounts at POS                  | ✅    | ⚙️*     | ⚙️*  |
| View audit logs                         | ✅    | ❌      | ❌    |
| Export data                             | ✅    | ❌      | ❌    |
| Manage integrations                     | ✅    | ❌      | ❌    |
| Set own availability                    | ✅    | ✅      | ✅    |
| Request time off                        | ✅    | ✅      | ✅    |
| Update personal profile                 | ✅    | ✅      | ✅    |
| Update account security                 | ✅    | ✅      | ✅    |
| Update notification preferences         | ✅    | ✅      | ✅    |
| Update app preferences                  | ✅    | ✅      | ✅    |

> ⚙️* = controlled by a per-user permission toggle set by the owner.

---

## 7. Database Schema Hints

### Suggested Tables

```
tenants
  id, name, slug, plan, created_at, owner_user_id

tenant_settings
  tenant_id, key, value, updated_at
  (key-value store for all tenant-scoped settings above)

locations
  id, tenant_id, name, address, phone, is_active

users
  id, tenant_id, email, password_hash, role, is_active, created_at

user_settings
  user_id, key, value, updated_at
  (key-value store for all user-scoped settings above)

staff_profiles
  user_id, tenant_id, display_name, bio, photo_url, job_title, years_experience, color

staff_permissions
  user_id, permission_key, value (boolean)

staff_availability
  id, user_id, day_of_week, start_time, end_time, is_available

staff_blocked_slots
  id, user_id, date, start_time, end_time, reason

time_off_requests
  id, user_id, start_date, end_date, type, status, notes, reviewed_by

services
  id, tenant_id, name, category, description, duration_minutes, is_active, is_online_bookable

service_pricing
  id, service_id, base_price, currency, staff_id (nullable for per-staff prices)

staff_services
  staff_id, service_id, duration_override_minutes (nullable)

promotions
  id, tenant_id, code, type, value, applies_to, usage_limit, per_client_limit, start_date, end_date, is_active

audit_logs
  id, tenant_id, user_id, action, resource_type, resource_id, metadata, created_at
```

### Key Design Decisions

- Use a **key-value store** (`tenant_settings`, `user_settings`) for settings rather than columns, so adding new settings never requires a schema migration.
- Store all **monetary values as integers in the smallest currency unit** (cents/pence) to avoid floating-point errors.
- Store all **times in UTC** in the database; apply timezone conversion at the application layer using the user's `timezone` setting.
- Use **soft deletes** (`deleted_at`) on users, services, and appointments to preserve historical data integrity.

---

## 8. API Endpoint Suggestions

```
# Tenant settings (owner only)
GET    /api/v1/tenant/settings
PATCH  /api/v1/tenant/settings

# Business profile
GET    /api/v1/tenant/profile
PATCH  /api/v1/tenant/profile

# Locations
GET    /api/v1/tenant/locations
POST   /api/v1/tenant/locations
PATCH  /api/v1/tenant/locations/:location_id
DELETE /api/v1/tenant/locations/:location_id

# Staff management
GET    /api/v1/staff
POST   /api/v1/staff/invite
GET    /api/v1/staff/:user_id
PATCH  /api/v1/staff/:user_id
DELETE /api/v1/staff/:user_id
GET    /api/v1/staff/:user_id/permissions
PATCH  /api/v1/staff/:user_id/permissions

# Staff availability (staff manage own; owners can view all)
GET    /api/v1/staff/:user_id/availability
PUT    /api/v1/staff/:user_id/availability
GET    /api/v1/staff/:user_id/blocked-slots
POST   /api/v1/staff/:user_id/blocked-slots
DELETE /api/v1/staff/:user_id/blocked-slots/:slot_id
GET    /api/v1/staff/:user_id/time-off
POST   /api/v1/staff/:user_id/time-off
PATCH  /api/v1/staff/:user_id/time-off/:request_id  # approve/deny

# Services
GET    /api/v1/services
POST   /api/v1/services
PATCH  /api/v1/services/:service_id
DELETE /api/v1/services/:service_id

# Promotions
GET    /api/v1/promotions
POST   /api/v1/promotions
PATCH  /api/v1/promotions/:promo_id
DELETE /api/v1/promotions/:promo_id

# User personal settings (all roles, own record)
GET    /api/v1/me/settings
PATCH  /api/v1/me/settings
GET    /api/v1/me/profile
PATCH  /api/v1/me/profile
GET    /api/v1/me/security
PATCH  /api/v1/me/security
GET    /api/v1/me/sessions
DELETE /api/v1/me/sessions/:session_id
GET    /api/v1/me/notifications
PATCH  /api/v1/me/notifications
GET    /api/v1/me/availability
PUT    /api/v1/me/availability
GET    /api/v1/me/services
PUT    /api/v1/me/services
GET    /api/v1/me/earnings  # staff: own; owner: all

# Audit logs
GET    /api/v1/tenant/audit-logs
GET    /api/v1/tenant/audit-logs/export
```

---

