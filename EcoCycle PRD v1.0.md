EcoCycle PRD v1.0 

# EcoCycle: Product Requirements Document (PRD) 

**Version:** 1.0 (Draft) | **Platform:** Responsive website (no native apps in v1) | **Market:** India | **Model:** Two-sided marketplace for e-waste collection and recycling 

## 1. Product Overview 

EcoCycle is a marketplace that connects households and businesses who have e-waste with verified independent collectors, who in turn deliver to verified, authorized recyclers. EcoCycle does not collect or recycle anything itself. It acts as the middle layer, the way food delivery apps sit between customers, restaurants and delivery partners. It handles discovery, dispatch, verification, tracking, records, rewards and settlement. 

**Problem.** People have old laptops, phones and chargers at home but no trusted way to dispose of them. Informal scrap buyers are convenient but unaccountable, and e-waste often ends up in unsafe processing. Collectors and recyclers lack a steady stream of leads and a trustworthy paper trail. 

**Solution.** An easy booking flow for customers, a job-dispatch workspace for collectors, an intake and processing workspace for recyclers, and an admin console to verify participants, resolve disputes and run the marketplace. Customers earn reward points for every verified kilogram, redeemable later in a reward store. 

## 2. Goals, Non-Goals and Success Metrics 

#### **Goals (v1)** 

- Let a customer book a pickup in under 3 minutes. 

- Match each request with a verified collector nearby, with live status tracking. 

- Create a verifiable chain of custody: customer, collector, recycler, with weights recorded at each handover. 

- Onboard and verify collectors and recyclers through an admin-reviewed process. Credit reward points only after the recycler confirms receipt. 

#### **Non-goals (v1)** 

Native mobile apps (a responsive website covers all roles for now). 

- Reward store checkout, real-money purchases of points, and online customer payments (see Phase 2). 

Page 1 of 14 

EcoCycle PRD v1.0 

- IoT smart bins, scenario generators, demo or simulation mode (these belong to the old simulator). 

- Issuing any government or regulatory certificate. EcoCycle shows records provided by recyclers and does not certify recycling itself. 

#### **Success metrics** 

|Metric|Target (first 6 months, pilot city)|
|---|---|
|Pickup request to collector accepted|median under 10 minutes|
|Pickup completion rate|above 80% of accepted jobs|
|Pickups with recycler-verified weight|above 90% of completed pickups|
|Collector verification turnaround|under 48 hours|
|Customer rating|4.3 / 5 or higher|
|Repeat customers (second pickup in 90 days)|above 25%|



## 3. Users and Roles 

|Role|Who|Main needs|
|---|---|---|
|CUSTOMER|Household or small business|Book pickup, track it, earn points,<br>see history|
|COLLECTOR|Independent verified individual<br>or small outfit|Receive jobs, navigate, weigh, hand<br>over to recycler, get paid|
|RECYCLER|Verified, authorized recycling<br>facility|Receive deliveries, confirm weights,<br>record processing, upload<br>documents|
|ADMIN|EcoCycle operations team|Verify participants, monitor, resolve<br>disputes, configure rates and points|
|SUPPORT|Customer support staff|View jobs and tickets, limited|
|(optional)||actions, no financial configuration|



## 4. Core Marketplace Flow 

1. **Request.** Customer enters address (map pin), item categories and quantities, estimated weight, photos, and a preferred time slot. 

Page 2 of 14 

EcoCycle PRD v1.0 

2. **Dispatch.** The system offers the job to verified, online collectors within the service radius, ranked by distance, rating and acceptance rate. The first collector to accept wins the job. If nobody accepts within the timeout, the offer widens to a larger radius, then escalates to admin. 

3. **Confirmation.** Customer sees collector name, photo, rating and vehicle details. A 4- digit handover code is shown to the customer. 

4. **Travel and arrival.** Collector marks "On the way" and "Arrived". The browser shares location during an active job, with consent. 

5. **Weighing and collection.** Collector weighs items, enters actual weight per category, uploads a photo, and the customer confirms with the handover code. Large weight differences from the estimate trigger a reconfirmation. 

6. **Delivery to recycler.** Collector selects a recycler, aggregates collected jobs into a delivery batch, and hands over the load. 

7. **Recycler verification.** The recycler records received weight per category and accepts or flags the delivery. Any mismatch with the collector's weight goes to a dispute queue. 

8. **Completion.** On recycler confirmation, the pickup is marked COMPLETED, customer points are credited, and the collector's earnings are recorded. 

#### **Pickup status lifecycle** 

REQUESTED → OFFERED → ACCEPTED → EN_ROUTE → ARRIVED → COLLECTED → DELIVERED_TO_RECYCLER → RECYCLER_VERIFIED → COMPLETED 

Exit states: CANCELLED (by customer or collector before collection), NO_COLLECTOR_FOUND, FAILED (customer absent or items not as described), DISPUTED. 

Every status change is stored with a timestamp, actor and location where applicable. 

## 5. Functional Requirements 

### 5.1 Authentication and Account Management 

- Registration with email or mobile number plus password, with email and mobile OTP verification. 

- Login with email or mobile and password. Optional Google sign-in for customers. Passwords hashed with argon2id. Minimum length and breached-password checks. 

- Short-lived access tokens with rotating refresh tokens, stored in httpOnly secure cookies. Session list with "log out of all devices". 

- Password reset by OTP or email link with expiry. Rate limiting and lockout on repeated failures. 

Page 3 of 14 

EcoCycle PRD v1.0 

- Optional TOTP two-factor authentication, mandatory for Admin and Recycler accounts. Role-based access control enforced on the server for every endpoint. 

- Account deletion request that respects data-retention duties for transaction and chain-of-custody records. 

### 5.2 Customer Module 

- Saved addresses with map pin and landmark. 

- Create pickup with categories (laptop, mobile, TV, battery, charger and cables, appliances, other), quantities, photos and time slot. 

- Live tracking page: status timeline, collector details, ETA, and a map showing collector location during an active job. 

- Cancel before collector arrival (reason required). 

- Rate and review the collector after completion; raise a complaint or dispute. 

- Reward wallet: points balance, ledger of every credit and debit. 

- Pickup history with weights and recycler name per completed pickup. 

- Notification preferences (email, SMS, in-app). 

- Data-wipe advisory shown at booking: customers are responsible for backing up and wiping personal data from devices. 

### 5.3 Collector Module 

- Onboarding: personal details, phone, address, government ID, selfie, vehicle details, service area, bank or UPI details for payouts, and any business registration if applicable. Status moves PENDING → UNDER_REVIEW → VERIFIED, or REJECTED with reason. Only VERIFIED collectors can go online. 

- Online/offline toggle and service radius setting. 

- Job inbox showing nearby offers with distance, item summary and estimated weight. Accept or decline with timeout. 

- Active job screen: customer address, map link, status buttons, customer contact via masked calling or in-app messaging, and handover code entry. 

- Weighing form: actual weight per category, photo evidence, notes. 

- Delivery batches: group collected jobs and select the destination recycler, with batch total weight. 

- Earnings: per-job earnings, pending versus paid, payout history. 

- Ratings and performance stats: acceptance rate, completion rate, average rating. Safety rules: prohibited item list (for example leaking batteries, broken CRT glass, items with visible damage) with the option to refuse a pickup and report it. 

Page 4 of 14 

EcoCycle PRD v1.0 

### 5.4 Recycler Module 

- Onboarding: facility details, authorization and registration documents, address, GST and PAN, capacity and accepted categories, contact persons. Admin verifies documents and sets expiry reminders. Verification lapses automatically when a document expires. 

- Incoming deliveries queue with expected weight and collector details. 

- Receive and verify: enter received weight per category, accept, partially accept or reject with reason and photos. 

- Facility inventory: stock by category, intake date and status (RECEIVED, SORTED, IN_PROCESSING, PROCESSED). 

- Processing records: batch creation, material outputs (for example metal, plastic, glass, hazardous fraction sent onward) and downloadable processing documents uploaded by the recycler. 

- Rate card visibility: per-kg rates paid by category (set by admin or negotiated, see assumptions). 

- Reports: intake by period, category and collector. 

### 5.5 Admin Module 

- Verification queues for collectors and recyclers with document viewer, approve, reject, request-more-info, and suspend actions. 

- Live operations view: pickups by status, collectors online, unassigned jobs, map view. Pickup management: reassign collector, cancel, force-complete with audit reason. 

- Dispute and complaint handling with evidence timeline (photos, weights, location trail). 

- Configuration: service areas, categories, per-kg points, rate cards, commission percentage, dispatch radius and timeouts, prohibited items. 

- Rewards administration: manual adjustments and reversals with mandatory reason, fraud flags. 

- User management, role assignment and impersonation-free support tools. 

- Reports and analytics: pickups, weight by category, completion funnel, collector and recycler performance, points issued versus redeemed. Export to CSV. Immutable audit log of all sensitive actions. 

### 5.6 Rewards Engine 

- Points are earned per verified kilogram, with configurable multipliers per category. Example default: 1 kg = 10 points. 

Page 5 of 14 

EcoCycle PRD v1.0 

- Points are credited only on RECYCLER_VERIFIED, using the recycler-confirmed weight. 

- Double-entry style ledger: every credit, debit, reversal and adjustment is a row with reason and reference. Balance is derived from the ledger. 

- Anti-abuse: daily and monthly caps, duplicate-address and device checks, reversal when a pickup is later disputed or found fraudulent. 

- Points expiry policy is configurable (default: none in v1). 

- **Phase 2:** reward store with catalogue, stock, redemption orders, vouchers and partner fulfilment. 

### 5.7 Notifications 

- Channels: in-app notification centre, email, and SMS for key events (pickup accepted, collector arriving, handover code, completed, points credited). 

- Templates managed in admin. User opt-outs honoured where legally permitted. 

- Transactional SMS in India requires DLT template registration, so lead time is needed before launch. 

### 5.8 Ratings, Complaints and Disputes 

- Two-way ratings: customers rate collectors, collectors rate customers. 

- Complaint categories: no-show, behaviour, weight mismatch, wrong items, points not credited. 

- Dispute resolution workflow with SLA timers, evidence, decision and outcome (points reversal, collector penalty, recycler flag). 

## 6. Roles and Permissions Matrix 

|Capability|Customer|Collector|Recycler|Admin|
|---|---|---|---|---|
|Create pickup|Yes|No|No|On behalf of<br>customer|
|View own pickups|Yes|Assigned only|Linked deliveries<br>only|All|
|Accept jobs|No|Yes (verified<br>only)|No|Reassign|
|Enter collection<br>weight|No|Yes|No|Override with<br>reason|



Page 6 of 14 

EcoCycle PRD v1.0 

|Capability|Customer|Collector|Recycler|Admin|
|---|---|---|---|---|
|Enter received<br>weight|No|No|Yes|Override with<br>reason|
|Verify collectors|No|No|No|Yes|
|Verify recyclers|No|No|No|Yes|
|Manage reward<br>config|No|No|No|Yes|
|View reward<br>wallet|Own|No|No|All|
|View audit logs|No|No|No|Yes|



PII exposure rules: collectors see customer name, address and masked phone only for their active job. Recyclers never see customer personal details unless required for compliance records, in which case the minimum is shared. 

## 7. Data Model (PostgreSQL) 

- Core entities. All tables carry id (UUID), created_at, updated_at. 

   - **users** : email, phone, password_hash, role, status, email_verified_at, phone_verified_at, mfa_secret. 

   - **sessions / refresh_tokens** : user_id, token_hash, device, expires_at, revoked_at. **customer_profiles** : user_id, name, default_address_id. 

   - **addresses** : user_id, line1, line2, city, state, pincode, lat, lng, landmark. 

   - **collector_profiles** : user_id, verification_status, vehicle_type, vehicle_number, service_radius_km, is_online, last_lat, last_lng, bank_ref, rating_avg. 

   - **recycler_profiles** : user_id, facility_name, address, gst, pan, capacity_kg, categories_accepted, verification_status. 

   - **verification_documents** : owner_user_id, doc_type, file_key, number, expires_at, status, reviewed_by, review_note. 

   - **ewaste_categories** : name, points_per_kg, rate_per_kg, hazardous_flag, active. 

   - **pickup_requests** : customer_id, address_id, slot_start, slot_end, status, estimated_weight_kg, actual_weight_kg, collector_id, handover_code_hash, cancel_reason. 

   - **pickup_items** : pickup_id, category_id, quantity, estimated_weight_kg, actual_weight_kg, photo_keys. 

Page 7 of 14 

EcoCycle PRD v1.0 

- **pickup_offers** : pickup_id, collector_id, offered_at, responded_at, response. **pickup_status_history** : pickup_id, from_status, to_status, actor_id, lat, lng, note. 

- **delivery_batches** : collector_id, recycler_id, status, collector_weight_kg, recycler_weight_kg, delivered_at. 

- **delivery_batch_pickups** : batch_id, pickup_id. 

- **recycler_inventory** : recycler_id, batch_id, category_id, weight_kg, status. **processing_records** : recycler_id, batch_id, outputs (jsonb), document_key, processed_at. 

- **reward_ledger** : user_id, type (CREDIT, DEBIT, REVERSAL, ADJUSTMENT), points, reference_type, reference_id, reason. 

- **reward_catalog / reward_orders** : Phase 2. 

- **earnings_ledger** : collector_id, pickup_id, amount_inr, status (PENDING, PAID), payout_id. 

- **payouts** : collector_id, amount_inr, method, reference, paid_at. 

- **ratings** : pickup_id, from_user_id, to_user_id, stars, comment. 

- **complaints** : pickup_id, raised_by, category, status, resolution, resolved_by. 

- **notifications** : user_id, channel, template, payload, status, sent_at. 

- **audit_logs** : actor_id, action, entity, entity_id, before, after, ip, user_agent. **system_settings** : key, value (jsonb), updated_by. 

Constraints: weight and points are never negative; ledger rows are append-only; geospatial index on addresses and collector location; unique index preventing doublecrediting a pickup. 

## 8. API Specification (REST, JSON, versioned under /api/v1) 

All endpoints require authentication unless marked public. Inputs validated with Zod. Errors use a consistent envelope with code, message and field details. 

#### **Auth** 

- POST /auth/register (public) 

- POST /auth/login (public) 

- POST /auth/otp/send, POST /auth/otp/verify (public) 

- POST /auth/refresh, POST /auth/logout, POST /auth/logout-all 

- POST /auth/password/forgot, POST /auth/password/reset (public) POST /auth/mfa/setup, POST /auth/mfa/verify 

- GET /me, PATCH /me 

Page 8 of 14 

EcoCycle PRD v1.0 

#### **Customer** 

- GET, POST /addresses; PATCH, DELETE /addresses/:id 

- GET /categories (public) 

- POST /pickups; GET /pickups; GET /pickups/:id 

- POST /pickups/:id/cancel 

- POST /pickups/:id/confirm-handover (handover code) 

- POST /pickups/:id/rating 

- GET /pickups/:id/track (current status and collector location) 

- GET /rewards/wallet; GET /rewards/ledger 

- POST /complaints; GET /complaints 

#### **Collector** 

- POST /collector/onboarding; POST /collector/documents; GET /collector/verificationstatus 

- POST /collector/status (online or offline) 

- POST /collector/location (during active job only) 

- GET /collector/offers; POST /collector/offers/:id/accept; POST 

- /collector/offers/:id/decline 

- POST /collector/jobs/:id/status (EN_ROUTE, ARRIVED, COLLECTED, FAILED) 

- POST /collector/jobs/:id/weigh 

- POST /collector/batches; POST /collector/batches/:id/deliver 

- GET /collector/earnings; GET /collector/payouts 

#### **Recycler** 

- POST /recycler/onboarding; POST /recycler/documents 

- GET /recycler/deliveries 

- POST /recycler/deliveries/:id/receive (received weights, accept or reject) 

- GET /recycler/inventory; PATCH /recycler/inventory/:id 

- POST /recycler/processing; GET /recycler/processing 

- GET /recycler/reports 

#### **Admin** 

- GET /admin/verifications; POST /admin/verifications/:id/decision 

- GET /admin/pickups; POST /admin/pickups/:id/reassign; POST /admin/pickups/:id/override 

- GET /admin/disputes; POST /admin/disputes/:id/resolve 

- GET, PUT /admin/settings; GET, PUT /admin/categories 

Page 9 of 14 

EcoCycle PRD v1.0 

- POST /admin/rewards/adjust 

- GET /admin/analytics/overview, /admin/analytics/pickups, /admin/analytics/recyclers GET /admin/audit-logs 

GET /admin/users; PATCH /admin/users/:id/status 

#### **Files and system** 

POST /uploads/presign (signed upload URL with type and size validation) 

- GET /health (public) 

Realtime: WebSocket or Server-Sent Events channel for pickup status and offers. 

## 9. Recommended Tech Stack 

|Layer|Choice|Reason|
|---|---|---|
|Frontend|Next.js (App Router), TypeScript,<br>Tailwind CSS, shadcn/ui|One codebase for web UI and<br>server logic, strong forms and<br>tables|
|Backend|Next.js route handlers or a<br>separate NestJS service|Start in one codebase; split later<br>if scale demands it|
|Database|PostgreSQL with PostGIS|Relational integrity for ledgers;<br>PostGIS for nearest-collector<br>queries|
|ORM|Prisma (raw SQL for geospatial<br>queries)|Type safety and migrations|
|Auth|Auth.js with credentials and<br>Google providers, argon2id, OTP<br>via provider; or a managed option<br>such as Clerk if speed matters<br>more than control|Server-side sessions, RBAC<br>middleware|
|Validation|Zod|Shared schemas between client<br>and server|
|Maps|Leaflet with OpenStreetMap tiles;<br>Google Maps if routing and<br>geocoding quality is critical|Leaflet avoids API-key cost at the<br>start|
|Realtime|Server-Sent Events or<br>WebSockets (Pusher or Ably if<br>managed)|Live tracking and offers|



Page 10 of 14 

EcoCycle PRD v1.0 

|Layer|Choice|Reason|
|---|---|---|
|Jobs and queues|BullMQ with Redis|Offer timeouts, escalations,<br>notification dispatch, reminders|
|File storage|S3-compatible (AWS S3 or<br>Cloudflare R2) with signed URLs|Photos and verification<br>documents|
|Email|Resend or Amazon SES|Transactional email|
|SMS and OTP|MSG91 or similar, with DLT<br>registration|India compliance|
|Payments and<br>payouts|Razorpay (or RazorpayX for<br>collector payouts) in Phase 2|Common in India, supports UPI|
|Observability|Sentry, structured logs, uptime<br>monitoring|Production readiness|
|Hosting|Vercel or a VPS for the app;<br>managed PostgreSQL (Neon,<br>Supabase or RDS); managed Redis|Fast to launch|
|CI/CD|GitHub Actions: lint, type-check,<br>tests, migrations, deploy|Quality gate|
|Testing|Vitest and Jest for unit tests,<br>Playwright for end-to-end|Core flows covered|



## 10. Compliance, Legal and Trust 

This section is product guidance, not legal advice. Have a lawyer familiar with Indian environmental and data law review it before launch. 

- **E-Waste (Management) Rules, 2022.** These rules define roles such as producers, collection centres, dismantlers and recyclers, and require registration, authorization and record-keeping. Confirm with counsel what registration or authorization EcoCycle and its collectors need to operate as a facilitator, and whether collectors must operate under an authorized entity. 

- **Recycler verification.** Admin must check each recycler's current authorization against the official regulator portal and re-verify on document expiry. Display recycler credentials to customers on completed pickups. 

- **Data protection.** The Digital Personal Data Protection Act, 2023 applies. Needs: clear consent at signup, privacy policy, purpose limitation, data retention schedule, deletion workflow, breach response plan and a grievance contact. 

Page 11 of 14 

EcoCycle PRD v1.0 

- **Device data risk.** Customers must wipe personal data. The platform shows the advisory and records acknowledgement. Optionally offer data-wipe guidance articles. 

- **Hazardous materials.** Maintain a prohibited and restricted items list and safe-handling guidance for batteries. 

- **Collector classification.** Independent contractors; terms of service define responsibilities, insurance expectations and conduct. 

- **Consumer terms.** Terms of service, refund and dispute policy, rewards terms (earning, expiry, reversal, liability), and marketplace disclaimer clarifying that EcoCycle facilitates and does not itself collect or recycle. 

- **Taxes and money.** GST on commission and fees as applicable. Consult an accountant about points accounting and collector payouts. 

- **Fraud and safety.** ID verification, handover codes, photo evidence, GPS trail during jobs, masked phone numbers, SOS or report button, suspension tools. 

## 11. Non-Functional Requirements 

- **Security:** OWASP Top 10 hardening, HTTPS everywhere, CSRF protection, rate limiting, input validation, secrets in a vault, encrypted documents at rest, signed short-lived file URLs, malware scanning and type and size limits on uploads, periodic penetration test before launch. 

- **Performance:** p95 API latency under 500 ms for standard calls; pages usable on 4G; dispatch query under 1 second at 10,000 collectors. 

- **Availability:** 99.5% uptime target for v1; daily database backups with point-in-time recovery; tested restore. 

- **Scalability:** Stateless web tier, horizontal scaling, queue-based background work. 

- **Privacy:** Location tracked only during active jobs and online sessions, with consent; retention limits on location trails. 

- **Accessibility and localisation:** WCAG 2.1 AA, mobile-first responsive layout, English and Hindi at launch with i18n structure for Marathi and others. 

- **Auditability:** Append-only logs for sensitive actions and money-like ledgers. 

- **Data quality:** Weights stored in grams as integers to avoid rounding drift; timezone IST with UTC storage. 

## 12. Roadmap 

**Phase 0: Discovery (2 to 3 weeks).** Legal review, recycler and collector pilot partners, DLT and SMS setup, pilot city selection, design system and wireframes. 

Page 12 of 14 

EcoCycle PRD v1.0 

**Phase 1: MVP (about 10 to 12 weeks).** Auth and RBAC, customer booking and tracking, collector onboarding and job flow, recycler onboarding and receiving, admin verification and operations, rewards ledger with credits, notifications, audit logs, analytics basics. 

**Phase 2: Monetisation and rewards store (about 8 weeks).** Reward catalogue and redemption, collector payouts, optional business-customer billing, commission reporting, referral program. 

**Phase 3: Scale.** Business accounts and bulk pickups, recycler marketplace with competitive rates, API for corporate partners, multi-city operations, native apps, route optimisation. 

## 13. Assumptions (change these if wrong) 

1. Pickup is free for customers in v1; value comes from points and, later, bulk or business customers. 

2. Recyclers pay per-kg rates by category; EcoCycle takes a commission on that value and uses it to fund collector earnings and rewards. The exact economics need validation in the pilot. 

3. Points have no cash value and cannot be transferred. They are redeemable only inside the Phase 2 store. 

4. A single pilot city launches first, with a fixed service area. 

5. EcoCycle verifies identity and authorization documents but does not guarantee recycling outcomes; recyclers own their compliance. 

6. The initial prototype simulator is not reused. Its data model and ideas such as the status lifecycle and rewards ledger carry over, but the code is rebuilt. 

7. No customer online payments in v1, so no payment gateway is required at launch. 

## 14. Risks and Mitigations 

|Risk|Mitigation|
|---|---|
|Chicken-and-egg supply and demand|Launch in one city, pre-recruit collectors and<br>one or two recyclers before opening to<br>customers|
|Weight disputes between collector and<br>recycler|Photo evidence, two-sided weights, tolerance<br>thresholds, dispute workflow|
|Points abuse and fake pickups|Verified-weight crediting, caps, device and<br>address checks, reversals|



Page 13 of 14 

EcoCycle PRD v1.0 

|Risk|Mitigation|
|---|---|
|Regulatory non-compliance|Early legal review, recycler authorization<br>checks, record-keeping|
|Unsafe handling of batteries and|Prohibited list, collector training notes,|
|hazardous items|refusal and report option|
|Collector no-shows or poor behaviour|Ratings, acceptance targets, suspension rules|
|Personal data left on devices|Advisory, acknowledgement, terms|



## 15. Open Questions 

- Which city and service area will you pilot in? 

- Do you have any collectors or recyclers committed yet? 

- Who funds rewards: commission, sponsors, or recyclers? 

- Should business customers (offices, shops) be in the MVP? 

- Do you want Hindi from day one? 

- What are the brand name, domain and visual identity requirements? 

Page 14 of 14 

